import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { BoxService } from '../../../services/box.service';
import { LevelBadgeComponent } from '../level-badge/level-badge.component';
import { ChatComponent } from '../chat/chat.component';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, LevelBadgeComponent, ChatComponent],
  template: `
    <aside class="sidebar">
      <!-- Logo -->
      <a routerLink="/" class="sidebar-logo">
        <span class="logo-text">CS2</span>
        <span class="logo-accent">ARENA</span>
      </a>

      <!-- Balance del usuario -->
      <div class="sidebar-balance" *ngIf="auth.isLoggedIn()">
        <span class="balance-label">Balance</span>
        <span class="balance-value">
          {{ auth.user()?.balance | number:'1.0-0' }}
          <span class="balance-unit">coins</span>
        </span>
        <button class="btn-deposit" (click)="goToDeposit()">+ Depositar</button>
      </div>

      <!-- Level badge -->
      <div class="sidebar-level" *ngIf="auth.isLoggedIn() && auth.user() as u">
        <app-level-badge
          [level]="u.level || 1"
          [progress]="u.levelData?.progress || 0"
          [currentXp]="u.levelData?.currentXp"
          [xpNeeded]="u.levelData?.xpNeeded"
          size="md">
        </app-level-badge>
      </div>

      <!-- Navegación -->
      <nav class="sidebar-nav">
        <span class="nav-section-label">Juegos</span>

        <a routerLink="/daily-box" routerLinkActive="active" class="nav-item" *ngIf="auth.isLoggedIn()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
            <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"></path>
          </svg>
          <span class="nav-label">Caja Diaria</span>
          <span *ngIf="boxCanOpen" class="nav-badge box-new">¡NUEVA!</span>
          <span *ngIf="!boxCanOpen && boxCountdown" class="nav-badge box-wait">{{ boxCountdown }}</span>
        </a>

        <a routerLink="/coinflip" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 7v10M9.5 9.5h3.5a2 2 0 010 4h-3a2 2 0 000 4h4"></path>
          </svg>
          <span class="nav-label">Coinflip</span>
          <span class="nav-badge new">1v1</span>
        </a>

        <a routerLink="/jackpot" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 4h12v4a6 6 0 01-12 0V4z"></path>
            <path d="M6 6H3.5a2 2 0 002 4H6M18 6h2.5a2 2 0 01-2 4H18"></path>
            <path d="M9 14h6M10 14v6h4v-6M8 20h8"></path>
          </svg>
          <span class="nav-label">Jackpot</span>
        </a>

        <a routerLink="/roulette" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
          </svg>
          <span class="nav-label">Ruleta</span>
        </a>

        <a routerLink="/cases" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
            <line x1="12" y1="22.08" x2="12" y2="12"></line>
          </svg>
          <span class="nav-label">Cajas</span>
        </a>

        <span class="nav-section-label">Cuenta</span>

        <a routerLink="/inventory" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
          </svg>
          <span class="nav-label">Inventario</span>
        </a>

        <a routerLink="/marketplace" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l1-5h16l1 5"></path>
            <path d="M4 9v11h16V9"></path>
            <path d="M9 13h6"></path>
          </svg>
          <span class="nav-label">Marketplace</span>
        </a>

        <a routerLink="/stats" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 21h18"></path>
            <rect x="5" y="12" width="3" height="7"></rect>
            <rect x="10.5" y="8" width="3" height="11"></rect>
            <rect x="16" y="4" width="3" height="15"></rect>
          </svg>
          <span class="nav-label">Estadísticas</span>
        </a>

        <a routerLink="/history" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.5"></path>
            <path d="M3 4v4h4"></path>
            <path d="M12 7v5l3 2"></path>
          </svg>
          <span class="nav-label">Historial</span>
        </a>

        <a routerLink="/leaderboard" routerLinkActive="active" class="nav-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 21h8M12 17v4"></path>
            <path d="M7 4h10v5a5 5 0 01-10 0V4z"></path>
            <path d="M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3"></path>
          </svg>
          <span class="nav-label">Ranking</span>
        </a>
      </nav>

      <!-- Chat general -->
      <app-chat />

      <!-- Footer logueado -->
      <div class="sidebar-footer" *ngIf="auth.isLoggedIn(); else guestFooter">
        <a [routerLink]="['/player', auth.user()?.username]" class="user-row">
          <div class="user-avatar">{{ initial() }}</div>
          <div class="user-info">
            <span class="user-name">{{ auth.user()?.username }}</span>
            <span class="user-role">Jugador</span>
          </div>
        </a>
        <button class="btn-logout" (click)="logout()" title="Cerrar sesión" aria-label="Cerrar sesión">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"></path>
            <path d="M16 17l5-5-5-5"></path>
            <path d="M21 12H9"></path>
          </svg>
        </button>
      </div>

      <ng-template #guestFooter>
        <div class="sidebar-footer guest">
          <a routerLink="/login" class="btn-guest primary">Entrar</a>
          <a routerLink="/register" class="btn-guest">Registrarse</a>
        </div>
      </ng-template>
    </aside>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      left: 0; top: 0; bottom: 0;
      width: var(--sidebar-w);
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      z-index: 100;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .sidebar-logo {
      padding: 1.5rem 1.25rem 1rem;
      font-family: 'Rajdhani', sans-serif;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--border-subtle);
      margin-bottom: 0.5rem;
      display: block;
      text-decoration: none;
    }
    .logo-text { color: var(--text-primary); }
    .logo-accent { color: var(--accent); margin-left: 4px; }

    .sidebar-balance {
      margin: 0.75rem 1rem;
      padding: 0.875rem 1rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
    }
    .balance-label {
      display: block;
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 4px;
    }
    .balance-value {
      display: block;
      font-family: 'Rajdhani', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: var(--gold);
      margin-bottom: 8px;
      line-height: 1.1;
    }
    .balance-unit {
      font-size: 13px;
      color: var(--text-muted);
      font-family: 'Inter', sans-serif;
      font-weight: 500;
    }
    .btn-deposit {
      width: 100%;
      padding: 6px;
      background: var(--accent-muted);
      color: var(--accent);
      border: 1px solid rgba(255,107,0,0.2);
      border-radius: var(--radius-sm);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition);
    }
    .btn-deposit:hover { background: var(--accent); color: #fff; }

    .sidebar-level {
      margin: 0 1rem 0.5rem;
    }

    .sidebar-nav {
      flex: 1;
      padding: 0.5rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-section-label {
      display: block;
      font-size: 10px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 0.75rem 0.5rem 0.25rem;
      margin-top: 0.25rem;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      position: relative;
    }
    .nav-item svg {
      width: 18px; height: 18px;
      flex-shrink: 0;
      opacity: 0.7;
    }
    .nav-label { flex: 1; }
    .nav-item:hover {
      background: var(--bg-hover);
      color: var(--text-primary);
    }
    .nav-item.active {
      background: var(--accent-muted);
      color: var(--accent);
      font-weight: 600;
    }
    .nav-item.active svg { opacity: 1; }
    .nav-item.active::before {
      content: '';
      position: absolute;
      left: 0; top: 20%; bottom: 20%;
      width: 3px;
      background: var(--accent);
      border-radius: 0 2px 2px 0;
    }

    .nav-badge {
      margin-left: auto;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .nav-badge.new {
      background: var(--accent-muted);
      color: var(--accent);
    }
    .nav-badge.box-new {
      background: rgba(255, 140, 0, 0.18);
      color: #ff8c00;
      animation: badge-pulse 1.6s ease-in-out infinite;
    }
    @keyframes badge-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .nav-badge.box-wait {
      background: var(--bg-elevated);
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
    }

    .sidebar-footer {
      padding: 1rem 0.75rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .sidebar-footer.guest { flex-direction: column; align-items: stretch; gap: 0.4rem; }

    .user-row {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      padding: 0.5rem;
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: var(--transition);
      text-decoration: none;
      min-width: 0;
    }
    .user-row:hover { background: var(--bg-hover); }

    .user-avatar {
      width: 32px; height: 32px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: #fff;
      flex-shrink: 0;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role { font-size: 11px; color: var(--text-muted); }

    .btn-logout {
      width: 32px; height: 32px;
      background: transparent;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
      flex-shrink: 0;
      padding: 0;
    }
    .btn-logout svg { width: 16px; height: 16px; }
    .btn-logout:hover {
      border-color: var(--red);
      color: var(--red);
      background: var(--red-muted);
    }

    .btn-guest {
      display: block;
      text-align: center;
      padding: 0.55rem 0.75rem;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      transition: var(--transition);
    }
    .btn-guest:hover {
      border-color: var(--border-strong);
      color: var(--text-primary);
      background: var(--bg-elevated);
    }
    .btn-guest.primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .btn-guest.primary:hover {
      background: var(--accent-hover);
      box-shadow: var(--accent-glow);
    }
  `],
})
export class SidebarComponent implements OnInit, OnDestroy {
  boxCanOpen = false;
  boxCountdown = '';
  private badgeInterval: ReturnType<typeof setInterval> | null = null;
  private countdownMs = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  constructor(public auth: AuthService, private router: Router, private box: BoxService) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) this.refreshBoxStatus();
    this.badgeInterval = setInterval(() => {
      if (this.auth.isLoggedIn()) this.refreshBoxStatus();
    }, 60_000);
  }

  ngOnDestroy() {
    if (this.badgeInterval) clearInterval(this.badgeInterval);
    if (this.tickInterval) clearInterval(this.tickInterval);
  }

  private refreshBoxStatus() {
    this.box.getStatus().subscribe({
      next: (s) => {
        this.boxCanOpen = s.canOpen;
        if (!s.canOpen && s.timeUntilNext > 0) {
          this.countdownMs = s.timeUntilNext;
          this.updateBoxCountdown();
          if (this.tickInterval) clearInterval(this.tickInterval);
          this.tickInterval = setInterval(() => {
            this.countdownMs = Math.max(0, this.countdownMs - 60_000);
            this.updateBoxCountdown();
          }, 60_000);
        } else {
          this.boxCountdown = '';
          if (this.tickInterval) clearInterval(this.tickInterval);
        }
      },
      error: () => {},
    });
  }

  private updateBoxCountdown() {
    const total = Math.max(0, Math.floor(this.countdownMs / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    this.boxCountdown = `${pad(h)}:${pad(m)}`;
  }

  initial(): string {
    const u = this.auth.user();
    return u?.username ? u.username.charAt(0).toUpperCase() : '?';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  goToDeposit() {
    this.router.navigate(['/profile'], { fragment: 'deposit' });
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
