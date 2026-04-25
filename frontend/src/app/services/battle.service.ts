import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Battle, BattleResolvedEvent } from '../models/battle.model';

@Injectable({ providedIn: 'root' })
export class BattleService {
  private base = `${environment.apiUrl}/battles`;

  constructor(private http: HttpClient) {}

  createBattle(skinId: string): Observable<Battle> {
    return this.http.post<Battle>(this.base, { skinId });
  }

  joinBattle(battleId: string, skinId: string): Observable<Battle | BattleResolvedEvent> {
    return this.http.post<Battle | BattleResolvedEvent>(
      `${this.base}/${battleId}/join`,
      { skinId }
    );
  }

  getBattles(): Observable<Battle[]> {
    return this.http.get<Battle[]>(this.base);
  }

  getBattleById(id: string): Observable<Battle> {
    return this.http.get<Battle>(`${this.base}/${id}`);
  }
}
