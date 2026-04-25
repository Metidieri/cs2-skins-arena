Lee la estructura actual del proyecto antes de empezar.
No rompas nada de lo que ya funciona.
Usa el skill UI/UX Pro Max para el diseño de las páginas.

Crea la feature Coinflip completa:

1. frontend/src/app/pages/coinflip/coinflip-lobby/
   CoinflipLobbyComponent — ruta /coinflip

   DISEÑO estilo gaming dark:
   - Fondo #0a0a0f, cards #16161a, acento naranja #ff6b00
   - Header: título "COINFLIP" grande, descripción, 
     botón "CREAR BATALLA" naranja
   - Lista de battles activas actualizada en tiempo real 
     via WebSocket (usa SocketService.onBattleCreated y 
     onBattleUpdated)
   - BattleCard por cada battle waiting:
     * Avatar e inicial del creador
     * Imagen de la skin apostada con badge de rareza
     * Precio en coins en naranja
     * Tiempo transcurrido (hace X min)
     * Botón "UNIRSE" que abre modal
   - Modal "Crear batalla":
     * Grid de skins del inventario del usuario
     * Preview de skin seleccionada
     * Botón confirmar llama a BattleService.createBattle()
     * Redirige a /coinflip/:id al crear
   - Modal "Unirse":
     * Skin del rival a la izquierda
     * Grid de skins del usuario a la derecha
     * Botón confirmar llama a BattleService.joinBattle()
     * Redirige a /coinflip/:id al unirse
   - Estado vacío: mensaje "No hay batallas activas" con CTA
   - Toast de error si el usuario no tiene skins

2. frontend/src/app/pages/coinflip/coinflip-battle/
   CoinflipBattleComponent — ruta /coinflip/:id

   DISEÑO estilo gaming dark:
   - Obtiene battleId de la ruta con ActivatedRoute
   - Al cargar: GET /api/battles/:id + joinBattle(id) socket
   - Layout dos columnas: Jugador A vs Jugador B
   - Cada columna: avatar con inicial, username, 
     imagen grande de la skin, nombre y precio
   - VS central en grande
   
   Estado WAITING:
   - "Esperando rival..." con spinner animado
   - Botón copiar enlace de la sala al portapapeles
   - Se actualiza automáticamente cuando llega 
     evento "battle:resolved"

   Estado IN_PROGRESS:
   - Animación CSS de moneda girando durante 3 segundos
   - Cara heads: color naranja #ff6b00
   - Cara tails: color azul #6366f1

   Estado COMPLETED:
   - Ganador: borde dorado #ffd700, escala 1.05
   - Perdedor: opacity 0.5
   - Resultado "HEADS" o "TAILS" en grande centrado
   - Seed visible en texto pequeño con botón copiar
   - Si currentUser === winner: toast verde 
     "¡Has ganado [nombre skin]!"
   - Si currentUser === loser: toast rojo 
     "Has perdido [nombre skin]"
   - Botón "VOLVER AL LOBBY" -> /coinflip

3. Añade rutas en app.routes.ts:
   /coinflip -> CoinflipLobbyComponent (authGuard)
   /coinflip/:id -> CoinflipBattleComponent (authGuard)

4. Añade "Coinflip" al NavbarComponent

VERIFICACIÓN FINAL:
Prueba este flujo y dime si funciona:
1. Login admin@cs2arena.com -> crear batalla con una skin
2. Segunda pestaña login player@cs2arena.com -> unirse
3. Ambas pestañas muestran resultado sin recargar
4. Ganador tiene ambas skins en inventario
5. Ambos tienen transacción en /history

Dime resultado del flujo, cómo quedó la UI y 
qué viene en la fase 4.