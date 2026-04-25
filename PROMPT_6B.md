Lee la estructura actual del proyecto antes de empezar.
No rompas nada de lo que ya funciona.
Usa el skill UI/UX Pro Max para el diseño.

Crea estas páginas nuevas:

1. frontend/src/app/pages/leaderboard/
   LeaderboardComponent — ruta /leaderboard (público)

DISEÑO estilo gaming dark:
- Fondo #0a0a0f, acento naranja #ff6b00, dorado #ffd700

TABS de tipo: Ganancias | Win Rate | Partidas

TOP 3 destacado:
- Posición 2 izquierda, 1 centro más grande, 3 derecha
- Avatar con inicial grande, corona dorada para el 1
- Username, stat principal en naranja/dorado
- Podio con alturas diferentes (CSS)

TABLA del 4 al 10:
- Rank, avatar pequeño, username (clickable -> perfil),
  stat principal, partidas jugadas, win rate
- Highlight si el usuario actual está en el top 10
- Fila del usuario actual siempre visible aunque 
  no esté en top 10 (al final con su posición real)

2. frontend/src/app/pages/public-profile/
   PublicProfileComponent — ruta /player/:username (público)

DISEÑO:
- Header: avatar grande con inicial, username, 
  badge de nivel si existe
- Grid de 4 stats: Partidas, Victorias, Win Rate, 
  Ganancias totales
- Sección "Últimas batallas": lista de 5 resultados
  con resultado WIN/LOSS coloreado, rival, skin
- Sección "Inventario público": grid de skins actuales

3. Mejora frontend/src/app/pages/profile/
   ProfileComponent existente:

Añade sección "Depósito de coins":
- Input de cantidad (100 - 10000)
- Botón "DEPOSITAR" que llama a POST /api/users/deposit
- Toast con el nuevo balance
- Actualiza el balance en el navbar automáticamente

Expande las estadísticas mostradas con los nuevos 
campos del endpoint stats mejorado:
- Coinflips jugados/ganados/perdidos
- Jackpots jugados/ganados  
- Ventas y compras en marketplace
- Mayor ganancia individual
- Arma favorita en inventario

4. Añade al NavbarComponent:
- Link "Ranking" -> /leaderboard
- Haz el username del navbar clickable -> /player/:username

5. Añade rutas en app.routes.ts:
/leaderboard -> LeaderboardComponent (sin authGuard)
/player/:username -> PublicProfileComponent (sin authGuard)

Al terminar dime cómo quedaron las páginas y errores.