# CS2 Skins Arena

Plataforma estilo casino de skins de Counter-Strike 2 con coinflip, jackpot multi-jugador, marketplace P2P, leaderboard y perfiles públicos. Pensado como proyecto full-stack de demo, no para producción real con apuestas.

## Stack tecnológico

**Backend** (`backend/`)
- Node.js + Express 4
- Prisma ORM sobre SQLite (`prisma/dev.db`)
- Socket.io para tiempo real (lobby, battle-{id}, jackpot, marketplace)
- JWT + bcryptjs para auth
- express-validator para validación de inputs
- express-rate-limit para rate limiting por ruta
- Jest + supertest para tests

**Frontend** (`frontend/`)
- Angular 17 standalone components + signals
- RxJS, FormsModule, RouterModule
- socket.io-client
- HttpInterceptor para inyectar el JWT en cada request
- Estilo gaming dark (`#0a0a0f` fondo, `#16161a` cards, `#ff6b00` acento, `#ffd700` dorado)

## Estructura

```
cs2-skins-arena/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # User, Skin, UserSkin, Transaction, Battle, Jackpot, JackpotEntry, Listing
│   │   ├── migrations/
│   │   ├── seed.js               # 11 skins reales, 2 usuarios, jackpot histórico
│   │   └── dev.db
│   ├── src/
│   │   ├── app.js                # createApp() factory (sin listen) — usado por tests e index
│   │   ├── index.js              # arranque + socket.io
│   │   ├── config/db.js          # prisma client singleton
│   │   ├── controllers/          # auth, users, skins, battle, jackpot, market, leaderboard
│   │   ├── routes/               # mismos nombres + middlewares
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT bearer
│   │   │   ├── validate.js       # validators express-validator por endpoint
│   │   │   ├── rateLimit.js      # limiters por ruta (skipped en NODE_ENV=test)
│   │   │   └── errorHandler.js   # mapea errores Prisma + 404 + manejo global
│   │   ├── services/steamSkins.js
│   │   └── utils/logger.js       # request logger + sanitización passwords/tokens
│   └── tests/
│       ├── jest.setup.js         # NODE_ENV=test
│       ├── helpers.js            # createUser/ensureSkin/giveSkin/cleanupUser
│       ├── auth.test.js
│       └── battle.test.js
└── frontend/
    └── src/app/
        ├── pages/
        │   ├── login, register
        │   ├── home                      # marketplace/showcase de skins
        │   ├── inventory
        │   ├── profile                   # perfil propio + depósito + stats extendidas
        │   ├── public-profile            # /player/:username
        │   ├── stats, history
        │   ├── coinflip/
        │   │   ├── coinflip-lobby
        │   │   └── coinflip-battle
        │   ├── jackpot
        │   ├── marketplace
        │   └── leaderboard
        ├── shared/components/
        │   ├── navbar
        │   └── skin-card
        ├── services/             # auth, users, skins, battle, jackpot, market, leaderboard, socket
        ├── models/               # tipos por dominio
        ├── guards/auth.guard.ts
        └── app.routes.ts
```

## Endpoints disponibles

### Auth
- `POST /api/auth/register` — { email, username, password } → { token, user }
- `POST /api/auth/login` — { email, password } → { token, user }
- `GET /api/auth/me` (auth) → user actual

### Usuarios
- `GET /api/users/profile` (auth)
- `GET /api/users/stats` (auth) — stats extendidas (coinflips, jackpots, marketplace, biggestWin, favoriteWeapon)
- `GET /api/users/transactions?limit=N` (auth)
- `POST /api/users/deposit` (auth) — { amount: 100..10000 }

### Skins
- `GET /api/skins` — todas las skins
- `GET /api/skins/inventory` (auth) — skins del usuario

### Coinflip / Battles
- `POST /api/battles` (auth) — { skinId } → crea waiting
- `POST /api/battles/:id/join` (auth) — { skinId } → resuelve la batalla
- `GET /api/battles` — listings waiting
- `GET /api/battles/:id` — detalle

