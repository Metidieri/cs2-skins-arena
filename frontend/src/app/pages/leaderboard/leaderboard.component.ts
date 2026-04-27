import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import {
  LeaderboardEntry,
  LeaderboardType,
} from '../../models/leaderboard.model';

const TABS: { id: LeaderboardType; label: string; unit: string }[] = [
  { id: 'earnings', label: 'Ganancias', unit: 'coins' },
  { id: 'winrate', label: 'Win Rate', unit: '%' },
  { id: 'games', label: 'Partidas', unit: 'games' },
];

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <h1 class="title">Ranking</h1>
          <p class="subtitle">Los mejores jugadores de CS2 Skins Arena.</p>
        </div>
        <nav class="tabs">
          <button
            *ngFor="let t of tabs"
            class="tab"
            [class.active]="active() === t.id"
            (click)="switchTab(t.id)">
            {{ t.label }}
          </button>
        </nav>
      </header>

      <div *ngIf="loading()" class="loading">Cargando ranking...</div>

      <ng-container *ngIf="!loading() && results().length > 0">
        <!-- PODIO -->
        <section class="podium" *ngIf="podium() as p">
          <article class="podium-card silver" *ngIf="p.second" style="animation-delay: 0.1s">
            <div class="rank-pill">2</div>
            <div class="podium-avatar">
              <span class="avatar-text">{{ initial(p.second.user.username) }}</span>
            </div>
            <a class="podium-name" [routerLink]="['/player', p.second.user.username]">
              {{ p.second.user.username }}
            </a>
            <div class="podium-stat">{{ formatStat(p.second.stat) }}</div>
            <div class="podium-meta">{{ unitLabel() }}</div>
            <div class="bar"></div>
          </article>

          <article class="podium-card gold first" *ngIf="p.first" style="animation-delay: 0s">
            <svg class="crown" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 9l4 8h12l4-8-5 3-5-7-5 7z"></path>
              <path d="M6 21h12"></path>
            </svg>
            <div class="rank-pill">1</div>
            <div class="podium-avatar gold-bg">
              <span class="avatar-text">{{ initial(p.first.user.username) }}</span>
            </div>
            <a class="podium-name" [routerLink]="['/player', p.first.user.username]">
              {{ p.first.user.username }}
            </a>
            <div class="podium-stat">{{ formatStat(p.first.stat) }}</div>
            <div class="podium-meta">{{ unitLabel() }}</div>
            <div class="bar"></div>
          </article>

          <article class="podium-card bronze" *ngIf="p.third" style="animation-delay: 0.2s">
            <div class="rank-pill">3</div>
            <div class="podium-avatar">
              <span class="avatar-text">{{ initial(p.third.user.username) }}</span>
            </div>
            <a class="podium-name" [routerLink]="['/player', p.third.user.username]">
              {{ p.third.user.username }}
            </a>
            <div class="podium-stat">{{ formatStat(p.third.stat) }}</div>
            <div class="podium-meta">{{ unitLabel() }}</div>
            <div class="bar"></div>
          </article>
        </section>

        <!-- TABLA 4-10 -->
        <section *ngIf="rest().length > 0 || meRow()" class="card list-card">
          <header class="section-header">
            <span class="section-title">Resto del top 10</span>
            <span class="section-meta">{{ statHeader() }}</span>
          </header>

          <ul class="rank-list">
            <li *ngFor="let r of rest(); let i = index"
                class="rank-row"
                [class.alt]="i % 2 === 1"
                [class.me]="isMe(r)">
              <span class="rank-num">{{ r.rank }}</span>
              <a class="player-cell" [routerLink]="['/player', r.user.username]">
                <span class="mini-avatar">{{ initial(r.user.username) }}</span>
                <span class="player-name">{{ r.user.username }}</span>
              </a>
              <span class="rank-stat gold">{{ formatStat(r.stat) }}</span>
              <span class="rank-side">{{ r.gamesPlayed }} partidas · {{ r.winRate | number:'1.0-2' }}%</span>
            </li>

            <li *ngIf="meRow() && !meInTop()" class="rank-row me extra">
              <span class="rank-num">{{ meRow()!.rank }}</span>
              <a class="player-cell" [routerLink]="['/player', meRow()!.user.username]">
                <span class="mini-avatar gold-bg">{{ initial(meRow()!.user.username) }}</span>
                <span class="player-name">{{ meRow()!.user.username }} (tú)</span>
              </a>
              <span class="rank-stat gold">{{ formatStat(meRow()!.stat) }}</span>
              <span class="rank-side">{{ meRow()!.gamesPlayed }} partidas · {{ meRow()!.winRate | number:'1.0-2' }}%</span>
            </li>
          </ul>
        </section>
      </ng-container>

      <div *ngIf="!loading() && results().length === 0" class="empty">
        Aún no hay jugadores en este ranking.
      </div>
    </main>
  `,
  styles: [`
    .page { max-width: 1100px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.4rem; }

    .page-head {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 1.5rem; flex-wrap: wrap;
    }
    .title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 32px;
      color: var(--text-primary); margin: 0;
    }
    .subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .tabs { display: flex; gap: 0.4rem; }
    .tab {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      padding: 0.5rem 1.1rem;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      transition: var(--transition);
    }
    .tab:hover { color: var(--text-primary); border-color: var(--border-strong); }
    .tab.active {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
      box-shadow: var(--accent-glow);
    }

    .loading, .empty { text-align: center; color: var(--text-muted); padding: 3rem 0; }

    /* PODIO */
    .podium {
      display: grid;
      grid-template-columns: 1fr 1.2fr 1fr;
      gap: 1rem;
      align-items: end;
    }
    @media (max-width: 720px) {
      .podium { grid-template-columns: 1fr; }
      .podium-card.first { order: -1; }
    }
    .podium-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.6rem 1rem 0;
      text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      position: relative;
      opacity: 0;
      transform: translateY(20px);
      animation: podium-in 0.5s ease forwards;
      transition: transform 0.2s;
    }
    @keyframes podium-in {
      to { opacity: 1; transform: translateY(0); }
    }
    .podium-card:hover { transform: translateY(-4px) !important; }
    .podium-card.first { padding-top: 2.2rem; }

    .crown {
      position: absolute;
      top: -16px; left: 50%; transform: translateX(-50%);
      width: 38px; height: 38px;
      color: var(--gold);
      filter: drop-shadow(0 4px 16px rgba(232,184,75,0.5));
    }

    .rank-pill {
      width: 32px; height: 32px;
      border-radius: 999px;
      background: var(--bg-base);
      border: 1.5px solid var(--border-default);
      color: var(--text-muted);
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .podium-card.gold .rank-pill { color: var(--gold); border-color: var(--gold); background: var(--gold-muted); }
    .podium-card.silver .rank-pill { color: #c0c0d0; border-color: #c0c0d0; background: rgba(192,192,208,0.12); }
    .podium-card.bronze .rank-pill { color: #cd7f32; border-color: #cd7f32; background: rgba(205,127,50,0.15); }

    .podium-avatar {
      width: 84px; height: 84px;
      border-radius: 22px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 22px rgba(0,0,0,0.5);
      border: 2px solid var(--border-default);
    }
    .podium-card.gold .podium-avatar { width: 100px; height: 100px; border-color: var(--gold); box-shadow: 0 0 30px rgba(232,184,75,0.4); }
    .podium-card.silver .podium-avatar { border-color: #c0c0d0; }
    .podium-card.bronze .podium-avatar { border-color: #cd7f32; }
    .avatar-text {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 32px;
      color: #fff;
    }
    .podium-card.gold .avatar-text { font-size: 38px; }
    .podium-avatar.gold-bg { background: linear-gradient(135deg, var(--gold), var(--accent)); }

    .podium-name {
      color: var(--text-primary); font-weight: 700; font-size: 14px;
      text-decoration: none;
    }
    .podium-name:hover { color: var(--accent); }

    .podium-stat {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 22px;
      background: linear-gradient(180deg, var(--gold), var(--accent));
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    }
    .podium-card.first .podium-stat { font-size: 28px; }
    .podium-meta { color: var(--text-muted); font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; }

    .bar {
      width: 100%; margin-top: 0.5rem;
      border-radius: 8px 8px 0 0;
    }
    .podium-card.silver .bar {
      height: 70px; background: linear-gradient(180deg, #c0c0d0, #5a5a6a);
    }
    .podium-card.gold .bar {
      height: 110px; background: linear-gradient(180deg, var(--gold), var(--accent));
      box-shadow: 0 -4px 20px rgba(232,184,75,0.3);
    }
    .podium-card.bronze .bar {
      height: 50px; background: linear-gradient(180deg, #cd7f32, #6b4218);
    }

    /* TABLA 4-10 */
    .list-card { padding: 0; overflow: hidden; }
    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .section-title { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 18px; color: var(--text-primary); }
    .section-meta { color: var(--text-muted); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600; }

    .rank-list { list-style: none; margin: 0; padding: 0; }
    .rank-row {
      display: grid;
      grid-template-columns: 60px 1fr auto auto;
      gap: 1rem;
      align-items: center;
      padding: 0.75rem 1.25rem;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      transition: var(--transition);
    }
    .rank-row.alt { background: var(--bg-elevated); }
    .rank-row:last-child { border-bottom: none; }
    .rank-row:hover { background: var(--bg-hover); }
    .rank-row.me {
      background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
      box-shadow: inset 3px 0 0 var(--accent);
    }
    .rank-row.me.extra {
      border-top: 2px solid var(--gold);
      background: color-mix(in srgb, var(--gold) 8%, var(--bg-surface));
      box-shadow: inset 3px 0 0 var(--gold);
    }

    .rank-num {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 28px;
      color: var(--text-muted);
      text-align: center;
    }
    .player-cell {
      display: flex; align-items: center; gap: 0.7rem;
      color: var(--text-primary); text-decoration: none;
      min-width: 0;
    }
    .player-cell:hover { color: var(--accent); }
    .mini-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      color: #fff; font-weight: 700; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .mini-avatar.gold-bg { background: linear-gradient(135deg, var(--gold), var(--accent)); }
    .player-name {
      font-weight: 600; font-size: 14px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .rank-stat {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 18px;
      color: var(--gold);
    }
    .rank-side {
      color: var(--text-muted); font-size: 12px;
      text-align: right;
    }
    @media (max-width: 640px) {
      .rank-row { grid-template-columns: 40px 1fr auto; }
      .rank-side { display: none; }
    }
  `],
})
export class LeaderboardComponent implements OnInit {
  tabs = TABS;
  active = signal<LeaderboardType>('earnings');
  results = signal<LeaderboardEntry[]>([]);
  loading = signal(true);

  podium = computed(() => {
    const r = this.results();
    return { first: r[0], second: r[1], third: r[2] };
  });
  rest = computed(() => this.results().slice(3));

  meRow = computed<LeaderboardEntry | null>(() => {
    const me = this.auth.user();
    if (!me) return null;
    return this.results().find((r) => r.user.id === me.id) || null;
  });
  meInTop = computed(() => {
    const me = this.meRow();
    return !!me && me.rank <= 10;
  });

  constructor(public auth: AuthService, private svc: LeaderboardService) {}

  ngOnInit() { this.load(); }

  switchTab(t: LeaderboardType) {
    if (t === this.active()) return;
    this.active.set(t);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getLeaderboard(this.active()).subscribe({
      next: (res) => { this.results.set(res.results); this.loading.set(false); },
      error: () => { this.results.set([]); this.loading.set(false); },
    });
  }

  isMe(r: LeaderboardEntry) { return r.user.id === this.auth.user()?.id; }
  initial(name?: string) { return (name?.charAt(0) || '?').toUpperCase(); }
  statHeader() {
    const t = this.active();
    if (t === 'earnings') return 'GANANCIAS';
    if (t === 'winrate') return 'WIN RATE';
    return 'PARTIDAS';
  }
  unitLabel() { return this.tabs.find((t) => t.id === this.active())?.unit || ''; }
  formatStat(value: number) {
    const t = this.active();
    if (t === 'winrate') return `${(value || 0).toFixed(2)}%`;
    if (t === 'games') return String(value);
    return Math.round(value).toLocaleString();
  }
}
