Tienes contexto completo del proyecto cs2-skins-arena.
Lee toda la estructura existente antes de tocar nada.
No rompas nada de lo que ya funciona.

PASO 1 - Instala dependencias en el frontend:
npm install socket.io-client
npm install lucide-angular

PASO 2 - Extrae NavbarComponent standalone en
frontend/src/app/shared/components/navbar/
Con: logo MTDR, links (Home, Coinflip, Inventario, 
Stats, Historial), balance del usuario visible siempre 
en naranja #ff6b00, avatar con inicial, botón logout.
Usa los signals de auth.service.ts que ya existen.
Reemplaza la navbar inline de TODAS las páginas 
existentes por este componente.

PASO 3 - Extrae SkinCardComponent standalone en
frontend/src/app/shared/components/skin-card/
Con @Input() skin, @Output() onSelect.
Imagen con fallback, nombre, arma, rareza con color 
por tier, precio en coins.
Reemplaza las skin cards inline del home e inventory.

PASO 4 - Backend Coinflip:
Añade al modelo Battle en prisma/schema.prisma:
- seed      String
- result    String?
- betType   String @default("skin")
Ejecuta: npx prisma migrate dev --name add_battle_seed

PASO 5 - Crea backend/src/controllers/battleController.js:

createBattle(req, res):
- Verifica que el usuario tiene la skin (UserSkin)
- Genera seed con crypto.randomUUID()
- Crea Battle con status "waiting", skinAId, playerAId,
  seed en claro
- Emite socket evento "battle:created" a sala "lobby"
- Devuelve la battle creada

joinBattle(req, res):
- Verifica que el usuario tiene la skin
- Verifica status "waiting" y que no es el creador
- Actualiza Battle: playerBId, skinBId, status "in_progress"
- Llama a resolveBattle(battle) internamente

resolveBattle(battle) — función interna NO endpoint:
- Determina ganador con el seed:
  const result = parseInt(seed.substring(0,8), 16) % 2 === 0
    ? 'heads' : 'tails'
  heads = playerA gana, tails = playerB gana
- Transfiere ambas skins al ganador:
  * Elimina UserSkin del perdedor para ambas skins
  * Crea UserSkin para el ganador si no la tiene
- Crea Transaction WIN para ganador: 
  "Coinflip ganado vs [username perdedor]"
- Crea Transaction LOSS para perdedor:
  "Coinflip perdido vs [username ganador]"
- Actualiza Battle: winnerId, result, status "completed",
  resolvedAt
- Emite "battle:resolved" a sala "battle-{id}" con:
  { battleId, winnerId, winnerUsername, result,
    seed, skinA, skinB, playerA, playerB }
- Emite "battle:updated" a sala "lobby"

getBattles(req, res):
- Battles con status "waiting"
- Include: playerA (username), skinA (name, imageUrl, 
  price, rarity)
- Ordenadas por createdAt desc, máximo 20

getBattleById(req, res):
- Battle por id con todos los datos
- Include: playerA, playerB, skinA, skinB

PASO 6 - Crea backend/src/routes/battles.js:
POST /api/battles          -> createBattle (auth)
POST /api/battles/:id/join -> joinBattle (auth)
GET  /api/battles          -> getBattles (público)
GET  /api/battles/:id      -> getBattleById (público)

PASO 7 - Registra en backend/src/index.js:
app.use('/api/battles', battlesRouter)

Actualiza Socket.io en index.js:
- Sala "lobby": cualquier cliente puede unirse
- Sala "battle-{id}": clientes de una batalla

PASO 8 - Actualiza prisma/seed.js para que cada usuario 
tenga al menos 3 skins diferentes en inventario.
Ejecuta: npm run seed

Al terminar dime qué cambios se hicieron y si hay errores.