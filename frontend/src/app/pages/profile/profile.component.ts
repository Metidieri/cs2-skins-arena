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

      <!-- REFERIDOS -->
      <section class="card referral-card" *ngIf="referral()">
        <header class="section-header">
          <span class="section-title">🎁 Programa de referidos</span>
          <span class="section-meta">+500 coins para ti y tu amigo</span>
        </header>

        <div class="referral-code-row">
          <div class="referral-code-wrap">
            <span class="referral-label">Tu código de referido</span>
            <div class="referral-code-box">
              <span class="referral-code">{{ referral()!.code }}</span>
              <button class="copy-btn" (click)="copyCode(referral()!.code)" [class.copied]="codeCopied">
                <svg *ngIf="!codeCopied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
                </svg>
                <svg *ngIf="codeCopied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {{ codeCopied ? 'Copiado' : 'Copiar' }}
              </button>
            </div>
            <div class="referral-link-row">
              <span class="ref-link">{{ refLink(referral()!.code) }}</span>
              <button class="copy-btn sm" (click)="copyLink(referral()!.code)" [class.copied]="linkCopied">
                {{ linkCopied ? '✓' : 'Copiar link' }}
              </button>
            </div>
          </div>

          <div class="referral-stats">
            <div class="ref-stat">
              <span class="ref-stat-val">{{ referral()!.totalReferrals }}</span>
              <span class="ref-stat-label">Amigos invitados</span>
            </div>
            <div class="ref-stat">
              <span class="ref-stat-val gold">{{ referral()!.coinsEarned | number:'1.0-0' }}</span>
              <span class="ref-stat-label">Coins ganados</span>
            </div>
          </div>
        </div>

        <div *ngIf="referrals().length > 0" class="referrals-list">
          <span class="referral-label">Amigos registrados</span>
          <div class="ref-items">
            <div *ngFor="let r of referrals()" class="ref-item">
              <span class="ref-avatar">{{ r.username.charAt(0).toUpperCase() }}</span>
              <span class="ref-name">{{ r.username }}</span>
              <span class="ref-date">{{ r.createdAt | date:'shortDate' }}</span>
            </div>
          </div>
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

    /* Referral */
    .referral-card { display: flex; flex-direction: column; gap: 1rem; }
    .referral-code-row { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    .referral-code-wrap { flex: 1; display: flex; flex-direction: column; gap: 0.6rem; min-width: 0; }
    .referral-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; }
    .referral-code-box {
      display: flex; align-items: center; gap: 0.6rem;
      background: var(--bg-elevated); border: 1px solid var(--border-default);
      border-radius: var(--radius-md); padding: 0.75rem 1rem;
    }
    .referral-code {
      font-family: 'Rajdhani', sans-serif;
      font-size: 22px; font-weight: 700;
      color: var(--accent); letter-spacing: 0.06em;
      flex: 1;
    }
    .copy-btn {
      display: flex; align-items: center; gap: 4px;
      background: var(--bg-surface); border: 1px solid var(--border-default);
      color: var(--text-secondary); padding: 0.4rem 0.8rem;
      border-radius: var(--radius-sm); font-size: 12px; font-weight: 600;
      cursor: pointer; transition: var(--transition); white-space: nowrap;
    }
    .copy-btn svg { width: 13px; height: 13px; }
    .copy-btn:hover { border-color: var(--accent); color: var(--accent); }
    .copy-btn.copied { border-color: var(--green); color: var(--green); background: var(--green-muted); }
    .copy-btn.sm { font-size: 11px; padding: 0.3rem 0.6rem; }
    .referral-link-row {
      display: flex; align-items: center; gap: 0.5rem;
      background: var(--bg-elevated); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm); padding: 0.4rem 0.75rem;
    }
    .ref-link {
      font-size: 11px; color: var(--text-muted);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1;
    }
    .referral-stats { display: flex; flex-direction: column; gap: 0.75rem; justify-content: center; }
    .ref-stat { text-align: center; min-width: 100px; }
    .ref-stat-val {
      display: block;
      font-family: 'Rajdhani', sans-serif;
      font-size: 32px; font-weight: 700;
      color: var(--text-primary); line-height: 1;
    }
    .ref-stat-val.gold { color: var(--gold); }
    .ref-stat-label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.08em; }
    .referrals-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .ref-items { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; }
    .ref-item {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.4rem 0.6rem;
      background: var(--bg-elevated); border-radius: var(--radius-sm);
    }
    .ref-avatar {
      width: 24px; height: 24px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      border-radius: 6px; color: #fff;
      font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ref-name { flex: 1; font-size: 13px; color: var(--text-primary); font-weight: 500; }
    .ref-date { font-size: 11px; color: var(--text-muted); }

    /* Actions */
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .btn-ghost { color: var(--text-secondary); }

    .loading-state { color: var(--text-muted); text-align: center; padding: 3rem; }
  `],
})
export class ProfileComponent implements OnInit {
  profile?: UserProfile;
  stats = signal<StatsResponse['stats'] | null>(null);
  referral = signal<{ code: string; totalReferrals: number; coinsEarned: number } | null>(null);
  referrals = signal<{ id: number; username: string; createdAt: string }[]>([]);
  codeCopied = false;
  linkCopied = false;
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
    this.users.getReferralCode().subscribe({ next: (r) => this.referral.set(r), error: () => {} });
    this.users.getReferrals().subscribe({ next: (r) => this.referrals.set(r), error: () => {} });

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

  refLink(code: string): string {
    return `${window.location.origin}/register?ref=${code}`;
  }

  copyCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      this.codeCopied = true;
      setTimeout(() => (this.codeCopied = false), 2000);
    });
  }

  copyLink(code: string) {
    navigator.clipboard.writeText(this.refLink(code)).then(() => {
      this.linkCopied = true;
      setTimeout(() => (this.linkCopied = false), 2000);
    });
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
