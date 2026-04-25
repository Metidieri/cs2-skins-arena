Lee toda la estructura del proyecto cs2-skins-arena.
No rompas nada de lo que ya funciona.

BACKEND - Leaderboard y mejoras de perfil:

1. Crea backend/src/controllers/leaderboardController.js:

getLeaderboard(req, res):
- Query param type: 'winrate' | 'earnings' | 'games'
  default: 'earnings'
- Para 'earnings': ordena por suma de transactions 
  type WIN desc, top 10
- Para 'winrate': calcula wins/totalGames desc, 
  mínimo 5 partidas, top 10
- Para 'games': ordena por totalGames desc, top 10
- Devuelve array con rank, user (id, username, avatar),
  stat principal, gamesPlayed, winRate

getPublicProfile(req, res):
- Param: username
- Devuelve perfil público: username, avatar, 
  stats (wins, losses, winRate, totalEarnings,
  inventoryValue, inventoryCount)
- Include: últimas 5 batallas jugadas
- NO devuelve email ni datos sensibles

2. Crea backend/src/routes/leaderboard.js:
GET /api/leaderboard?type=earnings -> getLeaderboard
GET /api/leaderboard/profile/:username -> getPublicProfile

3. Añade endpoint de depósito simulado:
POST /api/users/deposit (auth):
- Body: { amount: number }
- Mínimo 100, máximo 10000
- Suma amount al balance del usuario
- Crea Transaction type DEPOSIT
- Devuelve balance actualizado

4. Mejora GET /api/users/stats para incluir:
- coinflipsPlayed, coinflipsWon, coinflipsLost
- jackpotsPlayed, jackpotsWon
- marketplaceSales, marketplacePurchases
- totalEarnings (suma de todas las WIN transactions)
- biggestWin (mayor WIN transaction)
- favoriteWeapon (weapon más repetida en inventario)

Registra leaderboard en index.js y el deposit en users.js

Al terminar dime cambios y si hay errores.