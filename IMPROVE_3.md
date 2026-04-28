Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

MEJORA: Sistema de notificaciones en tiempo real

BACKEND:

1. Añade al schema.prisma:

model Notification {
  id        String   @id @default(uuid())
  userId    Int
  type      String
  title     String
  message   String
  read      Boolean  @default(false)
  data      String?  
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}

Añade a User: notifications Notification[]
Ejecuta: npx prisma migrate dev --name add_notifications

2. Crea backend/src/services/notificationService.js:

async function createNotification(userId, type, title, 
                                   message, data, io) {
  const notification = await prisma.notification.create({
    data: { 
      userId, type, title, message,
      data: data ? JSON.stringify(data) : null
    }
  })
  
  // Emitir en tiempo real al usuario
  if (io) {
    io.to(`user-${userId}`).emit('notification:new', {
      ...notification,
      data: data || null
    })
  }
  
  return notification
}

// Tipos de notificación:
// 'battle_joined' - alguien se unió a tu batalla
// 'battle_won' - ganaste una batalla
// 'battle_lost' - perdiste una batalla
// 'jackpot_won' - ganaste el jackpot
// 'marketplace_sold' - vendiste una skin
// 'level_up' - subiste de nivel
// 'daily_box' - caja diaria disponible

module.exports = { createNotification }

3. Integra createNotification en los puntos clave:

En battleController.resolveBattle:
- Al ganador: createNotification(winnerId, 'battle_won',
  '¡Victoria!', 
  `Ganaste ${skinA.name} y ${skinB.name}`,
  { battleId, skins: [skinA, skinB] }, io)
- Al perdedor: createNotification(loserId, 'battle_lost',
  'Derrota', 
  `Perdiste ${loserSkin.name}`,
  { battleId }, io)
- Cuando alguien se une a una batalla waiting:
  createNotification(creatorId, 'battle_joined',
  'Rival encontrado',
  `${joiner.username} se unió a tu batalla`,
  { battleId }, io)

En jackpotController.resolveJackpot:
- Al ganador: createNotification(winnerId, 'jackpot_won',
  '¡Jackpot!',
  `Ganaste el pot de ${totalValue} coins`,
  { jackpotId, totalValue }, io)

En marketController.buyListing:
- Al vendedor: createNotification(sellerId, 'marketplace_sold',
  'Skin vendida',
  `${buyer.username} compró tu ${skin.name} por ${price} coins`,
  { listingId, price }, io)

En levelService.addExperience cuando leveledUp:
- createNotification(userId, 'level_up',
  `¡Nivel ${newLevel}!`,
  `Subiste al nivel ${newLevel}. ¡Sigue apostando!`,
  { level: newLevel }, io)

4. Nuevos endpoints en un routes/notifications.js:
GET  /api/notifications        -> últimas 20 del usuario (auth)
POST /api/notifications/read-all -> marca todas como leídas (auth)
POST /api/notifications/:id/read -> marca una como leída (auth)

Registra en app.js.

FRONTEND:

5. Crea models/notification.model.ts:
interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  data?: any
  createdAt: string
}

6. Crea services/notification.service.ts:
- getNotifications(): GET /api/notifications
- markAllRead(): POST /api/notifications/read-all
- markRead(id): POST /api/notifications/:id/read

7. Añade a socket.service.ts:
onNotification(): Observable<Notification>
que escucha 'notification:new'

8. Crea shared/components/notifications/
   notifications.component.ts standalone

DISEÑO: icono de campana en el sidebar con dropdown

En el SidebarComponent, entre el balance y la nav,
añade un botón de campana:

<div class="notif-trigger" (click)="toggleNotifs()">
  <svg><!-- campana --></svg>
  <span class="notif-badge" *ngIf="unreadCount > 0">
    {{ unreadCount > 9 ? '9+' : unreadCount }}
  </span>
</div>

El badge es rojo, posición absoluta sobre la campana.

Al hacer click abre un panel overlay de 360px de ancho
que sale del sidebar hacia la derecha:

Panel de notificaciones:
- Header: "Notificaciones" + botón "Marcar todas leídas"
- Lista de notificaciones:
  * Cada notificación como una fila:
    - Icono según type (coloreado: verde batalla_won,
      rojo batalla_lost, dorado jackpot, azul sold,
      naranja level_up)
    - Título en bold 13px
    - Mensaje en 12px --text-secondary
    - "hace X min" en 11px --text-muted
    - Fondo --bg-elevated si no leída, transparente si leída
    - Click en la notificación la marca como leída y 
      navega al recurso relacionado si data tiene battleId,
      jackpotId, etc.
  * Las no leídas tienen un punto naranja a la derecha
- Estado vacío: "Sin notificaciones"
- Click fuera del panel lo cierra

El panel tiene animación slideIn desde la izquierda
(porque el sidebar está a la izquierda) y z-index: 200.

Al terminar confirma ng build limpio.