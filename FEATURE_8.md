Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

FEATURE: Página de inicio mejorada con feed global

OBJETIVO: Hacer el /home más dinámico y atractivo,
que cualquier persona que lo vea quiera quedarse.

BACKEND:

1. Nuevo endpoint GET /api/home/feed (público):
Devuelve en una sola llamada todo lo necesario para 
el home:
{
  liveActivity: [
    // Últimos 15 eventos combinados ordenados por fecha
    // Cada evento: { type, user, skin, amount, createdAt }
    // type: 'coinflip_win' | 'jackpot_win' | 'case_open' 
    //       | 'marketplace_sale'
  ],
  activeBattles: [
    // Hasta 5 batallas waiting con playerA y skinA
  ],
  currentJackpot: {
    // Jackpot actual con totalValue y entries
  },
  topWinToday: {
    // Mayor ganancia de hoy: user, amount, skin, type
  },
  biggestPot: {
    // El jackpot más grande de la historia
  }
}

Crea statsController.getHomeFeed() o un nuevo 
homeController.js. Registra GET /api/home/feed en app.js.

FRONTEND:

2. Rediseña home.component.ts completamente:

LAYOUT: 3 columnas en desktop (2fr / 1fr / 300px)
- Columna principal (2fr): feed de actividad
- Columna centro (1fr): batallas activas + jackpot
- Columna derecha (300px): stats rápidas + top ganancia

FEED DE ACTIVIDAD (columna principal):
- Header "Actividad en vivo" con live-dot y contador 
  de items
- Cada evento como una card compacta (altura 64px):
  * Avatar del usuario (16px) con inicial coloreada
  * Icono del tipo de evento (⚔️ 🏆 🎁 🛒)
  * Texto: "[username] ganó [skin] en [modo]"
  * Imagen de la skin 40x40 con borde de rareza
  * Cantidad en dorado a la derecha
  * "hace X min" en muted
  * Color del borde izquierdo según tipo:
    naranja=coinflip, dorado=jackpot, morado=caja, 
    azul=marketplace
- Los nuevos eventos entran con animación slideDown
- Máximo 15 items visibles, los viejos salen por abajo

COLUMNA CENTRO:
- Card del jackpot actual:
  * Valor del pot en Rajdhani 32px gradient dorado
  * Avatares de participantes apilados
  * Botón "UNIRSE" → /jackpot
  * Timer si está en cuenta atrás

- Batallas activas (hasta 3):
  * Card compacta con skin apostada y creador
  * Botón "UNIRSE" → /coinflip/:id
  * "Ver todas" link

COLUMNA DERECHA:
- Card "Mayor ganancia de hoy":
  * Avatar grande del ganador
  * Skin ganada con imagen
  * "+X coins" en verde grande
  
- Card "Récord histórico del jackpot":
  * Valor del pot más grande
  * Ganador y fecha

- Stats rápidas:
  * Usuarios online ahora (verde + live dot)
  * Partidas hoy
  * Coins apostadas hoy

En móvil todo se apila en una sola columna en este orden:
jackpot actual → feed → batallas → stats.

Al terminar confirma ng build limpio.