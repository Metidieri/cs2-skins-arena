import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { BattleService } from '../../services/battle.service';
import { JackpotService } from '../../services/jackpot.service';
import { MarketService } from '../../services/market.service';
import { SocketService } from '../../services/socket.service';
import { GlobalStatsService } from '../../services/global-stats.service';
import { Battle, BattleResolvedEvent } from '../../models/battle.model';
import { Jackpot } from '../../models/jackpot.model';
import { Listing } from '../../models/market.model';

type FeedKind = 'coinflip' | 'jackpot' | 'sale' | 'case';

interface FeedItem {
  id: string;
  kind: FeedKind;
  username: string;
  description: string;
  amount: number;
  skinName?: string;
  at: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">

      <!-- STATS BAR -->
      <div class="stats-bar">
        <div class="stat-pill">
          <span class="stat-dot green"></span>
          <span class="stat-val">{{ onlineCount() }}</span>
          <span class="stat-lbl">en línea</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 4h12v4a6 6 0 01-12 0V4z"></path>
            <path d="M9 14h6M10 14v6h4v-6M8 20h8"></path>
          </svg>
          <span class="stat-val gold">{{ jackpotPot() | number:'1.0-0' }}</span>
          <span class="stat-lbl">en el jackpot</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="9"></circle>
            <path d="M12 7v10M9.5 9.5h3.5a2 2 0 010 4h-3a2 2 0 000 4h4"></path>
          </svg>
          <span class="stat-val">{{ battles().length }}</span>
          <span class="stat-lbl">batallas activas</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-pill">
          <span class="live-dot"></span>
          <span class="stat-lbl live">EN VIVO</span>
        </div>
      </div>

      <!-- HERO -->
      <section class="hero card">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="gradient-text">Bienvenido</span>
            <span *ngIf="auth.isLoggedIn()"> {{ auth.user()?.username }}</span>
          </h1>
          <p class="hero-sub">Apostá tus skins en coinflip, jackpot, ruleta y cajas en tiempo real.</p>
          <div class="hero-cta">
            <a routerLink="/coinflip" class="btn btn-primary">Coinflip →</a>
            <a routerLink="/jackpot" class="btn btn-ghost">Jackpot</a>
            <a routerLink="/roulette" class="btn btn-ghost">Ruleta</a>
          </div>
        </div>
        <div class="hero-visual">
          <div class="hero-ring ring-1"></div>
          <div class="hero-ring ring-2"></div>
          <div class="hero-ring ring-3"></div>
          <div class="hero-icon">⚔️</div>
        </div>
      </section>

      <!-- GRID 3 COL -->
      <div class="lobby-grid">

        <!-- FEED -->
        <section class="card feed-card">
          <header class="section-header">
            <span class="section-title">Actividad reciente</span>
            <span class="section-meta">{{ feed().length }} eventos</span>
          </header>

          <div *ngIf="feed().length === 0" class="empty-state">
            <p>Aún no hay actividad. Sé el primero en jugar.</p>
          </div>

          <ul class="feed">
            <li *ngFor="let it of feed(); trackBy: trackFeed" class="feed-row" [class]="'kind-' + it.kind">
              <div class="row-icon">
                <ng-container [ngSwitch]="it.kind">
                  <svg *ngSwitchCase="'coinflip'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"></circle>
                    <path d="M12 7v10M9.5 9.5h3.5a2 2 0 010 4h-3a2 2 0 000 4h4"></path>
                  </svg>
                  <svg *ngSwitchCase="'jackpot'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 4h12v4a6 6 0 01-12 0V4z"></path>
                    <path d="M9 14h6M10 14v6h4v-6M8 20h8"></path>
                  </svg>
                  <svg *ngSwitchCase="'sale'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l1-5h16l1 5"></path>
                    <path d="M4 9v11h16V9"></path>
                    <path d="M9 13h6"></path>
                  </svg>
                  <svg *ngSwitchCase="'case'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"></path>
                  </svg>
                </ng-container>
              </div>
              <div class="row-avatar">{{ initial(it.username) }}</div>
              <div class="row-body">
                <span class="row-user">{{ it.username }}</span>
                <span class="row-desc">{{ it.description }}</span>
              </div>
              <div class="row-meta">
                <span class="row-amount">{{ it.amount | number:'1.0-0' }} <small>coins</small></span>
                <span class="row-time">{{ timeAgo(it.at) }}</span>
              </div>
            </li>
          </ul>
        </section>

