# CLAUDE.md — orientación para futuras sesiones

> **Objetivo de este archivo**: que cuando el usuario me diga *"lee CLAUDE.md"* yo sepa al instante por dónde se quedó el proyecto, qué falta, qué convenciones respetar y dónde están las cosas. Es para mí (Claude), no para humanos. El README.md es para humanos.

---

## 1. Estado actual (último update: 2026-04-28)

**Bloque inicial — completado** (`PROMPT_3A` … `PROMPT_7C`)
- Auth + perfil + stats + historial + inventario.
- Coinflip 1v1 con sockets.
- Jackpot multi-jugador con timer 30s + ruleta.
- Marketplace P2P con filtros.
- Leaderboard + perfiles públicos + depósitos simulados.
- Pulido: validators (express-validator), rate limiting (express-rate-limit), error handler global, request logger, tests Jest, landing pública, 404, toasts y loading bar globales.
- Deploy ready: Procfile (Railway), vercel.json (Vercel), `.env.example`, `environment.prod.ts` con placeholders.

**Bloque rediseño visual — completado** (`REDESIGN_1` … `REDESIGN_6`)
- Sistema de design tokens en `frontend/src/styles.scss` con CSS variables (`--bg-base`, `--accent`, `--gold`, `--rarity-*`, `--sidebar-w`, `--radius-*`, `--transition`).
- Tipografía: **Rajdhani 700** (display) + **Inter 400/500/600** vía `@fontsource/*`.
- **Sidebar lateral fijo de 240px** (`shared/components/sidebar/`) reemplaza la navbar horizontal. Layout `app-layout` + `main-content` con `margin-left: var(--sidebar-w)`.
- Todas las páginas migradas al estilo CSGOGem-like (gaming dark, glassmorphism sutil, gradients de acento).
- Login/register son fullscreen (`position: fixed; inset: 0; z-index: 999`) con layout 50/50 (form + marketing pane).
- ⚠️ El `NavbarComponent` antiguo en `shared/components/navbar/` **sigue existiendo pero ya nadie lo usa**.

**Bloque features (Bloque B) — COMPLETADO**
- ✅ `FEATURE_1.md` — Sistema de niveles y XP.
- ✅ `FEATURE_2.md` — Cajas diarias gratuitas por nivel.
- ✅ `FEATURE_3.md` — Chat general en tiempo real.
- ✅ `FEATURE_4.md` — Ruleta con rojo, negro y verde.
- ✅ `FEATURE_5.md` — Bots para coinflip + Opening de cajas.
- ✅ `FEATURE_6.md` — Panel de administración (dashboard, gestión usuarios, ban, coins).
- ✅ `FEATURE_7.md` — Página Mi Nivel + sistema de referidos (código + bonus 500 coins).
- ✅ `FEATURE_8.md` — Rediseño completo del Home (3-col, stats bar, hero, feeds en vivo).
- ✅ `FEATURE_9.md` — Pulido final (skeleton, tooltip, 404 con bounce+glitch, animaciones de ruta, mobile media queries, SEO meta tags).

**Bloque mejoras y bugfixes — COMPLETADO**
- ✅ `BUG_1.md` — Seed corregido (cleanup FK ordering, house user, bot skin assignment).
- ✅ `IMPROVE_1.md` — House edge: casino acumula ingresos de cajas, ruleta y marketplace.
- ✅ `IMPROVE_2.md` — Contador de usuarios en línea (WebSocket + sidebar).
- ✅ `IMPROVE_3.md` — Notificaciones in-app (bell en sidebar, dropdown, socket push).
- ✅ `IMPROVE_4.md` — Sistema de referidos backend (código único, bonus 500 coins, registro con ?ref=).

> **El proyecto está completo.** No quedan features pendientes.

---

## 2. Convenciones críticas (no romperlas)

