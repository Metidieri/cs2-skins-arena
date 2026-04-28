Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

MEJORA: Feed de drops en tiempo real y usuarios online

BACKEND:

1. En index.js añade tracking de usuarios conectados:

const onlineUsers = new Map() 
// socketId -> { userId, username }

io.on('connection', (socket) => {
  // Al identificarse
  socket.on('identify', async (userId) => {
    // código existente...
    
    // Añadir al tracking de online
    try {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(userId) },
        select: { id: true, username: true }
      })
      if (user) {
        onlineUsers.set(socket.id, user)
        io.emit('users:online_count', onlineUsers.size)
      }
    } catch(e) {}
  })
  
  socket.on('disconnect', () => {
    if (onlineUsers.has(socket.id)) {
      onlineUsers.delete(socket.id)
      io.emit('users:online_count', onlineUsers.size)
    }
  })
})

2. Nuevo endpoint GET /api/stats/online:
Devuelve { count: onlineUsers.size }
Añádelo en statsController.js o inline en app.js

3. Nuevo endpoint GET /api/drops/recent:
Devuelve las últimas 20 aperturas de cajas y 
batallas resueltas combinadas, ordenadas por fecha:
SELECT tipo (case_opening/battle/jackpot),
  username del ganador, 
  nombre de la skin ganada,
  precio de la skin,
  rareza,
  createdAt
FROM (
  últimas 10 DailyBox + últimas 5 Battle completadas 
  + últimos 5 Jackpot completados
) ORDER BY createdAt DESC LIMIT 20

Implementa esto en un nuevo statsController o en 
el existente como getRecentDrops().
Endpoint: GET /api/drops/recent (público)

FRONTEND:

4. Añade a socket.service.ts:
onUsersOnlineCount(): Observable<number> que escucha
el evento 'users:online_count'

5. Crea frontend/src/app/pages/drops/
   drops.component.ts — ruta /drops (sin authGuard)
   
DISEÑO: feed de drops en tiempo real estilo ticker

- Título "DROPS EN VIVO" con live-dot pulsante verde
- Contador de usuarios online en el header:
  "X jugadores online ahora" en verde pequeño
- Lista vertical de drops, los más recientes arriba:
  Cada drop como una fila de 60px:
  * Icono según tipo: 🎁 caja, ⚔️ batalla, 🏆 jackpot
  * Imagen de la skin 40x40 con borde del color de rareza
  * Texto: "[username] ganó [nombre skin]"
  * Precio en dorado a la derecha
  * "hace X min" en gris muy pequeño
  * Animación: cada drop nuevo entra desde arriba 
    con slideDown + fadeIn de 0.3s
  * Los drops de skins covert o contraband tienen un
    glow especial del color de rareza

- Los nuevos drops llegan via WebSocket:
  Suscríbete a onBattleResolved, onJackpotResolved,
  y a un nuevo evento 'drop:case_opened' que el 
  backend emite al abrir una caja exitosamente
  
  En boxController.js después de crear el UserSkin:
  io.emit('drop:case_opened', {
    username: user.username,
    skin: { name, imageUrl, price, rarity, weapon },
    type: 'case'
  })

- Historial de los últimos 50 drops del día en la 
  parte inferior de la página

6. Añade al sidebar entre Ranking y la sección Juegos:
   Link "Drops en vivo" con live-dot verde animado

7. En el SidebarComponent debajo del logo añade:
   Contador de usuarios online:
   <span class="online-count">
     <span class="live-dot"></span>
     {{ onlineCount }} online
   </span>
   Se actualiza via onUsersOnlineCount() observable.
   Si es 0 o null, no lo muestra.

Al terminar confirma ng build limpio.