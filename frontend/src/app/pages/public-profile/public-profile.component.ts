import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { LeaderboardService } from '../../services/leaderboard.service';
import {
  PublicProfileBattle,
  PublicProfileResponse,
} from '../../models/leaderboard.model';

const RARITY_COLORS: Record<string, string> = {
  consumer: '#b0c3d9', industrial: '#5e98d9',
  milspec: '#4b69ff', 'mil-spec': '#4b69ff',
  restricted: '#8847ff', classified: '#d32ce6',
  covert: '#eb4b4b', contraband: '#e4ae39',
};

@Component({
  selector: 'app-public-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page" *ngIf="profile() as p; else loadingTpl">
      <header class="card hero">
        <div class="avatar-big">{{ initial(p.user.username) }}</div>
        <div class="hero-info">
          <h1 class="username">{{ p.user.username }}</h1>
          <span class="badge">NIVEL {{ level() }}</span>
          <p class="since">Miembro desde {{ p.user.createdAt | date:'longDate' }}</p>
        </div>
      </header>

      <section class="stats-grid">
        <div class="stat">
          <span class="label">Partidas</span>
          <span class="value">{{ p.stats.wins + p.stats.losses }}</span>
        </div>
        <div class="stat win">
          <span class="label">Victorias</span>
          <span class="value">{{ p.stats.wins }}</span>
        </div>
        <div class="stat">
          <span class="label">Win rate</span>
          <span class="value">{{ p.stats.winRate | number:'1.0-2' }}%</span>
        </div>
        <div class="stat gold">
          <span class="label">Ganancias totales</span>
          <span class="value">{{ p.stats.totalEarnings | number:'1.0-0' }} coins</span>
        </div>
      </section>

      <section class="card">
        <h2 class="section-h">Últimas batallas</h2>
        <p *ngIf="p.recentBattles.length === 0" class="empty">Sin batallas registradas.</p>
        <ul class="battle-list" *ngIf="p.recentBattles.length > 0">
          <li *ngFor="let b of p.recentBattles" class="battle-row"
              [class.win]="isWin(b)"
              [class.loss]="isLoss(b)"
              [class.pending]="b.status !== 'completed'">
            <span class="result-tag">
              {{ b.status !== 'completed' ? '...' : (isWin(b) ? 'WIN' : 'LOSS') }}
            </span>
            <span class="vs-text">
              vs <strong>{{ rivalName(b) }}</strong>
            </span>
            <span class="battle-date">{{ b.createdAt | date:'short' }}</span>
          </li>
        </ul>
      </section>

      <section class="card">
        <h2 class="section-h">Inventario público <span class="hint">({{ p.inventoryCount() }} skins · valor {{ p.stats.inventoryValue | number:'1.0-0' }} coins)</span></h2>
        <p *ngIf="p.inventory.length === 0" class="empty">Inventario vacío.</p>
        <div class="inv-grid" *ngIf="p.inventory.length > 0">
          <div *ngFor="let s of p.inventory" class="inv-card"
               [style.box-shadow]="'inset 0 -3px 0 ' + rarityColor(s.rarity)">
            <div class="inv-img">
              <img *ngIf="s.imageUrl" [src]="s.imageUrl" [alt]="s.name" />
              <span *ngIf="!s.imageUrl" class="fallback">?</span>
            </div>
            <span class="inv-name">{{ s.name }}</span>
            <span class="inv-meta">{{ s.weapon }}</span>
            <span class="inv-price">{{ s.price | number:'1.0-0' }} coins</span>
          </div>
        </div>
      </section>

      <a routerLink="/leaderboard" class="back">← Ver ranking</a>
    </main>

    <ng-template #loadingTpl>
      <main class="page center">
        <div *ngIf="loading()" class="loading">Cargando perfil...</div>
        <div *ngIf="!loading() && error()" class="empty">
          <p>{{ error() }}</p>
          <a routerLink="/leaderboard" class="back">← Volver al ranking</a>
        </div>
      </main>
    </ng-template>
  `,
  styles: [`
    :host { display: block; background: #0a0a0f; min-height: 100vh; color: #e0e0e0; }
    .page { max-width: 1100px; margin: 0 auto; padding: 2rem; display: flex; flex-direction: column; gap: 1.4rem; }
    .page.center { align-items: center; padding-top: 4rem; }
    .loading, .empty { color: #888; text-align: center; padding: 2rem; }

    .card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 14px;
      padding: 1.4rem 1.6rem;
    }
    .hero { display: flex; align-items: center; gap: 1.5rem; }
    .avatar-big {
      width: 96px; height: 96px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      color: #fff; font-size: 2.6rem; font-weight: 900;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 30px rgba(255,107,0,0.35);
    }
    .username {
      margin: 0; font-size: 2rem; font-weight: 800; letter-spacing: 0.04em;
      color: #e0e0e0;
    }
    .badge {
      display: inline-block; margin-top: 0.4rem;
      padding: 0.18rem 0.6rem; border-radius: 4px;
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em;
      background: rgba(255,215,0,0.15); color: #ffd700; border: 1px solid #ffd700;
    }
    .since { color: #666; font-size: 0.85rem; margin: 0.4rem 0 0; }

    .stats-grid {
      display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    }
    .stat {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: 0.3rem;
    }
    .stat.win { border-color: rgba(76,175,80,0.4); }
    .stat.gold .value { color: #ffd700; }
    .stat .label { color: #888; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; }
    .stat .value { color: #e0e0e0; font-size: 1.5rem; font-weight: 800; }

    .section-h { color: #e0e0e0; margin: 0 0 0.9rem; font-size: 1.05rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .section-h .hint { color: #666; font-size: 0.78rem; letter-spacing: 0.05em; text-transform: none; font-weight: 500; }

    .battle-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.55rem; }
    .battle-row {
      display: grid; grid-template-columns: 70px 1fr auto; gap: 0.8rem;
      align-items: center;
      background: #0a0a0f; border: 1px solid #2a2a35; border-radius: 8px;
      padding: 0.7rem 1rem;
    }
    .battle-row.win { border-left: 3px solid #4caf50; }
    .battle-row.loss { border-left: 3px solid #eb4b4b; }
    .battle-row.pending { border-left: 3px solid #888; }
    .result-tag {
      font-weight: 800; letter-spacing: 0.08em;
      padding: 0.2rem 0.55rem; border-radius: 4px;
      text-align: center; font-size: 0.78rem;
    }
    .battle-row.win .result-tag { color: #4caf50; background: rgba(76,175,80,0.12); }
    .battle-row.loss .result-tag { color: #eb4b4b; background: rgba(235,75,75,0.12); }
    .battle-row.pending .result-tag { color: #888; background: rgba(255,255,255,0.04); }
    .vs-text { color: #aaa; }
    .vs-text strong { color: #e0e0e0; }
    .battle-date { color: #666; font-size: 0.78rem; }

    .inv-grid {
      display: grid; gap: 0.8rem;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    }
    .inv-card {
      background: #0a0a0f; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 0.7rem; display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      transition: transform 0.15s;
    }
    .inv-card:hover { transform: translateY(-2px); }
    .inv-img {
      width: 100%; height: 80px; display: flex; align-items: center; justify-content: center;
      background: #16161a; border-radius: 6px; padding: 4px;
    }
    .inv-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .inv-img .fallback { color: #444; font-size: 1.6rem; }
    .inv-name { color: #e0e0e0; font-size: 0.85rem; text-align: center; line-height: 1.1; margin-top: 0.3rem; }
    .inv-meta { color: #888; font-size: 0.72rem; }
    .inv-price { color: #ffd700; font-weight: 700; font-size: 0.85rem; }

    .back {
      align-self: flex-start; color: #888; text-decoration: none;
      transition: color 0.15s;
    }
    .back:hover { color: #ff6b00; }
  `],
})
export class PublicProfileComponent implements OnInit, OnDestroy {
  profile = signal<(PublicProfileResponse & { inventoryCount: () => number }) | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  private sub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private svc: LeaderboardService,
  ) {}

  ngOnInit() {
    this.sub = this.route.paramMap.subscribe((p) => {
      const username = p.get('username');
      if (!username) {
        this.error.set('Usuario no especificado');
        this.loading.set(false);
        return;
      }
      this.load(username);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  load(username: string) {
    this.loading.set(true);
    this.error.set(null);
    this.svc.getPublicProfile(username).subscribe({
      next: (data) => {
        this.profile.set({
          ...data,
          inventoryCount: () => data.stats.inventoryCount,
        });
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se encontró ese jugador.');
        this.loading.set(false);
      },
    });
  }

  initial(name?: string) {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  level() {
    const p = this.profile();
    if (!p) return 1;
    const games = p.stats.wins + p.stats.losses;
    return Math.max(1, Math.floor(games / 5) + 1);
  }

  isWin(b: PublicProfileBattle) {
    if (b.status !== 'completed' || b.winnerId == null) return false;
    return b.winnerId === this.profile()?.user.id;
  }

  isLoss(b: PublicProfileBattle) {
    if (b.status !== 'completed' || b.winnerId == null) return false;
    return b.winnerId !== this.profile()?.user.id;
  }

  rivalName(b: PublicProfileBattle): string {
    const meId = this.profile()?.user.id;
    if (b.playerA?.id !== meId) return b.playerA?.username || '???';
    return b.playerB?.username || '— esperando rival —';
  }

  rarityColor(r: string) {
    const key = r.toLowerCase().replace(/\s+/g, '');
    return RARITY_COLORS[key] || '#888';
  }
}