- **IDs mixtos**: `User`, `Skin`, `Battle`, `UserSkin`, `Transaction` son `Int @id @default(autoincrement())`. `Jackpot`, `JackpotEntry`, `Listing` son `String @id @default(uuid())`. Pero **sus FKs apuntando a User/Skin son Int** para casar con las tablas existentes. No intentar convertir todo a UUID o todo a Int — hacerlo rompe migraciones. Si un `FEATURE_*.md` pide String para un FK que ya es Int, **mantener Int** y dejar nota en el resumen.
- **Atomicidad**: cualquier transferencia de skins/coins debe ir dentro de `prisma.$transaction` (`battleController.resolveBattle`, `jackpotController.resolveJackpot`, `marketController.buyListing`, `usersController.deposit`, `levelService.addExperience` cuando se usa con `tx`).
- **Rate limit**: el helper `build()` en `backend/src/middleware/rateLimit.js` devuelve `noop` cuando `NODE_ENV === 'test'`. **No tocar esto** o los tests fallarán.
- **Logger**: `backend/src/utils/logger.js` redacta `password / token / authorization / jwt` antes de imprimir. Si añades un campo sensible nuevo, suma su key a `SENSITIVE_KEYS`.
- **CORS / Sockets**: `getCorsOrigins()` en `app.js` admite múltiples orígenes vía `FRONTEND_URL` (separados por coma) y siempre añade `localhost:4200`. Reusarla para `socket.io` en `index.js`.
- **Tests**: hay 10 tests (`backend/tests/auth.test.js` 7 + `battle.test.js` 3). Tras cualquier cambio backend correr `cd backend && npm test`. Si ahora hay más, el README dice cuántos.
- **Build frontend**: tras cualquier cambio correr `cd frontend && npx ng build --configuration=development`. Debe pasar sin errores ni warnings.
- **Estilos**: nunca hardcodear colores hex en componentes nuevos — usar siempre `var(--accent)`, `var(--bg-surface)`, `var(--rarity-*)`, etc. Hay clases utility globales: `.btn / .btn-primary / .btn-ghost / .btn-danger`, `.card / .card-elevated`, `.badge`, `.live-dot`, `.gradient-text`, `.section-header / .section-title`, `.empty-state`, `.skeleton`.
- **Toasts**: usar siempre `ToastService` global (`shared/services/toast.service.ts`). No crear toasts locales por componente.
- **Loading**: el `auth.interceptor.ts` ya activa el `LoadingService` en cada HTTP. No hace falta tocar nada.
- **Auth user state**: actualizar el `currentUser` signal vía `auth.applyProfileSnapshot(snapshot)`, `auth.updateBalance(n)` o `auth.setUser(u)`. **No** acceder al signal privado directamente.
- **Sockets de usuario**: el `AppComponent` hace `socket.identify(userId)` automáticamente al login (vía `effect()` reactivo al `auth.user()`). Para emitir eventos solo a un usuario, emitir desde el backend a `io.to('user-{id}').emit(...)`.
- **Date awareness**: la fecha cambia entre sesiones. Cuando vea un `system-reminder` con la fecha actualizada, no comentarla con el usuario.

---

## 3. Stack instalado (versiones reales, no rangos del package.json)

**Backend** (`backend/package.json`)
- Node ≥18 (declarado en `engines`)
- Express 4.19, Prisma 5.22 + @prisma/client 5.22, Socket.io 4.7
- bcryptjs 2.4, jsonwebtoken 9.0
- express-validator 7.3, express-rate-limit 8.4
- Jest 30.3 + supertest 7.2 (devDeps)

