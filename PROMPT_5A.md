Lee toda la estructura del proyecto cs2-skins-arena.
No rompas nada de lo que ya funciona.

BACKEND - Marketplace de skins:

1. Añade al schema.prisma:

model Listing {
  id        String   @id @default(uuid())
  sellerId  String
  skinId    String
  price     Float
  status    String   @default("active")
  createdAt DateTime @default(now())
  soldAt    DateTime?
  buyerId   String?
  seller    User     @relation("Seller", fields: [sellerId], references: [id])
  buyer     User?    @relation("Buyer", fields: [buyerId], references: [id])
  skin      Skin     @relation(fields: [skinId], references: [id])
}

Añade a User:
  listingsAsSeller Listing[] @relation("Seller")
  listingsAsBuyer  Listing[] @relation("Buyer")
Añade a Skin: listings Listing[]

Ejecuta: npx prisma migrate dev --name add_marketplace

2. Crea backend/src/controllers/marketController.js:

getListings(req, res):
- Listings con status "active"
- Query params opcionales: rarity, weapon, 
  minPrice, maxPrice, sortBy (price_asc/price_desc/newest)
- Include: seller (username), skin completo
- Paginación: page y limit (default 20)

createListing(req, res):
- Verifica que el usuario tiene la skin (UserSkin)
- Verifica precio mínimo: 1 coin
- Verifica que no tiene ya ese skin listado
- Crea Listing con status "active"
- NO elimina UserSkin todavía (se elimina al vender)
- Emite "market:listed" al canal "marketplace"
- Devuelve listing creado

buyListing(req, res):
- Verifica que el listing está "active"
- Verifica que el comprador no es el vendedor
- Verifica que el comprador tiene saldo suficiente
- Ejecuta en transacción de Prisma:
  * Descuenta price del wallet del comprador
  * Suma price al wallet del vendedor
  * Elimina UserSkin del vendedor
  * Crea UserSkin para el comprador
  * Actualiza Listing: status "sold", buyerId, soldAt
  * Crea Transaction para comprador: 
    type "LOSS", amount negativo, 
    description "Compra en marketplace: [skin]"
  * Crea Transaction para vendedor:
    type "WIN", amount positivo,
    description "Venta en marketplace: [skin]"
- Emite "market:sold" al canal "marketplace"
- Devuelve listing actualizado

cancelListing(req, res):
- Verifica que el listing pertenece al usuario
- Verifica que está "active"
- Actualiza status a "cancelled"
- Emite "market:cancelled" al canal "marketplace"

getMyListings(req, res):
- Listings del usuario autenticado
- Todos los status (active, sold, cancelled)
- Include: skin, buyer si existe

3. Crea backend/src/routes/market.js:
GET    /api/market              -> getListings (público)
POST   /api/market              -> createListing (auth)
POST   /api/market/:id/buy      -> buyListing (auth)
DELETE /api/market/:id          -> cancelListing (auth)
GET    /api/market/my-listings  -> getMyListings (auth)

4. Registra en index.js y añade sala "marketplace" a Socket.io

Al terminar dime cambios, migración y errores.