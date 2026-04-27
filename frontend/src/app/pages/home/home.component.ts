import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { BattleService } from '../../services/battle.service';
import { JackpotService } from '../../services/jackpot.service';
import { MarketService } from '../../services/market.service';
import { SocketService } from '../../services/socket.service';
import { Battle, BattleResolvedEvent } from '../../models/battle.model';
import { Jackpot } from '../../models/jackpot.model';
import { Listing } from '../../models/market.model';

type FeedKind = 'coinflip' | 'jackpot' | 'sale';

interface FeedItem {
  id: string;
  kind: FeedKind;
  username: string;
  description: string;
  amount: number;
  at: number;
  rivalImg?: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <h1 class="title">Lobby</h1>
          <p class="subtitle">Lo que está pasando en la arena ahora mismo.</p>
        </div>
        <div class="status">
          <span class="live-dot"></span>
          <span class="status-text">EN VIVO</span>
        </div>
      </header>

      <div class="grid">
        <!-- FEED de actividad -->
        <section class="card feed-card">
          <header class="section-header">
            <span class="section-title">
              Actividad reciente
            </span>
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

        <!-- Side column -->
        <aside class="side">
          <!-- Jackpot preview -->
          <section class="card jackpot-card">
            <header class="section-header">
              <span class="section-title">Jackpot actual</span>
              <a routerLink="/jackpot" class="link">Ver →</a>
            </header>

            <div *ngIf="jackpot() as jp; else noJackpot" class="jp-body">
              <div class="jp-pot">
                <span class="jp-pot-label">Pot</span>
                <span class="jp-pot-value">{{ jp.totalValue | number:'1.0-0' }}</span>
                <span class="jp-pot-unit">coins</span>
              </div>
              <div class="jp-meta">
                <div class="meta">
                  <span class="meta-label">Jugadores</span>
                  <span class="meta-value">{{ distinctPlayers(jp) }}</span>
                </div>
                <div class="meta">
                  <span class="meta-label">Skins</span>
                  <span class="meta-value">{{ jp.entries.length }}</span>
                </div>
              </div>
              <div class="jp-avatars" *ngIf="jp.entries.length > 0">
                <span class="jp-avatar" *ngFor="let p of distinctEntries(jp).slice(0, 6)"
                      [title]="p.user.username">
                  {{ initial(p.user.username) }}
                </span>
                <span class="jp-more" *ngIf="distinctEntries(jp).length > 6">
                  +{{ distinctEntries(jp).length - 6 }}
                </span>
              </div>
              <a routerLink="/jackpot" class="btn btn-primary jp-btn">UNIRSE AL POT</a>
            </div>

            <ng-template #noJackpot>
              <div class="empty-state">
                <p>Sin jackpot abierto.</p>
              </div>
            </ng-template>
          </section>

          <!-- Coinflip preview -->
          <section class="card battles-card">
            <header class="section-header">
              <span class="section-title">Batallas activas</span>
              <a routerLink="/coinflip" class="link">Ver todas →</a>
            </header>

            <div *ngIf="battles().length === 0" class="empty-state">
              <p>Sin batallas esperando. Crea una.</p>
            </div>

            <ul class="battles" *ngIf="battles().length > 0">
              <li *ngFor="let b of battles().slice(0, 3); trackBy: trackBattle" class="battle-row">
                <div class="b-img">
                  <img *ngIf="b.skinA?.imageUrl" [src]="b.skinA?.imageUrl" [alt]="b.skinA?.name" />
                </div>
                <div class="b-info">
                  <span class="b-name">{{ b.skinA?.name }}</span>
                  <span class="b-by">de <strong>{{ b.playerA?.username }}</strong></span>
                </div>
                <div class="b-meta">
                  <span class="b-price">{{ b.skinA?.price | number:'1.0-0' }}</span>
                  <a [routerLink]="['/coinflip', b.id]" class="btn btn-primary b-go">Unirse</a>
                </div>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  `,
  styles: [`
    .page { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }

