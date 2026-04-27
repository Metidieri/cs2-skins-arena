import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Skin } from '../models/skin.model';

export interface CaseItem {
  rarity: string;
  probability: number;
  priceRange: [number, number];
}

export interface CaseDefinition {
  key: string;
  name: string;
  price: number;
  houseEdge: number;
  items: CaseItem[];
}

export interface CaseOpenResult {
  skin: Skin;
  seed: string;
  roll: number;
  caseType: string;
  profit: number;
  caseName: string;
  casePrice: number;
}

@Injectable({ providedIn: 'root' })
export class CasesService {
  private api = `${environment.apiUrl}/cases`;

  constructor(private http: HttpClient) {}

  getCases(): Observable<CaseDefinition[]> {
    return this.http.get<CaseDefinition[]>(this.api);
  }

  openCase(caseType: string): Observable<CaseOpenResult> {
    return this.http.post<CaseOpenResult>(`${this.api}/open`, { caseType });
  }
}