### Jackpot
- `GET /api/jackpot/current` — jackpot abierto (con playerStats)
- `POST /api/jackpot/entry` (auth) — { skinId } → añade entry, dispara timer
- `GET /api/jackpot/history` — top 10 completados

### Marketplace
- `GET /api/market` — filtros: rarity, weapon, minPrice, maxPrice, sortBy, page, limit
- `POST /api/market` (auth) — { skinId, price }
- `GET /api/market/my-listings` (auth)
- `POST /api/market/:id/buy` (auth)
- `DELETE /api/market/:id` (auth)

### Leaderboard
- `GET /api/leaderboard?type=earnings|winrate|games`
- `GET /api/leaderboard/profile/:username` — perfil público (sin email)

### Socket.io rooms
- `lobby` — eventos `battle:created`, `battle:updated`
- `battle-{id}` — `battle:resolved`
- `jackpot` — `jackpot:entry`, `jackpot:timer`, `jackpot:resolved`, `jackpot:new`
- `marketplace` — `market:listed`, `market:sold`, `market:cancelled`

## Credenciales de desarrollo

Usuarios sembrados (`npm run seed`):

| Usuario | Email | Password | Balance inicial |
|---------|-------|----------|-----------------|
| Admin | `admin@cs2arena.com` | `password123` | 5000 |
| Player1 | `player@cs2arena.com` | `password123` | 2500 |

Cada uno arranca con 5 skins distintas. Hay también un jackpot histórico ya completado y uno abierto vacío para que la UI tenga estado de partida.

## Cómo arrancar

### Primer setup
```bash
# Backend
cd backend
npm install
npx prisma migrate deploy   # o `migrate dev` si vas a crear más
npm run seed
npm run dev                  # arranca en http://localhost:3000

# Frontend (otra terminal)
cd frontend
npm install
npm start                    # arranca en http://localhost:4200
```

### Variables de entorno (`backend/.env`)
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="cs2-skins-arena-secret-key-dev-2024"
PORT=3000
NODE_ENV=development
```

## Cómo ejecutar los tests

```bash
cd backend
npm test
```

`jest --runInBand` con setup que pone `NODE_ENV=test` y desactiva rate limiting. Los tests usan supertest contra `createApp()` y limpian sus usuarios/skins en `afterAll`.

Suites incluidas:
- `tests/auth.test.js` — register válido/duplicado/password corta, login OK/wrong, /me con/sin token (7 tests).
- `tests/battle.test.js` — 401 sin auth, 400 sin skinId, flujo completo crear→unirse→resolver con verificación de transferencia de skins y transacciones (3 tests).

## Fases completadas

| Fase | Contenido |
|------|-----------|
| 1 | Auth, esquema base, seed inicial |
| 2 | Perfil, stats, historial, inventario, imágenes Steam reales |
| 3 | Coinflip 1v1 con sockets, navbar/skin-card compartidas |
| 4 | Jackpot multi-jugador con timer 30s, ruleta animada |
| 5 | Marketplace P2P con filtros, paginación y modal de venta |
| 6 | Leaderboard con podio, perfiles públicos, stats extendidas, depósitos simulados |
| 7 | Pulido: validators, rate limiting, error handler global, logger, tests Jest, esta doc |

## Consideraciones técnicas

- **IDs**: User/Skin/Battle son `Int` autoincrement (sqlite default). Jackpot/JackpotEntry/Listing son `String UUID` como pidieron los prompts; sus FKs siguen siendo Int para casar con las tablas pre-existentes.
- **Resolución de coinflip**: determinista por seed — `parseInt(seed.substring(0,8),16) % 2 === 0 ? 'heads' : 'tails'` (heads = playerA gana).
- **Jackpot**: tickets ponderados por `Math.floor(entry.value)`. El ganador se calcula con `parseInt(seed.substring(0,8),16) % tickets.length`.
- **Atomicidad**: todas las transferencias críticas (compra marketplace, resolve jackpot, resolve battle) van envueltas en `prisma.$transaction`.
- **Rate limiting**: se desactiva por completo cuando `NODE_ENV=test` para que los tests no se vean afectados.
- **Logger**: redacta `password`, `token`, `authorization`, `jwt` antes de imprimir cualquier objeto.
