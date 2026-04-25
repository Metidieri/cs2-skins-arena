Lee la estructura actual del proyecto antes de empezar.
No rompas nada de lo que ya funciona.

1. Crea frontend/src/app/models/market.model.ts:

interface Listing {
  id: string
  sellerId: string
  skinId: string
  price: number
  status: 'active' | 'sold' | 'cancelled'
  createdAt: string
  soldAt?: string
  buyerId?: string
  seller: { id: string, username: string }
  skin: { id: string, name: string, weapon: string,
          rarity: string, imageUrl: string, price: number }
}

interface MarketFilters {
  rarity?: string
  weapon?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'price_asc' | 'price_desc' | 'newest'
  page?: number
  limit?: number
}

2. Añade a socket.service.ts sin tocar lo existente:
- joinMarketplace(): void
- leaveMarketplace(): void
- onMarketListed(): Observable<Listing>
- onMarketSold(): Observable<Listing>
- onMarketCancelled(): Observable<Listing>

3. Crea frontend/src/app/services/market.service.ts:
- getListings(filters?: MarketFilters): GET /api/market
- createListing(skinId, price): POST /api/market
- buyListing(id): POST /api/market/:id/buy
- cancelListing(id): DELETE /api/market/:id
- getMyListings(): GET /api/market/my-listings

Al terminar confirma archivos y build limpio.