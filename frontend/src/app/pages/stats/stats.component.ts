import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { StatsResponse } from '../../models/transaction.model';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page" *ngIf="data() as d; else loadingTpl">
      <header class="page-head">
        <div>
          <h1 class="title">Estadísticas</h1>
          <p class="subtitle">Resumen de tu actividad en la arena.</p>
        </div>
      </header>

      <!-- KPI grid 2x2 -->
      <section class="kpi-grid">
        <article class="kpi-card win">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 4h10v5a5 5 0 01-10 0V4z"></path>
              <path d="M8 21h8M12 17v4"></path>
            </svg>
          </div>
          <span class="kpi-num">{{ d.stats.wins }}</span>
          <span class="kpi-label">Victorias</span>
        </article>

        <article class="kpi-card loss">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="6" y1="6" x2="18" y2="18"></line>
              <line x1="6" y1="18" x2="18" y2="6"></line>
            </svg>
          </div>
          <span class="kpi-num">{{ d.stats.losses }}</span>
          <span class="kpi-label">Derrotas</span>
        </article>

        <article class="kpi-card neutral">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0z"></path>
              <path d="M9 12l2 2 4-4"></path>
            </svg>
          </div>
          <span class="kpi-num">{{ d.stats.winRate | number:'1.0-2' }}<small>%</small></span>
          <span class="kpi-label">Win rate</span>
        </article>

        <article class="kpi-card" [class.win]="d.stats.netProfit >= 0" [class.loss]="d.stats.netProfit < 0">
          <div class="kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 17l6-6 4 4 8-8"></path>
              <path d="M14 7h7v7"></path>
            </svg>
          </div>
          <span class="kpi-num">
            <span class="sign">{{ d.stats.netProfit >= 0 ? '+' : '' }}</span>
            {{ d.stats.netProfit | number:'1.0-0' }}
          </span>
          <span class="kpi-label">Ganancia neta</span>
        </article>
      </section>

      <!-- Win rate bar -->
      <section class="card winrate-card">
        <header class="section-header">
          <span class="section-title">Win rate</span>
          <span class="section-meta" [class.win]="d.stats.winRate >= 50" [class.loss]="d.stats.winRate < 50">
            {{ d.stats.wins }}W / {{ d.stats.losses }}L
          </span>
        </header>
        <div class="winrate-bar">
          <div class="winrate-fill"
               [class.win]="d.stats.winRate >= 50"
               [class.loss]="d.stats.winRate < 50"
               [style.width.%]="d.stats.winRate">
            <span class="winrate-text">{{ d.stats.winRate | number:'1.0-2' }}%</span>
          </div>
        </div>
      </section>

      <!-- Secondary stats: 3 columns -->
      <section class="secondary-grid">
        <article class="card sec-card">
          <span class="sec-label">Coinflips</span>
          <span class="sec-value">{{ d.stats.coinflipsPlayed || 0 }}</span>
          <div class="sec-meta">
            <span class="dot win"></span>{{ d.stats.coinflipsWon || 0 }}W
            <span class="sep">·</span>
            <span class="dot loss"></span>{{ d.stats.coinflipsLost || 0 }}L
          </div>
        </article>

        <article class="card sec-card">
          <span class="sec-label">Jackpots</span>
          <span class="sec-value">{{ d.stats.jackpotsPlayed || 0 }}</span>
          <div class="sec-meta">
            <span class="dot win"></span>{{ d.stats.jackpotsWon || 0 }} ganados
          </div>
        </article>

        <article class="card sec-card">
          <span class="sec-label">Marketplace</span>
          <span class="sec-value">{{ (d.stats.marketplaceSales || 0) + (d.stats.marketplacePurchases || 0) }}</span>
          <div class="sec-meta">
            <span class="dot win"></span>{{ d.stats.marketplaceSales || 0 }} ventas
            <span class="sep">·</span>
            <span class="dot blue"></span>{{ d.stats.marketplacePurchases || 0 }} compras
          </div>
        </article>
      </section>

      <!-- Inventario -->
      <section class="card inv-card">
        <header class="section-header">
          <span class="section-title">Inventario</span>
        </header>
        <div class="inv-stats">
          <div class="inv-stat">
            <span class="inv-label">Skins poseídas</span>
            <span class="inv-value">{{ d.stats.inventoryCount }}</span>
          </div>
          <div class="inv-stat">
            <span class="inv-label">Valor total</span>
            <span class="inv-value gold">{{ d.stats.inventoryValue | number:'1.0-0' }} <small>coins</small></span>
          </div>
          <div class="inv-stat">
            <span class="inv-label">Total depositado</span>
            <span class="inv-value">{{ d.stats.totalDeposited | number:'1.0-0' }} <small>coins</small></span>
          </div>
        </div>
      </section>
    </main>

    <ng-template #loadingTpl>
      <main class="page">
        <div class="skeleton sk-head"></div>
        <div class="kpi-grid">
          <div *ngFor="let _ of [1,2,3,4]" class="skeleton sk-kpi"></div>
        </div>
      </main>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.4rem; }

    .page-head .title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 32px;
      color: var(--text-primary); margin: 0;
    }
    .page-head .subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    /* KPI 2x2 */
    .kpi-grid {
      display: grid; gap: 1rem;
      grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 880px) { .kpi-grid { grid-template-columns: 1fr; } }

    .kpi-card {
      --tone: var(--text-secondary);
      --tone-bg: var(--bg-elevated);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.4rem 1.5rem;
      display: flex; flex-direction: column; gap: 4px;
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: ''; position: absolute;
      top: 0; right: 0; bottom: 0; left: 0;
      background: radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--tone) 12%, transparent) 0%, transparent 60%);
      pointer-events: none;
    }
    .kpi-card.win { --tone: var(--green); --tone-bg: var(--green-muted); }
    .kpi-card.loss { --tone: var(--red); --tone-bg: var(--red-muted); }
    .kpi-card.neutral { --tone: var(--accent); --tone-bg: var(--accent-muted); }

    .kpi-icon {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: var(--tone-bg);
      color: var(--tone);
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 0.4rem;
    }
    .kpi-icon svg { width: 20px; height: 20px; }
    .kpi-num {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 44px;
      line-height: 1;
      color: var(--tone);
    }
    .kpi-num small {
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      font-weight: 500;
      color: var(--text-muted);
      margin-left: 2px;
    }
    .kpi-num .sign { color: var(--tone); }
    .kpi-label {
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
    }

    /* Win rate bar */
    .winrate-card { padding: 1.4rem 1.5rem; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.7rem; }
    .section-title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 18px;
      color: var(--text-primary);
    }
    .section-meta { font-size: 12px; color: var(--text-muted); font-weight: 600; }
    .section-meta.win { color: var(--green); }
    .section-meta.loss { color: var(--red); }

    .winrate-bar {
      height: 14px; background: var(--bg-base);
      border-radius: 999px; overflow: hidden;
      border: 1px solid var(--border-subtle);
    }
    .winrate-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--green), color-mix(in srgb, var(--green) 70%, var(--accent)));
      border-radius: 999px;
      transition: width 0.6s ease;
      display: flex; align-items: center; justify-content: flex-end;
      padding-right: 0.6rem;
    }
    .winrate-fill.loss {
      background: linear-gradient(90deg, var(--red), color-mix(in srgb, var(--red) 70%, var(--accent)));
    }
    .winrate-text { color: #fff; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; }

    /* Secondary 3 cols */
    .secondary-grid {
      display: grid; gap: 1rem;
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 880px) { .secondary-grid { grid-template-columns: 1fr; } }
    .sec-card { display: flex; flex-direction: column; gap: 4px; }
    .sec-label {
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
    }
    .sec-value {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 36px;
      color: var(--text-primary);
      line-height: 1;
    }
    .sec-meta {
      font-size: 12px; color: var(--text-secondary);
      display: flex; align-items: center; gap: 6px;
      margin-top: 4px;
    }
    .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .dot.win { background: var(--green); }
    .dot.loss { background: var(--red); }
    .dot.blue { background: var(--blue); }
    .sep { color: var(--text-muted); }

    /* Inventario */
    .inv-card .inv-stats {
      display: grid; gap: 1rem;
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 720px) { .inv-card .inv-stats { grid-template-columns: 1fr; } }
    .inv-stat {
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1rem 1.2rem;
      display: flex; flex-direction: column; gap: 4px;
    }
    .inv-label { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
    .inv-value {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 26px;
      color: var(--text-primary); line-height: 1;
    }
    .inv-value.gold { color: var(--gold); }
    .inv-value small { font-family: 'Inter', sans-serif; font-weight: 500; font-size: 12px; color: var(--text-muted); margin-left: 2px; }

    /* Skeletons */
    .sk-head { height: 60px; margin-bottom: 1rem; }
    .sk-kpi { height: 140px; }
  `],
})
export class StatsComponent implements OnInit {
  data = signal<StatsResponse | null>(null);

  constructor(public auth: AuthService, private users: UsersService) {}

  ngOnInit() {
    this.users.getStats().subscribe((d) => this.data.set(d));
  }
}
