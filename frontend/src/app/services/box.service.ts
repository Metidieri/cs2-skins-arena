import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Skin } from '../models/skin.model';

export interface BoxStatus {
  canOpen: boolean;
  timeUntilNext: number;
  userLevel: number;
  levelData: { level: number; progress: number; currentXp: number; xpNeeded: number };
  estimatedReward: { min: number; max: number; avg: number } | null;
}

export interface BoxOpenResult {
  skin: Skin;
  coinsValue: number;
  isNewRecord: boolean;
}

export interface BoxHistoryEntry {
  id: string;
  level: number;
  openedAt: string;
  coinsValue: number;
  skin: Skin;
}

@Injectable({ providedIn: 'root' })
export class BoxService {
  private api = `${environment.apiUrl}/boxes`;

  constructor(private http: HttpClient) {}

  getStatus(): Observable<BoxStatus> {
    return this.http.get<BoxStatus>(`${this.api}/status`);
  }

  openBox(): Observable<BoxOpenResult> {
    return this.http.post<BoxOpenResult>(`${this.api}/open`, {});
  }

  getHistory(): Observable<BoxHistoryEntry[]> {
    return this.http.get<BoxHistoryEntry[]>(`${this.api}/history`);
  }
}
