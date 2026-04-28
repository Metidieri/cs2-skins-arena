import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/admin/stats`);
  }

  getUsers(page = 1, search = ''): Observable<any> {
    const params: any = { page: String(page) };
    if (search) params.search = search;
    return this.http.get<any>(`${environment.apiUrl}/admin/users`, { params });
  }

  banUser(id: number): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/admin/users/${id}/ban`, {});
  }

  giveCoins(id: number, amount: number, reason: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/admin/users/${id}/give-coins`, { amount, reason });
  }

  getSkins(page = 1): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/admin/skins`, { params: { page: String(page) } });
  }
}
