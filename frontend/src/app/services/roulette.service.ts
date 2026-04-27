import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RouletteHistoryItem, RouletteState } from '../models/roulette.model';

@Injectable({ providedIn: 'root' })
export class RouletteService {
  private api = `${environment.apiUrl}/roulette`;

  constructor(private http: HttpClient) {}

  getCurrentRound(): Observable<RouletteState> {
    return this.http.get<RouletteState>(`${this.api}/current`);
  }

  placeBet(color: string, amount: number): Observable<any> {
    return this.http.post(`${this.api}/bet`, { color, amount });
  }

  getHistory(): Observable<RouletteHistoryItem[]> {
    return this.http.get<RouletteHistoryItem[]>(`${this.api}/history`);
  }
}
