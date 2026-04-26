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
}
