import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { BattleService } from '../../../services/battle.service';
import { SocketService } from '../../../services/socket.service';
import { SkinsService } from '../../../services/skins.service';
import { ToastService } from '../../../shared/services/toast.service';
import { Battle } from '../../../models/battle.model';
import { Skin } from '../../../models/skin.model';
import { SkinCardComponent } from '../../../shared/components/skin-card/skin-card.component';

const RARITY_VARS: Record<string, string> = {
  consumer: '--rarity-consumer',
  industrial: '--rarity-industrial',
  milspec: '--rarity-milspec',
  'mil-spec': '--rarity-milspec',
  restricted: '--rarity-restricted',
  classified: '--rarity-classified',
  covert: '--rarity-covert',
  contraband: '--rarity-contraband',
};

@Component({
  selector: 'app-coinflip-lobby',
  standalone: true,
  imports: [CommonModule, SkinCardComponent],
  template: `
    <main class="page">
      <header class="page-head">
        <div class="head-left">
          <div class="title-row">
            <span class="title-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7v10M9.5 9.5h3.5a2 2 0 010 4h-3a2 2 0 000 4h4"></path>
              </svg>
            </span>
            <h1 class="title">COINFLIP</h1>
          </div>
          <p class="subtitle">Apuesta una skin, lanza la moneda, gana las dos.</p>
        </div>
        <div class="head-right">
          <span class="status-pill">
            <span class="live-dot"></span>
            <span class="status-text">EN VIVO</span>
          </span>
          <button class="btn btn-primary" (click)="openCreate()">
            <span>+ CREAR BATALLA</span>
          </button>
        </div>
      </header>

      <section *ngIf="battles().length === 0" class="empty-state card">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v10"></path>
        </svg>
        <p>No hay batallas activas. Sé el primero.</p>
        <button class="btn btn-primary" (click)="openCreate()">Crear batalla</button>
      </section>

      <ul class="battle-list" *ngIf="battles().length > 0">
        <li
          *ngFor="let b of battles(); trackBy: trackById"
          class="battle-row"
          [style.--rarity]="rarityVar(b.skinA?.rarity)">
          <div class="b-creator">
            <div class="avatar">{{ initial(b.playerA?.username) }}</div>
            <div>
              <div class="username">{{ b.playerA?.username || '???' }}</div>
              <div class="time">{{ timeAgo(b.createdAt) }}</div>
            </div>
          </div>

          <div class="b-skin">
            <div class="skin-img">
              <img *ngIf="b.skinA?.imageUrl" [src]="b.skinA?.imageUrl" [alt]="b.skinA?.name" />
              <span *ngIf="!b.skinA?.imageUrl" class="fallback">?</span>
            </div>
            <div class="skin-meta">
              <span class="skin-name">{{ b.skinA?.name }}</span>
              <span class="skin-weapon">{{ b.skinA?.weapon }}</span>
              <span class="rarity-badge">{{ b.skinA?.rarity }}</span>
            </div>
          </div>

          <div class="b-action">
            <span class="b-price">{{ b.skinA?.price | number:'1.0-0' }}<small>coins</small></span>
            <button
              *ngIf="!isMine(b)"
              class="btn btn-primary"
              (click)="openJoin(b)">UNIRSE</button>
            <button
              *ngIf="isMine(b)"
              class="btn btn-ghost"
              (click)="goTo(b)">VER MI BATALLA</button>
          </div>
        </li>
      </ul>
    </main>

    <!-- MODAL CREAR -->
    <div class="modal-backdrop" *ngIf="showCreateModal" (click)="closeCreate()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h3>Crear batalla</h3>
          <button class="modal-x" (click)="closeCreate()" aria-label="Cerrar">×</button>
        </header>

        <div class="modal-body">
          <div class="modal-grid">
            <div class="modal-pane">
              <p class="hint">Selecciona la skin a apostar.</p>
              <div *ngIf="inventory().length === 0" class="empty-row">No tienes skins disponibles.</div>
              <div class="inv-grid">
                <app-skin-card
                  *ngFor="let s of inventory()"
                  [skin]="s"
                  [selected]="selectedSkin?.id === s.id"
                  (onSelect)="selectSkin($event)">
                </app-skin-card>
              </div>
            </div>
            <aside class="modal-side" *ngIf="selectedSkin">
              <span class="side-label">Apuestas</span>
              <div class="side-img">
                <img *ngIf="selectedSkin.imageUrl" [src]="selectedSkin.imageUrl" [alt]="selectedSkin.name" />
              </div>
              <h4>{{ selectedSkin.name }}</h4>
              <p class="side-weapon">{{ selectedSkin.weapon }}</p>
              <p class="side-price">{{ selectedSkin.price | number:'1.0-0' }} coins</p>
            </aside>
          </div>
        </div>

        <footer class="modal-foot">
          <button class="btn btn-ghost" (click)="closeCreate()">Cancelar</button>
          <button
            class="btn btn-primary"
            [disabled]="!selectedSkin || creating"
            (click)="confirmCreate()">
            {{ creating ? 'Creando...' : 'Crear batalla' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- MODAL UNIRSE -->
    <div class="modal-backdrop" *ngIf="showJoinModal && joinTarget" (click)="closeJoin()">
      <div class="modal wide" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h3>Unirse a batalla</h3>
          <button class="modal-x" (click)="closeJoin()" aria-label="Cerrar">×</button>
        </header>

        <div class="modal-body join-layout">
          <aside class="rival">
            <span class="side-label">Skin del rival</span>
            <div class="rival-img" [style.--rarity]="rarityVar(joinTarget.skinA?.rarity)">
              <img *ngIf="joinTarget.skinA?.imageUrl" [src]="joinTarget.skinA?.imageUrl" />
            </div>
            <h4>{{ joinTarget.skinA?.name }}</h4>
            <p class="side-weapon">{{ joinTarget.skinA?.weapon }}</p>
            <p class="side-price">{{ joinTarget.skinA?.price | number:'1.0-0' }} coins</p>
            <p class="rival-by">de <strong>{{ joinTarget.playerA?.username }}</strong></p>
          </aside>

          <div class="vs-divider">VS</div>

          <div class="modal-pane">
            <p class="hint">Tu apuesta</p>
            <div class="inv-grid">
              <app-skin-card
                *ngFor="let s of inventory()"
                [skin]="s"
                [selected]="selectedSkin?.id === s.id"
                (onSelect)="selectSkin($event)">
              </app-skin-card>
            </div>
          </div>
        </div>

        <footer class="modal-foot">
          <button class="btn btn-ghost" (click)="closeJoin()">Cancelar</button>
          <button
            class="btn btn-primary"
            [disabled]="!selectedSkin || joining"
            (click)="confirmJoin()">
            {{ joining ? 'Uniéndose...' : 'Lanzar moneda' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.4rem; }

    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .title-row { display: flex; align-items: center; gap: 0.7rem; }
    .title-icon {
      width: 44px; height: 44px;
      border-radius: var(--radius-md);
      background: var(--accent-muted);
      color: var(--accent);
      display: flex; align-items: center; justify-content: center;
    }
    .title-icon svg { width: 22px; height: 22px; }
    .title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 40px;
      letter-spacing: 0.06em;
      line-height: 1; margin: 0;
      color: var(--text-primary);
    }
    .subtitle { color: var(--text-secondary); margin: 0.3rem 0 0; font-size: 14px; }

    .head-right { display: flex; align-items: center; gap: 0.75rem; }
    .status-pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 0.4rem 0.85rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: 999px;
    }
    .status-text { font-size: 11px; letter-spacing: 0.15em; font-weight: 700; color: var(--green); }

    .empty-state { padding: 4rem 2rem; }
    .empty-state svg { width: 56px; height: 56px; }

    .battle-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
    .battle-row {
      --rarity: var(--text-muted);
      display: grid;
      grid-template-columns: 220px 1fr 220px;
      gap: 1.25rem;
      align-items: center;
      padding: 1rem 1.25rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      transition: var(--transition);
      position: relative;
      overflow: hidden;
    }
    .battle-row::before {
      content: '';
      position: absolute;
      left: 0; top: 0; bottom: 0;
      width: 3px;
      background: var(--rarity);
    }
    .battle-row:hover {
      transform: translateY(-2px);
      border-color: rgba(255,107,0,0.35);
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    @media (max-width: 720px) {
      .battle-row { grid-template-columns: 1fr; gap: 0.6rem; }
      .b-action { align-items: stretch; }
    }

    .b-creator { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
    .avatar {
      width: 40px; height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      color: #fff; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .username {
      font-weight: 600; color: var(--text-primary); font-size: 14px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .time { color: var(--text-muted); font-size: 11px; }

    .b-skin {
      display: grid;
      grid-template-columns: 88px 1fr;
      gap: 0.85rem;
      align-items: center;
      min-width: 0;
    }
    .skin-img {
      width: 88px; height: 80px;
      border-radius: var(--radius-sm);
      background: radial-gradient(circle, color-mix(in srgb, var(--rarity) 12%, transparent), transparent 75%);
      border: 1px solid var(--border-subtle);
      padding: 6px;
      display: flex; align-items: center; justify-content: center;
    }
    .skin-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .skin-img .fallback { color: var(--text-muted); opacity: 0.4; }
    .skin-meta { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .skin-name {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      color: var(--text-primary);
      font-size: 16px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .skin-weapon { color: var(--text-muted); font-size: 12px; }
    .rarity-badge {
      align-self: flex-start;
      margin-top: 4px;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--rarity);
      background: color-mix(in srgb, var(--rarity) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--rarity) 30%, transparent);
    }

    .b-action { display: flex; flex-direction: column; align-items: flex-end; gap: 0.55rem; }
    .b-price {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 22px;
      color: var(--gold);
      line-height: 1;
    }
    .b-price small {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 11px;
      color: var(--text-muted);
      margin-left: 4px;
    }

    /* MODAL */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(5, 5, 10, 0.65);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: 1rem;
      animation: backdrop-in 0.18s ease-out;
    }
    @keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }
    .modal {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      width: min(600px, 100%);
      max-height: 88vh;
      display: flex; flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
    }
    .modal.wide { width: min(880px, 100%); }
    .modal-head {
      padding: 1.1rem 1.4rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex; align-items: center; justify-content: space-between;
    }
    .modal-head h3 {
      font-family: 'Rajdhani', sans-serif;
      font-size: 22px; color: var(--text-primary); margin: 0;
    }
    .modal-x {
      background: transparent; border: none; color: var(--text-muted);
      font-size: 1.6rem; line-height: 1; cursor: pointer;
    }
    .modal-x:hover { color: var(--text-primary); }
    .modal-body { padding: 1.4rem; overflow-y: auto; flex: 1; }
    .modal-foot {
      padding: 1rem 1.4rem;
      border-top: 1px solid var(--border-subtle);
      display: flex; justify-content: flex-end; gap: 0.6rem;
    }

    .modal-grid { display: grid; grid-template-columns: 1fr 220px; gap: 1.4rem; }
    @media (max-width: 720px) {
      .modal-grid { grid-template-columns: 1fr; }
      .modal-side { order: -1; }
    }
    .hint { color: var(--text-secondary); font-size: 13px; margin: 0 0 0.7rem; }
    .empty-row { color: var(--text-muted); font-size: 13px; padding: 1rem 0; }
    .inv-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .modal-side {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex; flex-direction: column; gap: 6px;
      align-items: center; text-align: center;
      align-self: flex-start;
    }
    .side-label, .side-weapon, .side-price, .rival-by {
      font-size: 12px;
    }
    .side-label {
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .side-img {
      width: 100%; height: 110px;
      background: var(--bg-base);
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      padding: 6px;
    }
    .side-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .modal-side h4, .rival h4 {
      font-family: 'Rajdhani', sans-serif;
      color: var(--text-primary);
      margin: 0; font-size: 16px;
    }
    .side-weapon { color: var(--text-muted); }
    .side-price {
      font-family: 'Rajdhani', sans-serif;
      color: var(--gold);
      font-weight: 700; font-size: 16px;
    }

    /* Join layout */
    .join-layout { display: grid; grid-template-columns: 220px auto 1fr; gap: 1.4rem; align-items: stretch; }
    @media (max-width: 720px) { .join-layout { grid-template-columns: 1fr; } .vs-divider { justify-self: center; } }
    .rival {
      --rarity: var(--text-muted);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1rem;
      display: flex; flex-direction: column; gap: 6px;
      align-items: center; text-align: center;
    }
    .rival-img {
      width: 100%; height: 130px;
      background: radial-gradient(circle, color-mix(in srgb, var(--rarity) 12%, transparent), transparent 75%);
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      padding: 6px;
    }
    .rival-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .rival-by { color: var(--text-secondary); }
    .rival-by strong { color: var(--accent); }
    .vs-divider {
      align-self: center;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 26px;
      color: var(--accent);
      letter-spacing: 0.15em;
    }
  `],
})
export class CoinflipLobbyComponent implements OnInit, OnDestroy {
  battles = signal<Battle[]>([]);
  inventory = signal<Skin[]>([]);