        <!-- CENTER: Jackpot + Battles -->
        <div class="center-col">

          <!-- JACKPOT WIDGET -->
          <section class="card jackpot-card">
            <header class="section-header">
              <span class="section-title">🏆 Jackpot</span>
              <a routerLink="/jackpot" class="link">Jugar →</a>
            </header>

            <div *ngIf="jackpot() as jp; else noJackpot" class="jp-body">
              <div class="jp-pot">
                <span class="jp-pot-label">POT TOTAL</span>
                <span class="jp-pot-value">{{ jp.totalValue | number:'1.0-0' }}</span>
                <span class="jp-pot-unit">coins</span>
              </div>
              <div class="jp-meta-row">
                <div class="meta-box">
                  <span class="meta-val">{{ distinctPlayers(jp) }}</span>
                  <span class="meta-lbl">Jugadores</span>
                </div>
                <div class="meta-box">
                  <span class="meta-val">{{ jp.entries.length }}</span>
                  <span class="meta-lbl">Entradas</span>
                </div>
              </div>
              <div class="jp-avatars" *ngIf="jp.entries.length > 0">
                <span class="jp-avatar" *ngFor="let p of distinctEntries(jp).slice(0, 7)" [title]="p.user.username">
                  {{ initial(p.user.username) }}
                </span>
                <span class="jp-more" *ngIf="distinctEntries(jp).length > 7">+{{ distinctEntries(jp).length - 7 }}</span>
              </div>
              <a routerLink="/jackpot" class="btn btn-primary jp-btn">ENTRAR AL JACKPOT</a>
            </div>

            <ng-template #noJackpot>
              <div class="empty-state">
                <p>Sin jackpot abierto ahora.</p>
                <a routerLink="/jackpot" class="btn btn-ghost">Ver jackpots →</a>
              </div>
            </ng-template>
          </section>

          <!-- BATTLES ACTIVAS -->
          <section class="card battles-card">
            <header class="section-header">
              <span class="section-title">⚔️ Batallas 1v1</span>
              <a routerLink="/coinflip" class="link">Ver todas →</a>
            </header>

            <div *ngIf="battles().length === 0" class="empty-state">
              <p>Sin batallas esperando.</p>
              <a routerLink="/coinflip" class="btn btn-ghost">Crear batalla</a>
            </div>

            <ul class="battles" *ngIf="battles().length > 0">
              <li *ngFor="let b of battles().slice(0, 4); trackBy: trackBattle" class="battle-row">
                <div class="b-img">
                  <img *ngIf="b.skinA?.imageUrl" [src]="b.skinA?.imageUrl" [alt]="b.skinA?.name" />
                </div>
                <div class="b-info">
                  <span class="b-name">{{ b.skinA?.name }}</span>
                  <span class="b-by">por <strong>{{ b.playerA?.username }}</strong></span>
                </div>
                <div class="b-side">
                  <span class="b-price">{{ b.skinA?.price | number:'1.0-0' }}</span>
                  <a [routerLink]="['/coinflip', b.id]" class="btn btn-primary b-go">Unirse</a>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <!-- RIGHT: Quick access -->
        <aside class="quick-col">
          <section class="card quick-card">
            <header class="section-header">
              <span class="section-title">Accesos rápidos</span>
            </header>
            <div class="quick-grid">
              <a routerLink="/roulette" class="quick-item">
                <span class="quick-icon">🎡</span>
                <span class="quick-name">Ruleta</span>
                <span class="quick-desc">Rojo / Negro / Verde</span>
              </a>
              <a routerLink="/cases" class="quick-item">
                <span class="quick-icon">📦</span>
                <span class="quick-name">Cajas</span>
                <span class="quick-desc">Abre skins</span>
              </a>
              <a routerLink="/marketplace" class="quick-item">
                <span class="quick-icon">🛒</span>
                <span class="quick-name">Marketplace</span>
                <span class="quick-desc">Compra y vende</span>
              </a>
              <a routerLink="/drops" class="quick-item">
                <span class="quick-icon">📡</span>
                <span class="quick-name">Drops</span>
                <span class="quick-desc live-text">EN VIVO</span>
              </a>
            </div>
          </section>

