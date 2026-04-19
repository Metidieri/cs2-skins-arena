import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { StatsResponse, Transaction, UserProfile } from '../models/transaction.model';

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient) {}

  getProfile() {
    return this.http.get<UserProfile>(`${environment.apiUrl}/users/profile`);
  }

  getStats() {
    return this.http.get<StatsResponse>(`${environment.apiUrl}/users/stats`);
  }

  getTransactions(limit = 50) {
    return this.http.get<Transaction[]>(`${environment.apiUrl}/users/transactions?limit=${limit}`);
  }
}