**Frontend** (`frontend/package.json`)
- @angular/* 17.3.12 (cli 17.3.17, build-angular 17.3.17)
- TypeScript 5.4.5, RxJS 7.8.2, zone.js 0.14.10
- socket.io-client 4.8.3
- @fontsource/inter 5.2.8, @fontsource/rajdhani 5.2.7
- lucide-angular 1.0.0 (instalado pero **no se usa todavía**, los iconos son SVG inline)
- ❌ **No** hay Tailwind, **no** hay Angular Material

---

## 4. Estructura del repo (mapa rápido)

```
cs2-skins-arena/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # User, Skin, UserSkin, Transaction, Battle,
│   │   │                         # Jackpot, JackpotEntry, Listing
│   │   ├── migrations/           # init, add_transactions, add_battle_seed,
│   │   │                         # add_jackpot, add_marketplace, add_levels
│   │   ├── seed.js               # 11 skins, 2 usuarios, jackpot histórico
│   │   └── dev.db                # SQLite (gitignored)
│   ├── src/
│   │   ├── app.js                # createApp() factory + getCorsOrigins()
│   │   ├── index.js              # arranque + socket.io rooms
│   │   ├── config/db.js          # prisma client singleton
│   │   ├── controllers/          # auth, users, skins, battle, jackpot,
│   │   │                         # market, leaderboard, stats
│   │   ├── routes/               # mismos nombres + middlewares
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT bearer
│   │   │   ├── validate.js       # express-validator
│   │   │   ├── rateLimit.js      # noop en test
│   │   │   └── errorHandler.js   # mapea P2002/P2025/etc + 404 + global
│   │   ├── services/
│   │   │   ├── steamSkins.js     # imágenes reales del market
│   │   │   └── levelService.js   # addExperience(userId, coinsLost, prisma?)
│   │   └── utils/
│   │       ├── logger.js         # request logger + sanitización
│   │       └── levelSystem.js    # XP fórmulas (calculateLevel, getXpGained)
│   ├── tests/
│   │   ├── jest.setup.js         # NODE_ENV=test
│   │   ├── helpers.js            # createUser, ensureSkin, giveSkin, cleanupUser
│   │   ├── auth.test.js          # 7 tests
│   │   └── battle.test.js        # 3 tests
│   ├── .env / .env.example
│   ├── Procfile                  # web: node src/index.js
│   └── package.json              # engines, scripts, jest config
└── frontend/
    └── src/
        ├── styles.scss           # design tokens (CSS vars) + utility classes
        ├── index.html            # theme-color #0d0d12
        └── app/
            ├── app.component.ts  # layout app-layout + sidebar + outlet + toast
            ├── app.config.ts     # provideHttpClient(withInterceptors)
            ├── app.routes.ts     # rutas con auth/guest guards
            ├── pages/            # landing, login, register, home (lobby),
            │                     # inventory, profile, public-profile,
            │                     # stats, history, coinflip/{lobby,battle},
            │                     # jackpot, marketplace, leaderboard, not-found
            ├── shared/
            │   ├── components/   # navbar (legacy, sin uso), skin-card, sidebar,
            │   │                 # toast, loading-bar, level-badge
            │   └── services/     # toast.service, loading.service
            ├── services/         # auth, users, skins, battle, jackpot,
            │                     # market, leaderboard, socket, global-stats
            ├── models/           # user, skin, transaction, battle, jackpot,
            │                     # market, leaderboard, global-stats
            └── guards/           # auth.guard, guest.guard
```

---

## 5. Endpoints (referencia rápida)

| Método | Ruta | Auth | Notas |
|--------|------|------|-------|
| POST | `/api/auth/register` | — | rate-limited 3/h |
| POST | `/api/auth/login` | — | rate-limited 5/15min |
| GET | `/api/auth/me` | ✓ | incluye `level`, `experience`, `levelData` |
| GET | `/api/users/profile` | ✓ | incluye `level`, `experience`, `levelData`, `inventoryCount` |
| GET | `/api/users/stats` | ✓ | stats extendidas con coinflips/jackpots/marketplace/biggestWin/favoriteWeapon |
| GET | `/api/users/transactions?limit=N` | ✓ | |
| POST | `/api/users/deposit` | ✓ | amount 100..10000 |
| GET | `/api/users/level` | ✓ | `{ level, experience, totalLost, levelData, xpHistory }` |
| GET | `/api/skins` | — | catálogo |
| GET | `/api/skins/inventory` | ✓ | inventario del usuario |
| POST | `/api/battles` | ✓ | crea battle waiting |
| POST | `/api/battles/:id/join` | ✓ | resuelve la batalla |
| GET | `/api/battles` | — | listings waiting |
| GET | `/api/battles/:id` | — | detalle |
| GET | `/api/jackpot/current` | — | jackpot abierto + playerStats |
| POST | `/api/jackpot/entry` | ✓ | rate-limited 10/min/user |
| GET | `/api/jackpot/history` | — | top 10 completados |
| GET | `/api/market` | — | filtros + paginación, rate-limited 30/min |
| POST | `/api/market` | ✓ | createListing |
| GET | `/api/market/my-listings` | ✓ | |
| POST | `/api/market/:id/buy` | ✓ | |
| DELETE | `/api/market/:id` | ✓ | cancelar |
| GET | `/api/leaderboard?type=earnings\|winrate\|games` | — | top 10 |
| GET | `/api/leaderboard/profile/:username` | — | perfil público sin email |
| GET | `/api/stats` | — | stats globales (cache 5s) |
| GET | `/api/health` | — | exempt del rate limiter general |

**Socket rooms**
- `lobby` → `battle:created`, `battle:updated`
- `battle-{id}` → `battle:resolved`
- `jackpot` → `jackpot:entry`, `jackpot:timer`, `jackpot:resolved`, `jackpot:new`
- `marketplace` → `market:listed`, `market:sold`, `market:cancelled`
- `user-{id}` → `user:leveled-up`

**Eventos cliente → servidor**: `identify(userId)`, `unidentify(userId)`, `join-lobby`, `leave-lobby`, `join-battle(id)`, `leave-battle(id)`, `join-jackpot`, `leave-jackpot`, `join-marketplace`, `leave-marketplace`.

---

## 6. Sistema de niveles (FEATURE_1)

- `level` y `experience` viven en `User`. `totalLost` también.
- XP se gana solo al **perder coins**: `getXpGained(coinsLost) = floor(coinsLost * 0.1)`.
- Curva: `getXpForLevel(level) = floor(100 * 1.5^(level-1))` → 100, 150, 225, 337, 506, ...
- `addExperience(userId, coinsLost, prisma?)` integrado en `resolveBattle` (perdedor de coinflip) y `resolveJackpot` (cada perdedor distinto del ganador). Si `leveledUp`, emite `user:leveled-up` por socket a `user-{id}`.
- Frontend: `LevelBadgeComponent` standalone con tiers Novato/Competidor/Veterano/Elite/Leyenda. El sidebar lo muestra debajo del balance. El `AppComponent` se suscribe a `onLeveledUp()` y dispara un toast dorado de 6s + refresca el perfil.

---

## 7. Cómo arrancar (recordatorio)

```bash
# Backend
cd backend
npm install
npx prisma migrate deploy
npm run seed
npm run dev          # http://localhost:3000

# Frontend (otra terminal)
cd frontend
npm install
npm start            # http://localhost:4200
```

Credenciales demo: `admin@cs2arena.com` / `password123` (5000 coins) y `player@cs2arena.com` / `password123` (2500 coins).

Ejecutar tests backend: `cd backend && npm test` (10 tests, ~3s).

---

## 8. Cosas que faltan / decidir

- **Borrar `shared/components/navbar/`** o dejarlo. Sin referencias actualmente.
- **Lucide-angular** está instalado pero no se usa. Los iconos van como SVG inline. Decidir si migrar a lucide o quitar la dep.
- **Refresh tokens**: `JWT_REFRESH_SECRET` está en `.env.example` pero el flujo no está implementado.
- **PostgreSQL**: el schema sigue siendo SQLite. Para deploy real cambiar `provider = "postgresql"` en `schema.prisma`.
- **Capturas para README**: hay placeholders en la tabla de páginas. Sin imágenes reales todavía.
- **URL de producción**: el README usa `https://cs2-skins-arena.vercel.app` como placeholder.
- **Mobile sidebar**: en ≤768px el sidebar se oculta con `display:none`. Si se quiere sidebar deslizable en mobile, añadir hamburger button + drawer.

## 9. Nuevos endpoints añadidos en el bloque B

| Método | Ruta | Auth | Feature |
|--------|------|------|---------|
| GET | `/api/notifications` | ✓ | IMPROVE_3 |
| POST | `/api/notifications/read-all` | ✓ | IMPROVE_3 |
| POST | `/api/notifications/:id/read` | ✓ | IMPROVE_3 |
| GET | `/api/admin/stats` | ADMIN | FEATURE_6 |
| GET | `/api/admin/users` | ADMIN | FEATURE_6 |
| POST | `/api/admin/users/:id/ban` | ADMIN | FEATURE_6 |
| POST | `/api/admin/users/:id/give-coins` | ADMIN | FEATURE_6 |
| GET | `/api/admin/skins` | ADMIN | FEATURE_6 |
| GET | `/api/users/progression` | ✓ | FEATURE_7 |
| GET | `/api/users/referral-code` | ✓ | IMPROVE_4 |
| GET | `/api/users/referrals` | ✓ | IMPROVE_4 |
| GET | `/api/market/house-listings` | — | IMPROVE_1 |
| GET | `/api/drops/recent` | — | IMPROVE_2 |
| GET | `/api/home/feed` | — | FEATURE_8 |
| GET | `/api/stats/online` | — | IMPROVE_2 |

## 10. Nuevos eventos socket añadidos

| Evento (server → client) | Feature |
|--------------------------|---------|
| `users:online_count` | IMPROVE_2 |
| `drop:case_opened` | IMPROVE_2 |
| `notification:new` | IMPROVE_3 |
| `user:leveled-up` | FEATURE_1 |
