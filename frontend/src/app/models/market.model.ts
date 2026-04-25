export interface ListingSeller {
  id: string;
  username: string;
  avatar?: string;
}

export interface ListingSkin {
  id: string;
  name: string;
  weapon: string;
  rarity: string;
  imageUrl: string;
  price: number;
}

export interface Listing {
  id: string;
  sellerId: string;
  skinId: string;
  price: number;
  status: 'active' | 'sold' | 'cancelled';
  createdAt: string;
  soldAt?: string;
  buyerId?: string;
  seller: ListingSeller;
  buyer?: ListingSeller;
  skin: ListingSkin;
}

export interface MarketFilters {
  rarity?: string;
  weapon?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'newest';
  page?: number;
  limit?: number;
}

export interface ListingPage {
  items: Listing[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