  showCreateModal = false;
  showJoinModal = false;
  selectedSkin?: Skin;
  joinTarget?: Battle;
  creating = false;
  joining = false;

  private subs: Subscription[] = [];

  constructor(
    public auth: AuthService,
    private battleService: BattleService,
    private socket: SocketService,
    private skins: SkinsService,
    private router: Router,
    private toastSvc: ToastService,
  ) {}

  ngOnInit() {
    this.loadBattles();
    this.loadInventory();
    this.socket.joinLobby();

    this.subs.push(
      this.socket.onBattleCreated().subscribe((b) => {
        this.battles.update((list) => {
          const filtered = list.filter((x) => String(x.id) !== String(b.id));
          return [b, ...filtered].slice(0, 50);
        });
      }),
      this.socket.onBattleUpdated().subscribe((b) => {
        if (b.status !== 'waiting') {
          this.battles.update((list) => list.filter((x) => String(x.id) !== String(b.id)));
        } else {
          this.battles.update((list) => list.map((x) => (String(x.id) === String(b.id) ? b : x)));
        }
      }),
    );
  }

  ngOnDestroy() {
    this.socket.leaveLobby();
    this.subs.forEach((s) => s.unsubscribe());
  }

  loadBattles() {
    this.battleService.getBattles().subscribe((bs) => this.battles.set(bs));
  }

