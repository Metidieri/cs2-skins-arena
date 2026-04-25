import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Jackpot, JackpotEntry } from '../models/jackpot.model';

@Injectable({ providedIn: 'root' })
export class JackpotService {
  private base = `${environment.apiUrl}/jackpot`;

  constructor(private http: HttpClient) {}

  getCurrentJackpot(): Observable<Jackpot> {
    return this.http.get<Jackpot>(`${this.base}/current`);
  }

  addEntry(skinId: string): Observable<JackpotEntry> {
    return this.http.post<JackpotEntry>(`${this.base}/entry`, { skinId });
  }

  getHistory(): Observable<Jackpot[]> {
    return this.http.get<Jackpot[]>(`${this.base}/history`);
  }
}
