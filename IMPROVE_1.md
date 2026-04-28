Lee CLAUDE.md antes de empezar.
No rompas nada de lo que ya funciona.

MEJORA: Inventario de la casa y economía cerrada

El objetivo es que la "casa" tenga un usuario especial
que recibe el edge económico del juego y lista sus 
skins automáticamente en el marketplace.

BACKEND:

1. En seed.js crea el usuario de la casa si no existe:
await prisma.user.upsert({
  where: { email: 'house@arena.internal' },
  update: {},
  create: {
    username: 'CS2_Arena',
    email: 'house@arena.internal',
    password: 'house_account_not_login',
    balance: 0,
    isBot: true,
    role: 'ADMIN'
  }
})
Guarda el id en una variable HOUSE_USER_ID.

2. En backend/src/utils/houseService.js crea:

async function getHouseUserId(prisma) {
  const house = await prisma.user.findUnique({
    where: { email: 'house@arena.internal' }
  })
  return house?.id
}

async function addToHouseInventory(skinId, source, prisma) {
  const houseId = await getHouseUserId(prisma)
  if (!houseId) return
  
  // Añadir skin al inventario de la casa
  await prisma.userSkin.upsert({
    where: { userId_skinId: { userId: houseId, skinId } },
    update: {},
    create: { userId: houseId, skinId }
  })
  
  // Listar automáticamente en el marketplace
  // al precio base de la skin
  const skin = await prisma.skin.findUnique({ 
    where: { id: skinId } 
  })
  if (!skin) return
  
  // Solo listar si no está ya listada
  const existingListing = await prisma.listing.findFirst({
    where: { 
      sellerId: houseId, 
      skinId, 
      status: 'active' 
    }
  })
  if (existingListing) return
  
  await prisma.listing.create({
    data: {
      sellerId: houseId,
      skinId,
      price: skin.price,
      status: 'active'
    }
  })
}

async function collectHouseEdge(amount, prisma) {
  const houseId = await getHouseUserId(prisma)
  if (!houseId) return
  await prisma.user.update({
    where: { id: houseId },
    data: { balance: { increment: amount } }
  })
}

module.exports = { 
  getHouseUserId, 
  addToHouseInventory, 
  collectHouseEdge 
}

3. Integra houseService en los lugares donde la casa 
   debe recibir su parte:

En caseController.js en openCaseHandler:
- El edge es: houseEdge * casePrice
- Llama collectHouseEdge(edgeAmount, prisma) dentro 
  de la transacción atómica
- Si la skin ganada vale MENOS que el precio de la caja
  (es una pérdida neta para el usuario), la diferencia 
  extra también va a la casa

En rouletteController.js en resolveRound:
- El 5% del pot que ya se acumula como jackpotPool 
  también debe distribuirse a la casa parcialmente:
  el 2% del pot total va a la casa via collectHouseEdge
  y el 3% se mantiene como jackpotPool para el bote
  Actualiza el cálculo existente.

4. Nuevo endpoint GET /api/market/house-listings:
Devuelve los listings activos del usuario house
sin necesidad de auth, con paginación.
Añádelo a routes/market.js.

FRONTEND:

5. En marketplace.component.ts añade una sección 
   "Tienda oficial" al principio de la página, 
   ANTES de los filtros del marketplace P2P:
   - Header con badge "OFICIAL" dorado
   - Grid de listings de la casa (GET /api/market/house-listings)
   - Mismas ListingCards que el marketplace normal
   - Subtítulo: "Skins disponibles directamente de la arena"
   - Separador visual antes de los listings P2P

Al terminar confirma ng build limpio y npm test pasan.