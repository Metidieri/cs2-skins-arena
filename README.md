# CS2 Skins Arena

![Node](https://img.shields.io/badge/Node-%E2%89%A518-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000?logo=express)
![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101?logo=socketdotio)
![Angular](https://img.shields.io/badge/Angular-17-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-dev-003B57?logo=sqlite&logoColor=white)
![Jest](https://img.shields.io/badge/Tests-Jest-C21325?logo=jest&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

Plataforma estilo casino de skins de Counter-Strike 2 con coinflip 1v1, jackpot multi-jugador, marketplace P2P, leaderboard y perfiles públicos. Proyecto demo full-stack pensado como showcase técnico — **no es una plataforma real de apuestas**.

> 🌐 **Demo en producción**: _https://cs2-skins-arena.vercel.app_ _(placeholder — actualizar tras deploy)_

---

## 📸 Capturas de las páginas principales

> Nota: las capturas se actualizarán tras el deploy. Todas las páginas usan tema gaming dark con acento naranja `#ff6b00` y dorado `#ffd700`.

| Página | Descripción |
|--------|-------------|
| `/` (Landing) | Hero "ARENA", 3 cards de modos, stats globales en vivo |
| `/coinflip` | Lobby de batallas en tiempo real |
| `/coinflip/:id` | Vista de batalla 1v1 con animación de moneda 3D |
| `/jackpot` | Pot circular animado, ruleta de resolución |
| `/marketplace` | Grid filtrable, modal vender, modal confirmar compra |
| `/leaderboard` | Podio top 3 + tabla 4-10 con tabs |
| `/player/:username` | Perfil público con stats, batallas e inventario |
| `/profile` | Perfil propio con depósitos y stats extendidas |

---

## 🎮 Modos de juego

### 🎯 Coinflip 1v1
Reta a otro jugador apostando una skin. El sistema genera un seed `crypto.randomUUID()`, y al unirse el segundo jugador se calcula el resultado deterministamente:
```
parseInt(seed.substring(0,8), 16) % 2 === 0 → heads (gana A)
```
Resolución verificable: el seed queda visible en la pantalla de resultado.

### 🎰 Jackpot multi-jugador
Mete tus skins al pot común. Cada jugador recibe un porcentaje de probabilidad proporcional al valor apostado. Tras la primera entry arranca un **timer de 30 segundos**. Cuando el timer expira con ≥2 jugadores distintos, se elige ganador con probabilidad ponderada:
```
tickets = entries.flatMap(e => Array(Math.floor(e.value)).fill(e.userId))
winner  = tickets[parseInt(seed.substring(0,8), 16) % tickets.length]
```
La ruleta CSS gira hasta el slice del ganador, luego abre overlay con avatar, skins ganadas y seed.

### 🛒 Marketplace P2P
Pon tus skins en venta a un precio entre 1 y 999 999 coins. Los compradores filtran por rareza, arma, rango de precio y orden. La compra es atómica (`prisma.$transaction`): descuenta saldo del comprador, suma al vendedor, transfiere la skin y registra dos transacciones (WIN venta / LOSS compra). Listings nuevos, vendidos y cancelados se propagan a todos los clientes vía socket en tiempo real.

### 📈 Leaderboard
Tres rankings disponibles vía tabs:
- **Ganancias** — suma de WIN transactions
- **Win Rate** — wins / (wins + losses), mínimo 5 partidas
- **Partidas** — total de coinflips/jackpots resueltos

Top 3 en podio con corona dorada para el #1, tabla del 4 al 10 con highlight si tú estás dentro y fila extra con tu posición real si no.

---

## 🛠️ Stack tecnológico

**Backend** (`backend/`)
- Node.js ≥ 18 + Express 4
- Prisma ORM sobre SQLite (`prisma/dev.db`)
- Socket.io para tiempo real (rooms `lobby`, `battle-{id}`, `jackpot`, `marketplace`)
- JWT + bcryptjs
- express-validator + express-rate-limit
- Jest + supertest para tests

**Frontend** (`frontend/`)
- Angular 17 standalone components + signals
- RxJS, FormsModule, Router
- socket.io-client
- HTTP interceptor con loading bar global
- Estilo gaming dark consistente

**Deploy**
- Backend → Railway (Procfile incluido)
- Frontend → Vercel (vercel.json con rewrites SPA)

---

## 🚀 Instalación local

```bash
git clone https://github.com/<tu-usuario>/cs2-skins-arena.git
cd cs2-skins-arena
```

### Backend
```bash
cd backend
npm install
cp .env.example .env       # rellena los valores
npx prisma migrate deploy
npm run seed               # crea usuarios demo + jackpot histórico
npm run dev                # http://localhost:3000
```

### Frontend
```bash
cd frontend
npm install
npm start                  # http://localhost:4200
```

---

## 🔐 Variables de entorno

`backend/.env` (ver `backend/.env.example`):

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./dev.db` | Conexión Prisma. SQLite local o PostgreSQL en producción. |
| `JWT_SECRET` | _(64 chars aleatorios)_ | Secreto para firmar JWT de acceso. |
| `JWT_REFRESH_SECRET` | _(64 chars aleatorios)_ | Reservado para refresh tokens. |
| `PORT` | `3000` | Puerto del servidor. |
| `NODE_ENV` | `production` | `development \| production \| test`. |
| `FRONTEND_URL` | `https://cs2-skins-arena.vercel.app` | Origen permitido en CORS y socket.io. Acepta varios separados por coma. |

Frontend: `frontend/src/environments/environment.prod.ts` reemplaza `apiUrl` y `socketUrl` por la URL del backend deployado.

---

## ☁️ Deploy

### Railway (backend)
1. Crea un proyecto nuevo en [Railway](https://railway.app) y conecta el repo.
2. Selecciona el subdirectorio `backend/` como root del servicio.
3. Añade las variables de entorno listadas arriba (sobre todo `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`).
4. Railway detecta el `Procfile` (`web: node src/index.js`) y arranca el servicio.
5. Para PostgreSQL: añade el plugin "Postgres" desde el dashboard de Railway, copia la `DATABASE_URL` que provee, ajusta `provider = "postgresql"` en `prisma/schema.prisma` y ejecuta `npx prisma migrate deploy`.
6. Anota la URL pública (ej. `https://cs2-skins-arena.up.railway.app`).

### Vercel (frontend)
1. Edita `frontend/src/environments/environment.prod.ts` con la URL real del backend.
2. Crea proyecto nuevo en [Vercel](https://vercel.com) apuntando al subdirectorio `frontend/`.
3. Vercel detecta Angular automáticamente:
   - Build command: `npm run build`
   - Output dir: `dist/frontend/browser`
4. El `vercel.json` ya está configurado para SPA fallback (`/(.*) → /index.html`).
5. Tras el deploy, copia la URL final y úsala como `FRONTEND_URL` en el backend de Railway.

---

## 👤 Credenciales de demo

Después de `npm run seed` el sistema viene con dos usuarios pre-creados:

| Usuario | Email | Password | Balance | Skins |
|---------|-------|----------|---------|-------|
| Admin | `admin@cs2arena.com` | `password123` | 5000 | 5 |
| Player1 | `player@cs2arena.com` | `password123` | 2500 | 5 |

Hay también un jackpot histórico ya completado y un jackpot abierto vacío para que la UI tenga estado de partida desde el primer arranque.

---

## 🧪 Tests

```bash
cd backend
npm test
```

Suites incluidas:
- `tests/auth.test.js` — register/login/me happy path + casos de error.
- `tests/battle.test.js` — validación de auth/inputs + flujo completo crear→unirse→resolver con verificación de transferencia de skins y transacciones.

10 tests, ~2.5s de ejecución.

---

## 📁 Estructura

```
cs2-skins-arena/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # User, Skin, UserSkin, Transaction, Battle, Jackpot, JackpotEntry, Listing
│   │   ├── migrations/
│   │   └── seed.js
│   ├── src/
│   │   ├── app.js                # createApp() factory
│   │   ├── index.js              # arranque + socket.io
│   │   ├── controllers/          # auth, users, skins, battle, jackpot, market, leaderboard, stats
│   │   ├── routes/
│   │   ├── middleware/           # auth (JWT), validate, rateLimit, errorHandler
│   │   ├── services/steamSkins.js
│   │   └── utils/logger.js
│   ├── tests/
│   ├── .env.example
│   ├── Procfile
│   └── package.json
└── frontend/
    └── src/app/
        ├── pages/                # landing, login, register, home, inventory, profile, public-profile,
        │                         # stats, history, coinflip/{lobby,battle}, jackpot, marketplace,
        │                         # leaderboard, not-found
        ├── shared/
        │   ├── components/       # navbar, skin-card, toast, loading-bar
        │   └── services/         # toast.service, loading.service
        ├── services/
        ├── models/
        ├── guards/
        └── app.routes.ts
```

---

## 📝 Notas técnicas

- **IDs mixtos**: User/Skin/Battle son `Int` autoincrement (legacy). Jackpot/JackpotEntry/Listing son `String UUID`. Sus FKs siguen siendo Int para casar con las tablas existentes.
- **Atomicidad**: todas las transferencias críticas (compra marketplace, resolve jackpot, resolve battle) están envueltas en `prisma.$transaction`.
- **Rate limiting**: se desactiva por completo cuando `NODE_ENV=test` para que los tests no se vean afectados.
- **Logger**: redacta `password / token / authorization / jwt` antes de imprimir cualquier objeto.
- **CORS**: `FRONTEND_URL` admite varias URLs separadas por coma. Por defecto siempre acepta `localhost:4200` para conveniencia en desarrollo.

---

## 📄 Licencia

MIT — proyecto educativo / demo. Las imágenes de skins provienen de la API pública de Steam Community Market.
