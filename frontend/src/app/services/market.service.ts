import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Listing, ListingPage, MarketFilters } from '../models/market.model';

@Injectable({ providedIn: 'root' })
export class MarketService {
  private base = `${environment.apiUrl}/market`;

  constructor(private http: HttpClient) {}

  getListings(filters: MarketFilters = {}): Observable<ListingPage> {
    let params = new HttpParams();
    if (filters.rarity) params = params.set('rarity', filters.rarity);
    if (filters.weapon) params = params.set('weapon', filters.weapon);
    if (filters.minPrice != null) params = params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice != null) params = params.set('maxPrice', String(filters.maxPrice));
    if (filters.sortBy) params = params.set('sortBy', filters.sortBy);
    if (filters.page != null) params = params.set('page', String(filters.page));
    if (filters.limit != null) params = params.set('limit', String(filters.limit));
    return this.http.get<ListingPage>(this.base, { params });
  }

  createListing(skinId: string, price: number): Observable<Listing> {
    return this.http.post<Listing>(this.base, { skinId, price });
  }

  buyListing(id: string): Observable<Listing> {
    return this.http.post<Listing>(`${this.base}/${id}/buy`, {});
  }

  cancelListing(id: string): Observable<Listing> {
    return this.http.delete<Listing>(`${this.base}/${id}`);
  }

  getMyListings(): Observable<Listing[]> {
    return this.http.get<Listing[]>(`${this.base}/my-listings`);
  }
}
