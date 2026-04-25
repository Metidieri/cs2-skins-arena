Lee la estructura actual del proyecto antes de empezar.
No rompas nada de lo que ya funciona.

Crea estos archivos en el frontend:

1. frontend/src/app/models/battle.model.ts:
interface Battle {
  id: string
  playerAId: string
  playerBId?: string
  winnerId?: string
  skinAId: string
  skinBId?: string
  status: 'waiting' | 'in_progress' | 'completed'
  result?: 'heads' | 'tails'
  seed: string
  createdAt: string
  resolvedAt?: string
  playerA?: { id, username, avatar }
  playerB?: { id, username, avatar }
  skinA?: { id, name, weapon, rarity, price, imageUrl }
  skinB?: { id, name, weapon, rarity, price, imageUrl }
}

2. frontend/src/app/services/socket.service.ts:
- Conecta a http://localhost:3000 con socket.io-client
- joinLobby(): se une a sala "lobby"
- joinBattle(id: string): se une a sala "battle-{id}"
- leaveBattle(id: string): abandona la sala
- onBattleCreated(): Observable evento "battle:created"
- onBattleResolved(): Observable evento "battle:resolved"
- onBattleUpdated(): Observable evento "battle:updated"
- Reconexión automática habilitada

3. frontend/src/app/services/battle.service.ts:
- createBattle(skinId: string): POST /api/battles
- joinBattle(battleId: string, skinId: string): 
  POST /api/battles/:id/join
- getBattles(): GET /api/battles
- getBattleById(id: string): GET /api/battles/:id

Al terminar confirma los tres archivos creados y 
si hay errores de compilación.