  loadInventory() {
    this.skins.getInventory().subscribe((s) => this.inventory.set(s));
  }

  openCreate() {
    if (this.inventory().length === 0) {
      this.toastSvc.error('No tienes skins para apostar');
      return;
    }
    this.selectedSkin = undefined;
    this.showCreateModal = true;
  }

  closeCreate() {
    this.showCreateModal = false;
    this.selectedSkin = undefined;
  }

  openJoin(battle: Battle) {
    if (this.inventory().length === 0) {
      this.toastSvc.error('No tienes skins para apostar');
      return;
    }
    this.joinTarget = battle;
    this.selectedSkin = undefined;
    this.showJoinModal = true;
  }

  closeJoin() {
    this.showJoinModal = false;
    this.selectedSkin = undefined;
    this.joinTarget = undefined;
  }

  selectSkin(s: Skin) {
    this.selectedSkin = this.selectedSkin?.id === s.id ? undefined : s;
  }

  confirmCreate() {
    if (!this.selectedSkin || this.creating) return;
    this.creating = true;
    this.battleService.createBattle(String(this.selectedSkin.id)).subscribe({
      next: (b) => {
        this.creating = false;
        this.closeCreate();
        this.router.navigate(['/coinflip', b.id]);
      },
      error: (err) => {
        this.creating = false;
        this.toastSvc.error(err?.error?.error || 'Error al crear batalla');
      },
    });
  }

  confirmJoin() {
    if (!this.selectedSkin || !this.joinTarget || this.joining) return;
    const id = String(this.joinTarget.id);
    this.joining = true;
    this.battleService.joinBattle(id, String(this.selectedSkin.id)).subscribe({
      next: () => {
        this.joining = false;
        this.closeJoin();
        this.router.navigate(['/coinflip', id]);
      },
      error: (err) => {
        this.joining = false;
        this.toastSvc.error(err?.error?.error || 'Error al unirse');
      },
    });
  }

  goTo(b: Battle) {
    this.router.navigate(['/coinflip', b.id]);
  }

  isMine(b: Battle): boolean {
    return String(b.playerAId) === String(this.auth.user()?.id);
  }

  trackById(_: number, b: Battle) {
    return b.id;
  }

  timeAgo(date: string) {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'hace unos segundos';
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `hace ${hours} h`;
  }

  initial(name?: string) {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  rarityVar(rarity?: string): string {
    if (!rarity) return 'var(--text-muted)';
    const key = rarity.toLowerCase().replace(/\s+/g, '');
    const v = RARITY_VARS[key];
    return v ? `var(${v})` : 'var(--text-muted)';
  }
}
