import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GlobalStats } from '../models/global-stats.model';

@Injectable({ providedIn: 'root' })
export class GlobalStatsService {
  constructor(private http: HttpClient) {}

  getStats(): Observable<GlobalStats> {
    return this.http.get<GlobalStats>(`${environment.apiUrl}/stats`);
  }

  getHomeFeed(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/home/feed`);
  }

  getOnlineCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${environment.apiUrl}/stats/online`);
  }
}
