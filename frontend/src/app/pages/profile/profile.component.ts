import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { UserProfile } from '../../models/transaction.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="content" *ngIf="profile">
      <div class="profile-card">
        <div class="avatar">{{ profile.username.charAt(0).toUpperCase() }}</div>
        <div class="info">
          <h2>{{ profile.username }}</h2>
          <p class="email">{{ profile.email }}</p>
          <p class="since">Miembro desde {{ profile.createdAt | date:'longDate' }}</p>
        </div>
      </div>
      <div class="meta-grid">
        <div class="meta">
          <span class="label">Saldo</span>
          <span class="value gold">{{ profile.balance | number:'1.0-2' }} coins</span>
        </div>
        <div class="meta">
          <span class="label">Skins en inventario</span>
          <span class="value">{{ profile.inventoryCount }}</span>
        </div>
        <div class="meta">
          <span class="label">ID</span>
          <span class="value">#{{ profile.id }}</span>
        </div>
      </div>
      <div class="actions">
        <a routerLink="/stats" class="action-btn">Ver estadísticas</a>
        <a routerLink="/history" class="action-btn">Ver historial</a>
        <a routerLink="/inventory" class="action-btn">Ver inventario</a>
      </div>
    </main>
    <p class="loading" *ngIf="!profile">Cargando perfil...</p>
  `,
  styles: [`
    .content { padding: 2rem; max-width: 900px; margin: 0 auto; }
    .loading { text-align: center; color: #888; padding: 3rem; }
    .profile-card { display: flex; align-items: center; gap: 1.5rem;
      background: #16161a; border: 1px solid #2a2a35; border-radius: 12px;
      padding: 2rem; margin-bottom: 1.5rem; }
    .avatar { width: 90px; height: 90px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 2.5rem; font-weight: 700; }
    .info h2 { color: #e0e0e0; margin: 0 0 0.4rem 0; }
    .email { color: #888; margin: 0.2rem 0; }
    .since { color: #666; font-size: 0.85rem; margin: 0.2rem 0; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem; margin-bottom: 1.5rem; }
    .meta { background: #16161a; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem; }
    .label { color: #888; font-size: 0.85rem; }
    .value { color: #e0e0e0; font-size: 1.3rem; font-weight: 600; }
    .value.gold { color: #ffd700; }
    .actions { display: flex; gap: 1rem; flex-wrap: wrap; }
    .action-btn { background: #ff6b00; color: white; padding: 0.7rem 1.4rem;
      border-radius: 8px; text-decoration: none; font-weight: 600;
      transition: background 0.2s; }
    .action-btn:hover { background: #ff8f00; }
  `],
})
export class ProfileComponent implements OnInit {
  profile?: UserProfile;

  constructor(public auth: AuthService, private users: UsersService) {}

  ngOnInit() {
    this.users.getProfile().subscribe((p) => (this.profile = p));
  }
}
