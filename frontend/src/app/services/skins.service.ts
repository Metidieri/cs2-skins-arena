import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Skin } from '../models/skin.model';

@Injectable({ providedIn: 'root' })
export class SkinsService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Skin[]>(`${environment.apiUrl}/skins`);
  }

  getInventory() {
    return this.http.get<Skin[]>(`${environment.apiUrl}/skins/inventory`);
  }
}
