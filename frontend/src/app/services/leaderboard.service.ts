import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  LeaderboardResponse,
  LeaderboardType,
  PublicProfileResponse,
} from '../models/leaderboard.model';

@Injectable({ providedIn: 'root' })
export class LeaderboardService {
  private base = `${environment.apiUrl}/leaderboard`;

  constructor(private http: HttpClient) {}

  getLeaderboard(type: LeaderboardType = 'earnings'): Observable<LeaderboardResponse> {
    const params = new HttpParams().set('type', type);
    return this.http.get<LeaderboardResponse>(this.base, { params });
  }

  getPublicProfile(username: string): Observable<PublicProfileResponse> {
    return this.http.get<PublicProfileResponse>(`${this.base}/profile/${encodeURIComponent(username)}`);
  }
}
