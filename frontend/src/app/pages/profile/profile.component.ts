import { Component, ElementRef, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { StatsResponse, UserProfile } from '../../models/transaction.model';
import { ToastService } from '../../shared/services/toast.service';

const PRESETS = [100, 500, 1000, 5000];

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <main class="page" *ngIf="profile">
      <!-- HEADER -->
      <header class="profile-header card">
        <div class="header-main">
          <div class="avatar">{{ initial() }}</div>
          <div class="header-info">
            <h1 class="username">{{ profile.username }}</h1>
            <span class="badge-level">NIVEL {{ level() }}</span>
            <p class="email">{{ profile.email }}</p>
            <p class="since">Miembro desde {{ profile.createdAt | date:'longDate' }}</p>
          </div>
        </div>

        <div class="xp-row">
          <div class="xp-label">
            <span>{{ xpInLevel() }} / {{ xpForLevel() }} XP</span>
            <span>{{ xpRemaining() }} para nivel {{ level() + 1 }}</span>
          </div>
          <div class="xp-bar">
            <div class="xp-fill" [style.width.%]="xpProgress()"></div>
          </div>
        </div>

        <div class="quick-stats">
          <div class="qs">
            <span class="qs-label">Saldo</span>
            <span class="qs-value gold">{{ auth.user()?.balance | number:'1.0-0' }}</span>
          </div>
          <div class="qs">
            <span class="qs-label">Skins</span>
            <span class="qs-value">{{ profile.inventoryCount }}</span>
          </div>
          <div class="qs">
            <span class="qs-label">ID</span>
            <span class="qs-value">#{{ profile.id }}</span>
          </div>
        </div>
      </header>

      <!-- SECCIÓN DEPÓSITO -->
      <section #depositSection class="card deposit-card" id="deposit">
        <header class="section-header">
          <span class="section-title">Añadir coins</span>
          <span class="section-meta">Saldo actual: <strong>{{ auth.user()?.balance | number:'1.0-0' }}</strong></span>
        </header>

        <div class="deposit-presets">
          <button
            *ngFor="let p of presets"
            class="preset"
            [class.active]="depositAmount === p"
            (click)="setPreset(p)">
            +{{ p | number:'1.0-0' }}
          </button>
        </div>

        <div class="deposit-row">
          <label class="deposit-input">
            <span>Cantidad personalizada</span>
            <input
              type="number"
              [(ngModel)]="depositAmount"
              min="100"
              max="10000"
              placeholder="100 - 10000" />
          </label>
          <button class="btn btn-primary deposit-btn"
                  [disabled]="!validDeposit() || depositing()"
                  (click)="doDeposit()">
            <span *ngIf="depositing()" class="spinner"></span>
            <span>{{ depositing() ? 'Depositando...' : 'DEPOSITAR' }}</span>
          </button>
        </div>

        <p class="disclaimer">
          Depósito simulado entre 100 y 10000 coins por operación. No se acepta dinero real.
        </p>
      </section>

      <!-- STATS EXTENDIDAS -->
      <section *ngIf="stats() as s" class="ext-section">
        <header class="section-header">
          <span class="section-title">Métricas extendidas</span>
        </header>

        <div class="ext-grid">
          <article class="card metric">
            <span class="metric-label">Coinflips</span>
            <span class="metric-value">{{ s.coinflipsPlayed || 0 }}</span>
            <span class="metric-meta">
              <span class="dot win"></span>{{ s.coinflipsWon || 0 }}W
              <span class="sep">·</span>
              <span class="dot loss"></span>{{ s.coinflipsLost || 0 }}L
            </span>
          </article>

          <article class="card metric">
            <span class="metric-label">Jackpots</span>
            <span class="metric-value">{{ s.jackpotsPlayed || 0 }}</span>
            <span class="metric-meta">
              <span class="dot win"></span>{{ s.jackpotsWon || 0 }} ganados
            </span>
          </article>

          <article class="card metric">
            <span class="metric-label">Marketplace</span>
            <span class="metric-value">{{ (s.marketplaceSales || 0) + (s.marketplacePurchases || 0) }}</span>
            <span class="metric-meta">
              {{ s.marketplaceSales || 0 }} ventas <span class="sep">·</span> {{ s.marketplacePurchases || 0 }} compras
            </span>
          </article>

          <article class="card metric">
            <span class="metric-label">Ganancias</span>
            <span class="metric-value gold">{{ s.totalEarnings || 0 | number:'1.0-0' }}</span>
            <span class="metric-meta">coins acumulados</span>
          </article>

          <article *ngIf="s.favoriteWeapon" class="card metric">
            <span class="metric-label">Arma favorita</span>
            <span class="metric-value">{{ s.favoriteWeapon.weapon }}</span>
            <span class="metric-meta">{{ s.favoriteWeapon.count }} en inventario</span>
          </article>

          <article *ngIf="s.biggestWin" class="card metric biggest">
            <span class="metric-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M7 4h10v5a5 5 0 01-10 0V4z"></path>
                <path d="M8 21h8M12 17v4"></path>
              </svg>
              Mayor victoria
            </span>
            <span class="metric-value gold">+{{ s.biggestWin.amount | number:'1.0-0' }}</span>
            <span class="metric-meta">{{ s.biggestWin.description || '—' }}</span>
          </article>
        </div>
      </section>

      <!-- ATAJOS -->
      <section class="actions">
        <a routerLink="/stats" class="btn btn-ghost">Ver estadísticas</a>
        <a routerLink="/history" class="btn btn-ghost">Ver historial</a>
        <a routerLink="/inventory" class="btn btn-ghost">Ver inventario</a>
      </section>
    </main>

    <p class="loading-state" *ngIf="!profile">Cargando perfil...</p>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.4rem; }

    /* Header */
    .profile-header { display: flex; flex-direction: column; gap: 1rem; }
    .header-main { display: flex; align-items: center; gap: 1.4rem; }
    .avatar {
      width: 80px; height: 80px;
      border-radius: 20px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      color: #fff;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 32px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 22px rgba(255,107,0,0.35);
      flex-shrink: 0;
    }
    .header-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .username {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 28px;
      color: var(--text-primary); margin: 0; line-height: 1;
    }
    .badge-level {
      align-self: flex-start;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px; font-weight: 800; letter-spacing: 0.1em;
      color: var(--gold);
      background: var(--gold-muted);
      border: 1px solid var(--gold);
      margin: 4px 0;
    }
    .email { color: var(--text-secondary); margin: 2px 0; font-size: 13px; }
    .since { color: var(--text-muted); margin: 0; font-size: 12px; }

    /* XP bar */
    .xp-row { display: flex; flex-direction: column; gap: 6px; }
    .xp-label {
      display: flex; justify-content: space-between;
      font-size: 11px; color: var(--text-muted);
      letter-spacing: 0.05em;
    }
    .xp-bar {
      height: 8px;
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      border-radius: 999px;
      overflow: hidden;
    }
    .xp-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--gold));
      transition: width 0.6s ease;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
    }
    .qs {
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      display: flex; flex-direction: column; gap: 4px;
    }
    .qs-label { font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .qs-value {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 22px;
      color: var(--text-primary); line-height: 1;
    }
    .qs-value.gold { color: var(--gold); }

    /* Deposit */
    .deposit-card { display: flex; flex-direction: column; gap: 1rem; }
    .section-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; flex-wrap: wrap; }
    .section-title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 18px;
      color: var(--text-primary);
    }
    .section-meta { color: var(--text-muted); font-size: 12px; }
    .section-meta strong { color: var(--gold); font-family: 'Rajdhani', sans-serif; }

    .deposit-presets { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .preset {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      padding: 0.5rem 1rem;
      border-radius: 999px;
      cursor: pointer;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 13px;
      transition: var(--transition);
    }
    .preset:hover { color: var(--text-primary); border-color: var(--border-strong); }
    .preset.active {
      color: var(--accent);
      border-color: var(--accent);
      background: var(--accent-muted);
    }

    .deposit-row {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.6rem;
      align-items: end;
    }
    @media (max-width: 640px) { .deposit-row { grid-template-columns: 1fr; } }
    .deposit-input { display: flex; flex-direction: column; gap: 0.3rem; }
    .deposit-input span { color: var(--text-muted); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }
    .deposit-input input {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      color: var(--text-primary);
      padding: 0.7rem 0.9rem;
      border-radius: var(--radius-sm);
      font-size: 14px;
    }
    .deposit-input input:focus {
      outline: none; border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-muted);
    }
    .deposit-btn {
      padding: 0.75rem 1.4rem;
      font-family: 'Rajdhani', sans-serif;
      font-size: 14px; letter-spacing: 0.08em;
    }
    .spinner {
      width: 12px; height: 12px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .disclaimer { color: var(--text-muted); font-size: 11px; margin: 0; }

    /* Métricas extendidas */
    .ext-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }
    .metric {
      display: flex; flex-direction: column; gap: 6px;
      padding: 1rem 1.2rem;
    }
    .metric-label {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--text-muted); font-weight: 600;
    }
    .metric-label svg { width: 14px; height: 14px; color: var(--gold); }
    .metric-value {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 28px;
      color: var(--text-primary); line-height: 1;
    }
    .metric-value.gold { color: var(--gold); }
    .metric-meta { color: var(--text-secondary); font-size: 12px; display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .dot { width: 7px; height: 7px; border-radius: 50%; }
    .dot.win { background: var(--green); }
    .dot.loss { background: var(--red); }
    .sep { color: var(--text-muted); }

    .metric.biggest {
      grid-column: span 2;
      background: linear-gradient(135deg, var(--bg-surface), color-mix(in srgb, var(--gold) 12%, var(--bg-surface)));
      border-color: color-mix(in srgb, var(--gold) 30%, var(--border-default));
    }
    @media (max-width: 720px) { .metric.biggest { grid-column: span 1; } }
    .metric.biggest .metric-value { font-size: 36px; }

    /* Actions */
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .btn-ghost { color: var(--text-secondary); }

    .loading-state { color: var(--text-muted); text-align: center; padding: 3rem; }
  `],
})
export class ProfileComponent implements OnInit {
  profile?: UserProfile;
  stats = signal<StatsResponse['stats'] | null>(null);
  depositAmount = 500;
  depositing = signal(false);
  presets = PRESETS;

  @ViewChild('depositSection') depositSection?: ElementRef<HTMLElement>;

  level = computed(() => {
    const s = this.stats();
    const games = (s?.wins || 0) + (s?.losses || 0);
    return Math.max(1, Math.floor(games / 5) + 1);
  });
  xpForLevel = computed(() => 5);
  xpInLevel = computed(() => {
    const s = this.stats();
    const games = (s?.wins || 0) + (s?.losses || 0);
    return games % 5;
  });
  xpRemaining = computed(() => Math.max(0, this.xpForLevel() - this.xpInLevel()));
  xpProgress = computed(() => (this.xpInLevel() / this.xpForLevel()) * 100);

  constructor(
    public auth: AuthService,
    private users: UsersService,
    private route: ActivatedRoute,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.users.getProfile().subscribe((p) => (this.profile = p));
    this.users.getStats().subscribe((res) => this.stats.set(res.stats));

    if (this.route.snapshot.fragment === 'deposit') {
      setTimeout(() => {
        this.depositSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  initial(): string {
    return (this.profile?.username?.charAt(0) || '?').toUpperCase();
  }

  setPreset(p: number) { this.depositAmount = p; }

  validDeposit() {
    return this.depositAmount >= 100 && this.depositAmount <= 10000;
  }

  doDeposit() {
    if (!this.validDeposit() || this.depositing()) return;
    const amt = this.depositAmount;
    this.depositing.set(true);
    this.users.deposit(amt).subscribe({
      next: (res) => {
        this.depositing.set(false);
        if (this.profile) this.profile = { ...this.profile, balance: res.balance };
        this.users.getStats().subscribe((s) => this.stats.set(s.stats));
        this.toast.success(`Saldo actualizado: ${res.balance.toLocaleString()} coins`);
      },
      error: (err) => {
        this.depositing.set(false);
        this.toast.error(err?.error?.error || 'Error al depositar');
      },
    });
  }
}
