import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { StatsResponse, Transaction, UserProfile } from '../models/transaction.model';
import { AuthService } from './auth.service';

export interface DepositResponse {
  balance: number;
  user: {
    id: number;
    balance: number;
    username: string;
    email: string;
    avatar: string | null;
  };
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getProfile() {
    return this.http.get<UserProfile>(`${environment.apiUrl}/users/profile`);
  }

  getStats() {
    return this.http.get<StatsResponse>(`${environment.apiUrl}/users/stats`);
  }

  getTransactions(limit = 50) {
    return this.http.get<Transaction[]>(`${environment.apiUrl}/users/transactions?limit=${limit}`);
  }

  deposit(amount: number): Observable<DepositResponse> {
    return this.http
      .post<DepositResponse>(`${environment.apiUrl}/users/deposit`, { amount })
      .pipe(tap((res) => this.auth.updateBalance(res.balance)));
  }

  getReferralCode(): Observable<{ code: string; totalReferrals: number; coinsEarned: number }> {
    return this.http.get<{ code: string; totalReferrals: number; coinsEarned: number }>(`${environment.apiUrl}/users/referral-code`);
  }

  getReferrals(): Observable<{ id: number; username: string; createdAt: string }[]> {
    return this.http.get<{ id: number; username: string; createdAt: string }[]>(`${environment.apiUrl}/users/referrals`);
  }
}
