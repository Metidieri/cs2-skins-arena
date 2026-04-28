Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

FEATURE: Panel de administración

BACKEND:

1. Crea backend/src/middleware/adminOnly.js:
const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({error:'No autenticado'})
  if (req.user.role !== 'ADMIN') 
    return res.status(403).json({error:'Acceso denegado'})
  next()
}
module.exports = adminOnly

2. Crea backend/src/controllers/adminController.js:

getDashboardStats(req, res):
Devuelve todas estas métricas en una sola llamada:
{
  economy: {
    totalCoinsInCirculation: suma de balance de todos los usuarios no bots,
    totalCoinsWagered: suma de LOSS transactions (valor absoluto),
    totalCoinsWon: suma de WIN transactions,
    houseBalance: balance del usuario house@arena.internal,
    houseEdgeCollected: suma de WIN transactions del usuario house,
    marketplaceVolume: suma de price de listings sold
  },
  users: {
    total: count total de usuarios no bots,
    newToday: registrados hoy,
    newThisWeek: registrados esta semana,
    withInventory: usuarios con al menos 1 skin,
    topByBalance: top 5 usuarios con más balance
      (id, username, balance)
  },
  games: {
    coinflipsTotal: count Battle status completed,
    coinflipsToday: completados hoy,
    jackpotsTotal: count Jackpot status completed,
    jackpotsToday: completados hoy,
    rouletteRoundsTotal: count RouletteRound status completed,
    caseOpeningsTotal: count DailyBox,
    caseOpeningsToday: abiertos hoy
  },
  skins: {
    totalInCirculation: count UserSkin,
    totalValue: suma de price de todas las skins en 
                todos los inventarios,
    mostTraded: top 5 skins más apostadas en batallas
      (name, weapon, count)
  }
}

getUsers(req, res):
- Query params: page (default 1), limit (default 20),
  search (busca por username o email)
- Devuelve lista de usuarios con:
  id, username, email, balance, level, 
  createdAt, isBot, role,
  _count: { inventory, battles, rouletteBets }
- Ordenados por createdAt desc

banUser(req, res):
- Param: userId
- Cambia el role del usuario a 'BANNED'
- Devuelve usuario actualizado

giveCoins(req, res):
- body: { userId, amount, reason }
- Suma amount al balance del usuario
- Crea Transaction DEPOSIT con la reason
- Devuelve usuario actualizado

getSkinsList(req, res):
- Lista todas las skins con: nombre, precio, rareza,
  cuántos usuarios la tienen (count de UserSkin)
- Paginado, 20 por página

3. Crea backend/src/routes/admin.js:
GET  /api/admin/stats         -> getDashboardStats (auth + adminOnly)
GET  /api/admin/users         -> getUsers (auth + adminOnly)
POST /api/admin/users/:id/ban -> banUser (auth + adminOnly)
POST /api/admin/users/:id/give-coins -> giveCoins (auth + adminOnly)
GET  /api/admin/skins         -> getSkinsList (auth + adminOnly)

Registra en app.js: app.use('/api/admin', adminRoutes)

4. Verifica que el usuario admin@cs2arena.com tiene 
   role: 'ADMIN' en el seed. Si no, actualiza el seed.

FRONTEND:

5. Crea frontend/src/app/services/admin.service.ts:
- getDashboardStats(): GET /api/admin/stats
- getUsers(page, search): GET /api/admin/users
- banUser(id): POST /api/admin/users/:id/ban
- giveCoins(id, amount, reason): POST /api/admin/users/:id/give-coins
- getSkins(): GET /api/admin/skins

6. Crea frontend/src/app/guards/admin.guard.ts:
CanActivateFn que verifica auth.user()?.role === 'ADMIN'
Si no es admin redirige a /coinflip.

7. Crea frontend/src/app/pages/admin/
   admin.component.ts — ruta /admin (authGuard + adminGuard)

DISEÑO del panel de admin:

Header:
- Título "PANEL DE ADMINISTRACIÓN" en Rajdhani rojo
- Badge "ADMIN" rojo pulsante
- Nota disclaimer: "Solo visible para administradores"

SECCIÓN 1 - Economía (4 stat cards grandes):
- Coins en circulación (azul)
- Total apostado (naranja)  
- Balance de la casa (dorado)
- Volumen marketplace (verde)

SECCIÓN 2 - Usuarios (card):
- Total usuarios, nuevos hoy, nuevos esta semana
- Tabla de top 5 por balance

SECCIÓN 3 - Actividad (6 metrics en grid):
- Coinflips total y hoy
- Jackpots total y hoy
- Cajas abiertas total y hoy

SECCIÓN 4 - Gestión de usuarios:
- Input de búsqueda
- Tabla paginada con:
  * Avatar + username + email
  * Balance en dorado
  * Nivel con LevelBadge
  * Fecha registro
  * Botón "DAR COINS" (abre modal con input de cantidad)
  * Botón "BANEAR" rojo (con confirmación)
- Loading skeleton mientras carga

MODAL dar coins:
- Input de cantidad y razón
- Botón confirmar

8. En sidebar.component.ts:
Si auth.user()?.role === 'ADMIN' muestra al final
de la sección Cuenta un link especial:
- Icono de escudo rojo
- Texto "Admin Panel" en rojo
- Solo visible si el usuario es ADMIN

Al terminar confirma ng build limpio y npm test pasan.