          <section class="card leaderboard-teaser" *ngIf="topWinToday()">
            <header class="section-header">
              <span class="section-title">Mayor victoria hoy</span>
            </header>
            <div class="top-win">
              <div class="top-avatar">{{ initial(topWinToday()!.username) }}</div>
              <div class="top-info">
                <span class="top-name">{{ topWinToday()!.username }}</span>
                <span class="top-amount gold">+{{ topWinToday()!.amount | number:'1.0-0' }} coins</span>
              </div>
              <span class="top-trophy">🏆</span>
            </div>
          </section>

          <a routerLink="/leaderboard" class="card leaderboard-link">
            <span>Ver ranking completo</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"></path>
            </svg>
          </a>
        </aside>
      </div>
    </main>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }

    /* Stats bar */
    .stats-bar {
      display: flex; align-items: center; gap: 0; flex-wrap: wrap;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.6rem 1.25rem;
    }
    .stat-pill { display: flex; align-items: center; gap: 6px; padding: 0 0.6rem; }
    .stat-pill svg { width: 14px; height: 14px; color: var(--text-muted); }
    .stat-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--green); animation: pulse-g 2s infinite; }
    @keyframes pulse-g { 0%,100%{ box-shadow:0 0 0 0 rgba(16,185,129,.4) } 50%{ box-shadow:0 0 0 4px rgba(16,185,129,0) } }
    .stat-val { font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700; color: var(--text-primary); line-height: 1; }
    .stat-val.gold { color: var(--gold); }
    .stat-lbl { font-size: 11px; color: var(--text-muted); font-weight: 500; }
    .stat-lbl.live { color: #ef4444; font-weight: 800; letter-spacing: 0.12em; }
    .stat-divider { width: 1px; height: 24px; background: var(--border-subtle); margin: 0 0.25rem; }

    /* Hero */
    .hero {
      display: flex; align-items: center; justify-content: space-between; gap: 2rem;
      padding: 2rem 2.5rem;
      background: linear-gradient(135deg, var(--bg-surface) 60%, rgba(255,107,0,0.06));
      border-color: rgba(255,107,0,0.15);
      overflow: hidden; position: relative;
    }
    .hero-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .hero-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 36px; font-weight: 700;
      color: var(--text-primary); margin: 0; line-height: 1.1;
    }
    .hero-sub { color: var(--text-secondary); font-size: 14px; margin: 0; max-width: 480px; }
    .hero-cta { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .hero-visual {
      flex-shrink: 0;
      width: 120px; height: 120px;
      position: relative;
      display: flex; align-items: center; justify-content: center;
    }
    .hero-ring {
      position: absolute; border-radius: 50%;
      border: 1px solid rgba(255,107,0,0.2);
      animation: rotate 8s linear infinite;
    }
    .ring-1 { width: 100%; height: 100%; animation-duration: 8s; }
    .ring-2 { width: 78%; height: 78%; animation-duration: 5s; animation-direction: reverse; border-color: rgba(255,107,0,0.15); }
    .ring-3 { width: 55%; height: 55%; animation-duration: 3s; border-color: rgba(255,107,0,0.1); }
    @keyframes rotate { to { transform: rotate(360deg); } }
    .hero-icon { font-size: 36px; position: relative; z-index: 1; }

    /* 3-col grid */
    .lobby-grid {
      display: grid;
      grid-template-columns: 1fr 340px 280px;
      gap: 1.25rem;
      align-items: flex-start;
    }
    @media (max-width: 1280px) { .lobby-grid { grid-template-columns: 1fr 320px; } .quick-col { display: none; } }
    @media (max-width: 900px) { .lobby-grid { grid-template-columns: 1fr; } }

    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.9rem;
    }
    .section-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px; font-weight: 700;
      color: var(--text-primary);
    }
    .section-meta { font-size: 12px; color: var(--text-muted); }
    .link { color: var(--accent); font-size: 12px; font-weight: 600; text-decoration: none; }
    .link:hover { color: var(--accent-hover); }

    .empty-state {
      padding: 1.4rem; color: var(--text-muted);
      text-align: center; font-size: 13px;
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
    }

    /* Feed */
    .feed-card { max-height: 620px; overflow-y: auto; }
    .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 3px; }
    .feed-row {
      display: grid;
      grid-template-columns: 34px 28px 1fr auto;
      gap: 0.6rem; align-items: center;
      padding: 0.55rem 0.65rem;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      transition: var(--transition);
    }
    .feed-row:hover { background: var(--bg-hover); border-color: var(--border-subtle); }
    .row-icon {
      width: 34px; height: 34px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-elevated); color: var(--text-secondary);
    }
    .row-icon svg { width: 16px; height: 16px; }
    .feed-row.kind-coinflip .row-icon { color: var(--accent); background: var(--accent-muted); }
    .feed-row.kind-jackpot .row-icon { color: var(--gold); background: var(--gold-muted); }
    .feed-row.kind-sale .row-icon { color: #3b82f6; background: rgba(59,130,246,0.1); }
    .feed-row.kind-case .row-icon { color: #a855f7; background: rgba(168,85,247,0.1); }
    .row-avatar {
      width: 28px; height: 28px; border-radius: 7px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      color: #fff; font-weight: 700; font-size: 11px;
      display: flex; align-items: center; justify-content: center;
    }
    .row-body { display: flex; flex-direction: column; min-width: 0; }
    .row-user { color: var(--text-primary); font-weight: 600; font-size: 12px; line-height: 1.1; }
    .row-desc { color: var(--text-secondary); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
    .row-amount { font-family: 'Rajdhani', sans-serif; font-weight: 700; color: var(--gold); font-size: 13px; line-height: 1; }
    .row-amount small { color: var(--text-muted); font-family: 'Inter', sans-serif; font-weight: 500; font-size: 9px; }
    .row-time { color: var(--text-muted); font-size: 10px; }

    /* Center col */
    .center-col { display: flex; flex-direction: column; gap: 1.25rem; }

    /* Jackpot */
    .jp-body { display: flex; flex-direction: column; gap: 0.85rem; }
    .jp-pot {
      display: flex; flex-direction: column; align-items: center;
      padding: 1.25rem 1rem;
      border: 1px solid rgba(255,107,0,0.2);
      border-radius: var(--radius-md);
      background: radial-gradient(ellipse at 50% 0%, rgba(255,107,0,0.12) 0%, transparent 70%);
    }
    .jp-pot-label { font-size: 9px; color: var(--text-muted); letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; }
    .jp-pot-value {
      font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 40px; line-height: 1;
      background: linear-gradient(180deg, var(--gold) 0%, var(--accent) 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .jp-pot-unit { font-size: 11px; color: var(--text-muted); }
    .jp-meta-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
    .meta-box {
      background: var(--bg-elevated); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm); padding: 0.5rem 0.7rem;
      text-align: center; display: flex; flex-direction: column; gap: 2px;
    }
    .meta-val { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 20px; color: var(--text-primary); line-height: 1; }
    .meta-lbl { font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; text-transform: uppercase; }
    .jp-avatars { display: flex; gap: 4px; flex-wrap: wrap; }
    .jp-avatar, .jp-more {
      width: 26px; height: 26px; border-radius: 50%;
      background: var(--bg-elevated); border: 1px solid var(--border-default);
      color: var(--text-secondary); font-weight: 700; font-size: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .jp-btn { width: 100%; justify-content: center; padding: 0.7rem; font-size: 13px; letter-spacing: 0.08em; }

    /* Battles */
    .battles { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
    .battle-row {
      display: grid; grid-template-columns: 44px 1fr auto;
      gap: 0.6rem; align-items: center;
      padding: 0.5rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      transition: var(--transition);
    }
    .battle-row:hover { border-color: rgba(255,107,0,0.25); }
    .b-img { width: 44px; height: 44px; background: var(--bg-base); border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; padding: 4px; }
    .b-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .b-info { display: flex; flex-direction: column; min-width: 0; }
    .b-name { color: var(--text-primary); font-weight: 600; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .b-by { color: var(--text-muted); font-size: 11px; }
    .b-by strong { color: var(--text-secondary); }
    .b-side { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .b-price { color: var(--gold); font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 13px; }
    .b-go { padding: 0.3rem 0.65rem; font-size: 10px; letter-spacing: 0.07em; }

    /* Quick col */
    .quick-col { display: flex; flex-direction: column; gap: 1.25rem; }
    .quick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .quick-item {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 0.85rem 0.5rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      text-decoration: none; cursor: pointer;
      transition: var(--transition);
    }
    .quick-item:hover { border-color: rgba(255,107,0,0.35); transform: translateY(-2px); }
    .quick-icon { font-size: 22px; line-height: 1; }
    .quick-name { font-size: 12px; font-weight: 700; color: var(--text-primary); }
    .quick-desc { font-size: 10px; color: var(--text-muted); text-align: center; }
    .live-text { color: #ef4444; font-weight: 700; letter-spacing: 0.1em; }

    .leaderboard-teaser {}
    .top-win { display: flex; align-items: center; gap: 0.75rem; }
    .top-avatar {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, var(--gold), var(--accent));
      color: #fff; font-weight: 700; font-size: 16px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .top-info { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .top-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .top-amount { font-size: 12px; font-weight: 700; }
    .top-amount.gold { color: var(--gold); }
    .top-trophy { font-size: 20px; }

    .leaderboard-link {
      display: flex; align-items: center; justify-content: space-between;
      padding: 0.85rem 1rem;
      text-decoration: none;
      color: var(--text-secondary);
      font-size: 13px; font-weight: 600;
      transition: var(--transition);
    }
    .leaderboard-link:hover { color: var(--accent); }
    .leaderboard-link svg { width: 16px; height: 16px; }
  `],
})
export class HomeComponent implements OnInit, OnDestroy {
  battles = signal<Battle[]>([]);
  jackpot = signal<Jackpot | null>(null);
  feed = signal<FeedItem[]>([]);
  onlineCount = signal(0);
  topWinToday = signal<{ username: string; amount: number } | null>(null);

  private subs: Subscription[] = [];
  private nextSyntheticId = 1;

  constructor(
    public auth: AuthService,
    private battleService: BattleService,
    private jackpotService: JackpotService,
    private marketService: MarketService,
    private socket: SocketService,
    private globalStats: GlobalStatsService,
  ) {}

  ngOnInit() {
    this.loadInitial();

    this.socket.joinLobby();
    this.socket.joinJackpot();
    this.socket.joinMarketplace();

    this.subs.push(
      this.socket.onUsersOnlineCount().subscribe((c: number) => this.onlineCount.set(c)),
      this.socket.onBattleResolved().subscribe((ev) => this.pushBattleResolved(ev)),
      this.socket.onMarketSold().subscribe((l) => this.pushMarketSold(l)),
      this.socket.onCaseOpened().subscribe((ev: any) => {
        if (ev?.username && ev?.skin) {
          this.pushFeed({
            id: 'co_' + this.nextSyntheticId++,
            kind: 'case',
            username: ev.username,
            description: `Abrió ${ev.skin.name}`,
            amount: ev.skin.price || 0,
            at: Date.now(),
          });
        }
      }),
      this.socket.onJackpotResolved().subscribe((ev) => {
        this.pushFeed({
          id: 'jp_' + this.nextSyntheticId++,
          kind: 'jackpot',
          username: ev.winnerUsername,
          description: `Ganó el jackpot (${ev.entries.length} skins)`,
          amount: ev.totalValue,
          at: Date.now(),
        });
        if (!this.topWinToday() || ev.totalValue > this.topWinToday()!.amount) {
          this.topWinToday.set({ username: ev.winnerUsername, amount: ev.totalValue });
        }
      }),
      this.socket.onBattleCreated().subscribe((b) => {
        this.battles.update((arr) => [b, ...arr.filter((x) => x.id !== b.id)].slice(0, 6));
      }),
      this.socket.onBattleUpdated().subscribe((b) => {
        if (b.status !== 'waiting') {
          this.battles.update((arr) => arr.filter((x) => x.id !== b.id));
        }
      }),
    );
  }

  ngOnDestroy() {
    this.socket.leaveLobby();
    this.socket.leaveJackpot();
    this.socket.leaveMarketplace();
    this.subs.forEach((s) => s.unsubscribe());
  }

  jackpotPot(): number {
    return this.jackpot()?.totalValue || 0;
  }

  private loadInitial() {
    forkJoin({
      battles: this.battleService.getBattles().pipe(catchError(() => of([] as Battle[]))),
      jackpot: this.jackpotService.getCurrentJackpot().pipe(catchError(() => of(null as Jackpot | null))),
      market: this.marketService.getListings({ sortBy: 'newest', limit: 10 }).pipe(
        catchError(() => of({ items: [] as Listing[], page: 1, limit: 10, total: 0, totalPages: 1 })),
      ),
      feed: this.globalStats.getHomeFeed().pipe(catchError(() => of(null))),
    }).subscribe(({ battles, jackpot, market, feed }) => {
      this.battles.set(battles);
      this.jackpot.set(jackpot);

      if (feed) {
        if (feed.onlineCount) this.onlineCount.set(feed.onlineCount);
        if (feed.topWinToday) this.topWinToday.set(feed.topWinToday);
      }

      const initialFeed: FeedItem[] = [];
      for (const l of market.items.slice(0, 4)) {
        initialFeed.push({
          id: 'l_' + l.id, kind: 'sale',
          username: l.seller.username,
          description: `Listó ${l.skin.name}`,
          amount: l.price,
          at: new Date(l.createdAt).getTime(),
        });
      }
      for (const b of battles.slice(0, 4)) {
        initialFeed.push({
          id: 'b_' + b.id, kind: 'coinflip',
          username: b.playerA?.username || '???',
          description: `Creó batalla con ${b.skinA?.name || 'una skin'}`,
          amount: b.skinA?.price || 0,
          at: new Date(b.createdAt).getTime(),
        });
      }
      if (jackpot && jackpot.entries.length > 0) {
        const last = jackpot.entries[jackpot.entries.length - 1];
        initialFeed.push({
          id: 'jp_init_' + last.id, kind: 'jackpot',
          username: last.user.username,
          description: `Apostó ${last.skin.name} al pot`,
          amount: last.value,
          at: new Date(last.createdAt).getTime(),
        });
      }
      this.feed.set(initialFeed.sort((a, b) => b.at - a.at).slice(0, 15));
    });
  }

  private pushBattleResolved(ev: BattleResolvedEvent) {
    const wonValue = String(ev.winnerId) === String(ev.playerA?.id)
      ? ev.skinB?.price || 0 : ev.skinA?.price || 0;
    this.pushFeed({
      id: 'br_' + this.nextSyntheticId++, kind: 'coinflip',
      username: ev.winnerUsername,
      description: 'Ganó un coinflip 1v1',
      amount: wonValue,
      at: Date.now(),
    });
    if (!this.topWinToday() || wonValue > this.topWinToday()!.amount) {
      this.topWinToday.set({ username: ev.winnerUsername, amount: wonValue });
    }
  }

  private pushMarketSold(l: Listing) {
    if (!l.buyer) return;
    this.pushFeed({
      id: 'ms_' + l.id, kind: 'sale',
      username: l.buyer.username,
      description: `Compró ${l.skin.name}`,
      amount: l.price,
      at: Date.now(),
    });
  }

  private pushFeed(item: FeedItem) {
    this.feed.update((arr) => [item, ...arr.filter((x) => x.id !== item.id)].slice(0, 15));
  }

  distinctPlayers(jp: Jackpot): number {
    return new Set(jp.entries.map((e) => String(e.userId))).size;
  }

  distinctEntries(jp: Jackpot) {
    const seen = new Set<string>();
    return jp.entries.filter((e) => {
      const k = String(e.userId);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  initial(name?: string): string {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  timeAgo(ms: number): string {
    const diff = Math.max(0, Date.now() - ms);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }

  trackFeed(_: number, it: FeedItem) { return it.id; }
  trackBattle(_: number, b: Battle) { return b.id; }
}
