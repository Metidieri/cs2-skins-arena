import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LeaderboardService } from '../../services/leaderboard.service';
import {
  LeaderboardEntry,
  LeaderboardType,
} from '../../models/leaderboard.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

const TABS: { id: LeaderboardType; label: string; unit: string }[] = [
  { id: 'earnings', label: 'Ganancias', unit: 'coins' },
  { id: 'winrate', label: 'Win Rate', unit: '%' },
  { id: 'games', label: 'Partidas', unit: 'games' },
];

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent],
  template: `
    <app-navbar></app-navbar>

    <main class="page">
      <header class="hero">
        <h1 class="title">RANKING</h1>
        <p class="subtitle">Los mejores jugadores de CS2 Skins Arena.</p>
      </header>

      <nav class="tabs">
        <button
          *ngFor="let t of tabs"
          class="tab"
          [class.active]="active() === t.id"
          (click)="switchTab(t.id)">
          {{ t.label }}
        </button>
      </nav>

      <div *ngIf="loading()" class="loading">Cargando ranking...</div>

      <ng-container *ngIf="!loading() && results().length > 0">
        <!-- PODIO -->
        <section class="podium" *ngIf="podium() as p">
          <article class="podium-card silver" *ngIf="p.second">
            <div class="rank-num">2</div>
            <div class="podium-avatar">{{ initial(p.second.user.username) }}</div>
            <a class="podium-name" [routerLink]="['/player', p.second.user.username]">
              {{ p.second.user.username }}
            </a>
            <div class="podium-stat">{{ formatStat(p.second.stat) }}</div>
            <div class="podium-meta">{{ unitLabel() }}</div>
            <div class="bar bar-silver"></div>
          </article>

          <article class="podium-card gold first" *ngIf="p.first">
            <div class="crown">👑</div>
            <div class="rank-num">1</div>
            <div class="podium-avatar gold-bg">{{ initial(p.first.user.username) }}</div>
            <a class="podium-name" [routerLink]="['/player', p.first.user.username]">
              {{ p.first.user.username }}
            </a>
            <div class="podium-stat">{{ formatStat(p.first.stat) }}</div>
            <div class="podium-meta">{{ unitLabel() }}</div>
            <div class="bar bar-gold"></div>
          </article>

          <article class="podium-card bronze" *ngIf="p.third">
            <div class="rank-num">3</div>
            <div class="podium-avatar">{{ initial(p.third.user.username) }}</div>
            <a class="podium-name" [routerLink]="['/player', p.third.user.username]">
              {{ p.third.user.username }}
            </a>
            <div class="podium-stat">{{ formatStat(p.third.stat) }}</div>
            <div class="podium-meta">{{ unitLabel() }}</div>
            <div class="bar bar-bronze"></div>
          </article>
        </section>

        <!-- TABLA 4-10 -->
        <section class="table-wrap" *ngIf="rest().length > 0 || meRow()">
          <table class="table">
            <thead>
              <tr>
                <th class="rank">#</th>
                <th>Jugador</th>
                <th class="num">{{ statHeader() }}</th>
                <th class="num">Partidas</th>
                <th class="num">Win rate</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of rest()" [class.me]="isMe(r)">
                <td class="rank">{{ r.rank }}</td>
                <td>
                  <a class="player-cell" [routerLink]="['/player', r.user.username]">
                    <span class="mini-avatar">{{ initial(r.user.username) }}</span>
                    <span class="player-name">{{ r.user.username }}</span>
                  </a>
                </td>
                <td class="num gold">{{ formatStat(r.stat) }}</td>
                <td class="num">{{ r.gamesPlayed }}</td>
                <td class="num">{{ r.winRate | number:'1.0-2' }}%</td>
              </tr>

              <tr *ngIf="meRow() && !meInTop()" class="me-extra">
                <td class="rank">{{ meRow()!.rank }}</td>
                <td>
                  <a class="player-cell" [routerLink]="['/player', meRow()!.user.username]">
                    <span class="mini-avatar mine">{{ initial(meRow()!.user.username) }}</span>
                    <span class="player-name">{{ meRow()!.user.username }} (tú)</span>
                  </a>
                </td>
                <td class="num gold">{{ formatStat(meRow()!.stat) }}</td>
                <td class="num">{{ meRow()!.gamesPlayed }}</td>
                <td class="num">{{ meRow()!.winRate | number:'1.0-2' }}%</td>
              </tr>
            </tbody>
          </table>
        </section>
      </ng-container>

      <div *ngIf="!loading() && results().length === 0" class="empty">
        Aún no hay jugadores en este ranking.
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; background: #0a0a0f; min-height: 100vh; color: #e0e0e0; }
    .page { max-width: 1100px; margin: 0 auto; padding: 2rem; }
    .hero { text-align: center; margin-bottom: 1.6rem; }
    .title {
      font-size: 2.6rem; font-weight: 900; letter-spacing: 0.12em; margin: 0;
      background: linear-gradient(90deg, #ff6b00, #ffd700);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .subtitle { color: #888; margin: 0.3rem 0 0; }

    .tabs {
      display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 2.4rem;
    }
    .tab {
      background: #16161a; border: 1px solid #2a2a35; color: #aaa;
      padding: 0.6rem 1.4rem; border-radius: 999px; cursor: pointer;
      font-weight: 700; letter-spacing: 0.06em; transition: all 0.15s;
    }
    .tab:hover { color: #fff; border-color: #444; }
    .tab.active {
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      border-color: transparent;
      box-shadow: 0 4px 16px rgba(255,107,0,0.35);
    }

    .loading, .empty { text-align: center; color: #888; padding: 3rem 0; }

    /* Podio */
    .podium {
      display: grid; grid-template-columns: 1fr 1.2fr 1fr;
      gap: 1.2rem; align-items: end;
      margin-bottom: 2.4rem;
    }
    @media (max-width: 720px) {
      .podium { grid-template-columns: 1fr; }
      .podium-card.first { order: -1; }
    }
    .podium-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 14px;
      padding: 1.4rem 1rem 0; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
      position: relative;
      transition: transform 0.2s;
    }
    .podium-card:hover { transform: translateY(-4px); }
    .podium-card.first { padding-top: 1.8rem; }
    .crown {
      position: absolute; top: -22px; font-size: 2.2rem;
      filter: drop-shadow(0 0 10px rgba(255,215,0,0.6));
    }
    .rank-num {
      width: 34px; height: 34px; border-radius: 50%;
      background: #0a0a0f; border: 1px solid #2a2a35; color: #888;
      display: flex; align-items: center; justify-content: center;
      font-weight: 900;
    }
    .podium-card.gold .rank-num { color: #ffd700; border-color: #ffd700; }
    .podium-card.silver .rank-num { color: #c0c0c0; border-color: #c0c0c0; }
    .podium-card.bronze .rank-num { color: #cd7f32; border-color: #cd7f32; }

    .podium-avatar {
      width: 78px; height: 78px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      color: #fff; font-size: 2rem; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 22px rgba(0,0,0,0.5);
    }
    .podium-card.first .podium-avatar {
      width: 96px; height: 96px; font-size: 2.4rem;
      background: linear-gradient(135deg, #ffd700, #ff6b00);
      box-shadow: 0 0 30px rgba(255,215,0,0.4);
    }
    .podium-name {
      color: #e0e0e0; font-weight: 700; text-decoration: none;
      transition: color 0.15s;
    }
    .podium-name:hover { color: #ff6b00; }
    .podium-stat {
      font-size: 1.4rem; font-weight: 900;
      background: linear-gradient(180deg, #ffd700, #ff6b00);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .podium-card.first .podium-stat { font-size: 1.7rem; }
    .podium-meta { color: #666; font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; }
    .bar {
      width: 100%; margin-top: 0.6rem;
      border-radius: 8px 8px 0 0;
    }
    .bar-silver { height: 70px; background: linear-gradient(180deg, #b8b8b8, #5a5a5a); }
    .bar-gold { height: 110px; background: linear-gradient(180deg, #ffd700, #ff6b00); box-shadow: 0 -4px 24px rgba(255,215,0,0.3); }
    .bar-bronze { height: 50px; background: linear-gradient(180deg, #cd7f32, #6b4218); }

    /* Tabla */
    .table-wrap {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 14px;
      overflow: hidden;
    }
    .table { width: 100%; border-collapse: collapse; }
    .table th {
      text-align: left; padding: 0.85rem 1rem;
      color: #666; font-size: 0.72rem; letter-spacing: 0.12em;
      border-bottom: 1px solid #2a2a35; font-weight: 600;
    }
    .table th.num { text-align: right; }
    .table td {
      padding: 0.75rem 1rem; border-bottom: 1px solid #1f1f2a;
      color: #ccc;
    }
    .table tbody tr:last-child td { border-bottom: none; }
    .table tr:hover td { background: rgba(255,107,0,0.04); }
    .table tr.me td { background: rgba(255,107,0,0.08); }
    .table tr.me-extra td { background: rgba(255,215,0,0.06); border-top: 2px solid #ffd700; }
    .rank { font-weight: 800; color: #888; width: 48px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .num.gold { color: #ffd700; font-weight: 700; }

    .player-cell {
      display: flex; align-items: center; gap: 0.6rem;
      color: #e0e0e0; text-decoration: none;
      transition: color 0.15s;
    }
    .player-cell:hover { color: #ff6b00; }
    .mini-avatar {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      color: #fff; font-weight: 700; font-size: 0.85rem;
      display: flex; align-items: center; justify-content: center;
    }
    .mini-avatar.mine {
      background: linear-gradient(135deg, #ffd700, #ff6b00);
    }
    .player-name { font-weight: 600; }
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

  ngOnInit() {
    this.load();
  }

  switchTab(t: LeaderboardType) {
    if (t === this.active()) return;
    this.active.set(t);
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getLeaderboard(this.active()).subscribe({
      next: (res) => {
        this.results.set(res.results);
        this.loading.set(false);
      },
      error: () => {
        this.results.set([]);
        this.loading.set(false);
      },
    });
  }

  isMe(r: LeaderboardEntry) {
    return r.user.id === this.auth.user()?.id;
  }

  initial(name?: string) {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  statHeader() {
    const t = this.active();
    if (t === 'earnings') return 'Ganancias';
    if (t === 'winrate') return 'Win rate';
    return 'Partidas';
  }

  unitLabel() {
    return this.tabs.find((t) => t.id === this.active())?.unit || '';
  }

  formatStat(value: number) {
    const t = this.active();
    if (t === 'winrate') return `${(value || 0).toFixed(2)}%`;
    if (t === 'games') return String(value);
    return Math.round(value).toLocaleString();
  }
}
