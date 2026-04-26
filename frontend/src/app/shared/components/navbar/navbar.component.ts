import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <a routerLink="/home" class="logo">MTDR</a>

      <div class="nav-links">
        <a routerLink="/home" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }" class="nav-link">Home</a>
        <a routerLink="/coinflip" routerLinkActive="active" class="nav-link">Coinflip</a>
        <a routerLink="/jackpot" routerLinkActive="active" class="nav-link">Jackpot</a>
        <a routerLink="/marketplace" routerLinkActive="active" class="nav-link">Marketplace</a>
        <a routerLink="/inventory" routerLinkActive="active" class="nav-link">Inventario</a>
        <a routerLink="/stats" routerLinkActive="active" class="nav-link">Stats</a>
        <a routerLink="/history" routerLinkActive="active" class="nav-link">Historial</a>
        <a routerLink="/leaderboard" routerLinkActive="active" class="nav-link">Ranking</a>
      </div>

      <div class="nav-right" *ngIf="auth.isLoggedIn(); else loggedOut">
        <span class="balance">{{ auth.user()?.balance | number:'1.0-0' }} coins</span>
        <a routerLink="/profile" class="user" title="Mi perfil privado">
          <span class="avatar">{{ initial() }}</span>
        </a>
        <a [routerLink]="['/player', auth.user()?.username]" class="username-link"
           title="Ver mi perfil público">
          {{ auth.user()?.username }}
        </a>
        <button class="logout-btn" (click)="auth.logout()">Salir</button>
      </div>
      <ng-template #loggedOut>
        <div class="nav-right">
          <a routerLink="/login" class="nav-link">Login</a>
          <a routerLink="/register" class="nav-link">Registro</a>
        </div>
      </ng-template>
    </nav>
  `,
  styles: [`
    .navbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1.5rem; padding: 0.9rem 2rem;
      background: #16161a; border-bottom: 1px solid #2a2a35;
      position: sticky; top: 0; z-index: 50;
    }
    .logo {
      color: #ff6b00; font-size: 1.4rem; font-weight: 800;
      letter-spacing: 0.12em; text-decoration: none;
    }
    .nav-links { display: flex; gap: 1.2rem; flex: 1; justify-content: center; }
    .nav-link {
      color: #aaa; text-decoration: none; font-weight: 500;
      transition: color 0.2s;
    }
    .nav-link:hover { color: #ff6b00; }
    .nav-link.active { color: #ff6b00; }
    .nav-right { display: flex; align-items: center; gap: 1rem; }
    .balance { color: #ff6b00; font-weight: 700; }
    .user {
      display: flex; align-items: center; gap: 0.5rem;
      text-decoration: none; color: #e0e0e0;
    }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 700;
    }
    .username { font-weight: 600; }
    .username-link {
      color: #e0e0e0; font-weight: 600; text-decoration: none;
      transition: color 0.15s;
    }
    .username-link:hover { color: #ff6b00; }
    .logout-btn {
      background: transparent; border: 1px solid #ff4444; color: #ff4444;
      padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer;
      font-weight: 600; transition: background 0.2s, color 0.2s;
    }
    .logout-btn:hover { background: #ff4444; color: #fff; }
    @media (max-width: 720px) {
      .navbar { flex-wrap: wrap; gap: 0.8rem; }
      .nav-links { order: 3; flex-basis: 100%; justify-content: flex-start; }
    }
  `],
})
export class NavbarComponent {
  initial = computed(() => {
    const u = this.auth.user();
    return u?.username ? u.username.charAt(0).toUpperCase() : '?';
  });

  constructor(public auth: AuthService) {}
}