    .page-head {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 1.5rem; flex-wrap: wrap;
    }
    .title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 32px;
      line-height: 1; margin: 0;
      color: var(--text-primary);
    }
    .subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }
    .status {
      display: flex; align-items: center; gap: 8px;
      padding: 0.45rem 0.8rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: 999px;
    }
    .status-text {
      font-size: 11px; letter-spacing: 0.15em; font-weight: 700;
      color: var(--green);
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 1.25rem;
      align-items: flex-start;
    }
    @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }

    .section-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 0.9rem;
    }
    .section-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
    }
    .section-meta { font-size: 12px; color: var(--text-muted); }
    .link {
      color: var(--accent); font-size: 12px; font-weight: 600;
      text-decoration: none;
    }
    .link:hover { color: var(--accent-hover); }

    .empty-state {
      padding: 1.4rem;
      color: var(--text-muted);
      text-align: center; font-size: 13px;
    }

    /* Feed */
    .feed { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .feed-row {
      display: grid;
      grid-template-columns: 36px 32px 1fr auto;
      gap: 0.75rem;
      align-items: center;
      padding: 0.6rem 0.75rem;
      border-radius: var(--radius-sm);
      background: transparent;
      transition: var(--transition);
      border: 1px solid transparent;
    }
    .feed-row:hover { background: var(--bg-hover); border-color: var(--border-subtle); }
    .row-icon {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-elevated);
      color: var(--text-secondary);
    }
    .row-icon svg { width: 18px; height: 18px; }
    .feed-row.kind-coinflip .row-icon { color: var(--accent); }
    .feed-row.kind-jackpot .row-icon { color: var(--gold); }
    .feed-row.kind-sale .row-icon { color: var(--blue); }

    .row-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      color: #fff; font-weight: 700; font-size: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .row-body { display: flex; flex-direction: column; min-width: 0; }
    .row-user { color: var(--text-primary); font-weight: 600; font-size: 13px; }
    .row-desc { color: var(--text-secondary); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .row-amount {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      color: var(--gold);
      font-size: 14px;
    }
    .row-amount small { color: var(--text-muted); font-family: 'Inter', sans-serif; font-weight: 500; font-size: 10px; margin-left: 2px; }
    .row-time { color: var(--text-muted); font-size: 11px; }

    /* Side */
    .side { display: flex; flex-direction: column; gap: 1.25rem; }

    /* Jackpot */
    .jp-body { display: flex; flex-direction: column; gap: 1rem; }
    .jp-pot {
      display: flex; flex-direction: column; align-items: center;
      padding: 1rem 0;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      background: radial-gradient(ellipse at center, rgba(255,107,0,0.1) 0%, transparent 70%);
    }
    .jp-pot-label { font-size: 11px; color: var(--text-muted); letter-spacing: 0.15em; text-transform: uppercase; }
    .jp-pot-value {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 36px;
      line-height: 1;
      background: linear-gradient(180deg, var(--gold) 0%, var(--accent) 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .jp-pot-unit { font-size: 12px; color: var(--text-muted); }

    .jp-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .meta {
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.55rem 0.7rem;
      display: flex; flex-direction: column; gap: 2px;
    }
    .meta-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); }
    .meta-value { font-family: 'Rajdhani', sans-serif; font-weight: 700; color: var(--text-primary); font-size: 18px; }

    .jp-avatars { display: flex; gap: 4px; flex-wrap: wrap; }
    .jp-avatar, .jp-more {
      width: 28px; height: 28px; border-radius: 50%;
      background: var(--bg-elevated); border: 1px solid var(--border-default);
      color: var(--text-secondary);
      font-weight: 700; font-size: 11px;
      display: flex; align-items: center; justify-content: center;
    }
    .jp-btn { width: 100%; justify-content: center; padding: 0.7rem; }

    /* Battles */
    .battles { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .battle-row {
      display: grid;
      grid-template-columns: 48px 1fr auto;
      gap: 0.6rem;
      align-items: center;
      padding: 0.5rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }
    .b-img {
      width: 48px; height: 48px;
      background: var(--bg-base);
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      padding: 4px;
    }
    .b-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .b-info { display: flex; flex-direction: column; min-width: 0; }
    .b-name { color: var(--text-primary); font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .b-by { color: var(--text-muted); font-size: 11px; }
    .b-by strong { color: var(--text-secondary); }
    .b-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
    .b-price { color: var(--gold); font-family: 'Rajdhani', sans-serif; font-weight: 700; }
    .b-go { padding: 0.3rem 0.7rem; font-size: 11px; }
  `],
})
export class HomeComponent implements OnInit, OnDestroy {
  battles = signal<Battle[]>([]);
  jackpot = signal<Jackpot | null>(null);
  feed = signal<FeedItem[]>([]);

  private subs: Subscription[] = [];
  private nextSyntheticId = 1;

  constructor(
    public auth: AuthService,
    private battleService: BattleService,
    private jackpotService: JackpotService,
    private marketService: MarketService,
    private socket: SocketService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadInitial();

    this.socket.joinLobby();
    this.socket.joinJackpot();
    this.socket.joinMarketplace();

    this.subs.push(
      this.socket.onBattleResolved().subscribe((ev) => this.pushBattleResolved(ev)),
      this.socket.onMarketSold().subscribe((l) => this.pushMarketSold(l)),
      this.socket.onJackpotResolved().subscribe((ev) => {
        this.pushFeed({
          id: 'jp_' + this.nextSyntheticId++,
          kind: 'jackpot',
          username: ev.winnerUsername,
          description: `Ganó el jackpot (${ev.entries.length} skins)`,
          amount: ev.totalValue,
          at: Date.now(),
        });
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

  private loadInitial() {
    forkJoin({
      battles: this.battleService.getBattles().pipe(catchError(() => of([] as Battle[]))),
      jackpot: this.jackpotService.getCurrentJackpot().pipe(catchError(() => of(null as Jackpot | null))),
      market: this.marketService.getListings({ sortBy: 'newest', limit: 10 }).pipe(
        catchError(() => of({ items: [] as Listing[], page: 1, limit: 10, total: 0, totalPages: 1 })),
      ),
    }).subscribe(({ battles, jackpot, market }) => {
      this.battles.set(battles);
      this.jackpot.set(jackpot);

      const initialFeed: FeedItem[] = [];
      // Sales recientes (active listings ordenados por más nuevos)
      for (const l of market.items.slice(0, 4)) {
        initialFeed.push({
          id: 'l_' + l.id,
          kind: 'sale',
          username: l.seller.username,
          description: `Listó ${l.skin.name}`,
          amount: l.price,
          at: new Date(l.createdAt).getTime(),
        });
      }
      // Battles más recientes (waiting)
      for (const b of battles.slice(0, 4)) {
        initialFeed.push({
          id: 'b_' + b.id,
          kind: 'coinflip',
          username: b.playerA?.username || '???',
          description: `Creó batalla con ${b.skinA?.name || 'una skin'}`,
          amount: b.skinA?.price || 0,
          at: new Date(b.createdAt).getTime(),
        });
      }
      // Si hay jackpot histórico, lo añadimos
      if (jackpot && jackpot.entries.length > 0) {
        const last = jackpot.entries[jackpot.entries.length - 1];
        initialFeed.push({
          id: 'jp_init_' + last.id,
          kind: 'jackpot',
          username: last.user.username,
          description: `Apostó ${last.skin.name} al pot`,
          amount: last.value,
          at: new Date(last.createdAt).getTime(),
        });
      }

      this.feed.set(initialFeed.sort((a, b) => b.at - a.at).slice(0, 12));
    });
  }

  private pushBattleResolved(ev: BattleResolvedEvent) {
    const winnerName = ev.winnerUsername;
    const wonValue = String(ev.winnerId) === String(ev.playerA?.id)
      ? ev.skinB?.price || 0
      : ev.skinA?.price || 0;
    this.pushFeed({
      id: 'br_' + this.nextSyntheticId++,
      kind: 'coinflip',
      username: winnerName,
      description: 'Ganó un coinflip 1v1',
      amount: wonValue,
      at: Date.now(),
    });
  }

  private pushMarketSold(l: Listing) {
    if (!l.buyer) return;
    this.pushFeed({
      id: 'ms_' + l.id,
      kind: 'sale',
      username: l.buyer.username,
      description: `Compró ${l.skin.name}`,
      amount: l.price,
      at: Date.now(),
    });
  }

  private pushFeed(item: FeedItem) {
    this.feed.update((arr) => [item, ...arr.filter((x) => x.id !== item.id)].slice(0, 12));
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
    if (mins < 1) return 'hace unos segundos';
    if (mins < 60) return `hace ${mins} min`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.floor(h / 24)} d`;
  }

  trackFeed(_: number, it: FeedItem) { return it.id; }
  trackBattle(_: number, b: Battle) { return b.id; }
}
