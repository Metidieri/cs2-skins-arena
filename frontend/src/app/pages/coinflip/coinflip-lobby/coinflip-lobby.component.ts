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
import { NavbarComponent } from '../../../shared/components/navbar/navbar.component';

const RARITY_COLORS: Record<string, string> = {
  consumer: '#b0c3d9',
  industrial: '#5e98d9',
  milspec: '#4b69ff',
  'mil-spec': '#4b69ff',
  restricted: '#8847ff',
  classified: '#d32ce6',
  covert: '#eb4b4b',
  contraband: '#e4ae39',
};

@Component({
  selector: 'app-coinflip-lobby',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar></app-navbar>

    <main class="page">
      <header class="hero">
        <div>
          <h1 class="title">COINFLIP</h1>
          <p class="subtitle">Apuesta una skin, lanza la moneda, gana las dos.</p>
        </div>
        <button class="cta" (click)="openCreate()">+ CREAR BATALLA</button>
      </header>

      <section class="battles">
        <div class="section-head">
          <h2>Batallas activas</h2>
          <span class="live-dot"></span>
          <span class="live-text">EN VIVO</span>
        </div>

        <div *ngIf="battles().length === 0" class="empty">
          <div class="empty-icon">⚔️</div>
          <p>No hay batallas activas.</p>
          <button class="cta secondary" (click)="openCreate()">Crear la primera</button>
        </div>

        <div class="battle-grid" *ngIf="battles().length > 0">
          <article
            *ngFor="let b of battles(); trackBy: trackById"
            class="battle-card">
            <div class="b-head">
              <div class="avatar">{{ initial(b.playerA?.username) }}</div>
              <div>
                <div class="username">{{ b.playerA?.username || '???' }}</div>
                <div class="time">{{ timeAgo(b.createdAt) }}</div>
              </div>
            </div>

            <div class="b-skin"
                 [style.box-shadow]="'inset 0 -3px 0 ' + rarityColor(b.skinA?.rarity)">
              <img *ngIf="b.skinA?.imageUrl" [src]="b.skinA?.imageUrl" [alt]="b.skinA?.name" />
              <span *ngIf="!b.skinA?.imageUrl" class="fallback">?</span>
              <span class="badge"
                    [style.color]="rarityColor(b.skinA?.rarity)"
                    [style.background]="rarityBg(b.skinA?.rarity)">
                {{ b.skinA?.rarity }}
              </span>
            </div>

            <h3 class="skin-name">{{ b.skinA?.name }}</h3>
            <p class="skin-meta">{{ b.skinA?.weapon }}</p>
            <p class="price">{{ b.skinA?.price | number:'1.0-0' }} COINS</p>

            <button
              *ngIf="!isMine(b)"
              class="join-btn"
              (click)="openJoin(b)">
              UNIRSE
            </button>
            <button
              *ngIf="isMine(b)"
              class="own-btn"
              (click)="goTo(b)">
              VER MI BATALLA
            </button>
          </article>
        </div>
      </section>
    </main>

    <!-- Modal Crear -->
    <div class="modal-backdrop" *ngIf="showCreateModal" (click)="closeCreate()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h3>Crear batalla</h3>
          <button class="x" (click)="closeCreate()">×</button>
        </header>
        <p class="hint">Selecciona la skin a apostar.</p>

        <div class="inv-grid">
          <button
            *ngFor="let s of inventory()"
            class="inv-tile"
            [class.selected]="selectedSkin?.id === s.id"
            [style.box-shadow]="selectedSkin?.id === s.id ? '0 0 0 2px #ff6b00' : 'none'"
            (click)="selectSkin(s)">
            <img *ngIf="s.imageUrl" [src]="s.imageUrl" [alt]="s.name" />
            <span *ngIf="!s.imageUrl" class="fallback">?</span>
            <span class="tile-name">{{ s.name }}</span>
            <span class="tile-price">{{ s.price | number:'1.0-0' }}</span>
          </button>
        </div>

        <div class="preview" *ngIf="selectedSkin">
          <span>Apostando:</span>
          <strong>{{ selectedSkin.name }}</strong>
          <span class="preview-price">{{ selectedSkin.price | number:'1.0-0' }} coins</span>
        </div>

        <div class="modal-actions">
          <button class="ghost" (click)="closeCreate()">Cancelar</button>
          <button class="cta" [disabled]="!selectedSkin || creating" (click)="confirmCreate()">
            {{ creating ? 'Creando...' : 'Crear batalla' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Unirse -->
    <div class="modal-backdrop" *ngIf="showJoinModal && joinTarget" (click)="closeJoin()">
      <div class="modal wide" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h3>Unirse a batalla</h3>
          <button class="x" (click)="closeJoin()">×</button>
        </header>

        <div class="join-layout">
          <div class="rival">
            <p class="rival-label">Skin del rival</p>
            <div class="rival-card"
                 [style.box-shadow]="'inset 0 -3px 0 ' + rarityColor(joinTarget.skinA?.rarity)">
              <img *ngIf="joinTarget.skinA?.imageUrl" [src]="joinTarget.skinA?.imageUrl" />
              <span *ngIf="!joinTarget.skinA?.imageUrl" class="fallback">?</span>
            </div>
            <p class="rival-name">{{ joinTarget.skinA?.name }}</p>
            <p class="rival-price">{{ joinTarget.skinA?.price | number:'1.0-0' }} coins</p>
            <p class="rival-by">de <strong>{{ joinTarget.playerA?.username }}</strong></p>
          </div>

          <div class="vs">VS</div>

          <div class="picker">
            <p class="picker-label">Tu apuesta</p>
            <div class="inv-grid small">
              <button
                *ngFor="let s of inventory()"
                class="inv-tile"
                [class.selected]="selectedSkin?.id === s.id"
                [style.box-shadow]="selectedSkin?.id === s.id ? '0 0 0 2px #ff6b00' : 'none'"
                (click)="selectSkin(s)">
                <img *ngIf="s.imageUrl" [src]="s.imageUrl" [alt]="s.name" />
                <span *ngIf="!s.imageUrl" class="fallback">?</span>
                <span class="tile-name">{{ s.name }}</span>
                <span class="tile-price">{{ s.price | number:'1.0-0' }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="ghost" (click)="closeJoin()">Cancelar</button>
          <button class="cta" [disabled]="!selectedSkin || joining" (click)="confirmJoin()">
            {{ joining ? 'Uniéndose...' : 'Confirmar y lanzar moneda' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div *ngIf="toast()" class="toast" [class.error]="toast()?.type === 'error'" [class.success]="toast()?.type === 'success'">
      {{ toast()?.message }}
    </div>
  `,
  styles: [`
    :host { display: block; background: #0a0a0f; min-height: 100vh; }
    .page { max-width: 1200px; margin: 0 auto; padding: 2rem; color: #e0e0e0; }
    .hero {
      display: flex; justify-content: space-between; align-items: center;
      padding: 2.5rem; margin-bottom: 2rem;
      background: linear-gradient(135deg, #16161a 0%, #1f1216 100%);
      border: 1px solid #2a2a35; border-radius: 16px;
      box-shadow: 0 0 40px rgba(255,107,0,0.08);
    }
    .title {
      font-size: 3rem; font-weight: 900; letter-spacing: 0.1em; margin: 0;
      background: linear-gradient(90deg, #ff6b00, #ffd700);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .subtitle { color: #888; margin: 0.4rem 0 0; }
    .cta {
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      color: #fff; border: none; padding: 0.95rem 1.6rem;
      border-radius: 10px; font-weight: 800; letter-spacing: 0.06em;
      cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 20px rgba(255,107,0,0.35);
    }
    .cta:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(255,107,0,0.5); }
    .cta:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
    .cta.secondary {
      background: transparent; color: #ff6b00; border: 1.5px solid #ff6b00;
      box-shadow: none;
    }
    .ghost {
      background: transparent; color: #aaa; border: 1px solid #2a2a35;
      padding: 0.85rem 1.4rem; border-radius: 10px; cursor: pointer;
      font-weight: 600;
    }
    .ghost:hover { color: #fff; border-color: #444; }

    .section-head {
      display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1.2rem;
    }
    .section-head h2 { color: #e0e0e0; margin: 0; }
    .live-dot {
      width: 9px; height: 9px; border-radius: 50%; background: #4caf50;
      box-shadow: 0 0 8px #4caf50;
      animation: pulse 1.4s infinite ease-in-out;
    }
    .live-text { color: #4caf50; font-size: 0.78rem; font-weight: 700; letter-spacing: 0.1em; }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

    .empty {
      text-align: center; padding: 4rem 2rem;
      background: #16161a; border: 1px dashed #2a2a35; border-radius: 14px;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 0.5rem; }
    .empty p { color: #888; margin-bottom: 1.2rem; }

    .battle-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.2rem;
    }
    .battle-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 14px;
      padding: 1.3rem; display: flex; flex-direction: column;
      transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
    }
    .battle-card:hover {
      transform: translateY(-3px); border-color: #ff6b00;
      box-shadow: 0 8px 28px rgba(0,0,0,0.5);
    }
    .b-head { display: flex; gap: 0.7rem; align-items: center; margin-bottom: 1rem; }
    .avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      color: #fff; font-weight: 700; display: flex;
      align-items: center; justify-content: center;
    }
    .username { color: #e0e0e0; font-weight: 600; font-size: 0.95rem; }
    .time { color: #666; font-size: 0.78rem; }

    .b-skin {
      position: relative; background: #0a0a0f; border-radius: 10px;
      padding: 1rem; min-height: 130px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 0.8rem;
    }
    .b-skin img { max-width: 90%; max-height: 110px; object-fit: contain; }
    .b-skin .fallback { color: #444; font-size: 2rem; }
    .badge {
      position: absolute; top: 8px; right: 8px;
      padding: 0.2rem 0.55rem; border-radius: 4px;
      font-size: 0.68rem; font-weight: 700; letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .skin-name { color: #e0e0e0; font-size: 0.98rem; margin: 0 0 0.2rem; }
    .skin-meta { color: #888; font-size: 0.82rem; margin: 0; }
    .price { color: #ff6b00; font-weight: 800; font-size: 1.05rem; margin: 0.6rem 0 1rem; }

    .join-btn, .own-btn {
      margin-top: auto; width: 100%; padding: 0.75rem;
      border: none; border-radius: 8px;
      font-weight: 800; letter-spacing: 0.1em; cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .join-btn {
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      box-shadow: 0 4px 14px rgba(255,107,0,0.3);
    }
    .join-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,107,0,0.45); }
    .own-btn { background: #2a2a35; color: #e0e0e0; }
    .own-btn:hover { background: #353545; }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.78);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; backdrop-filter: blur(4px);
      animation: fadein 0.18s ease-out;
    }
    @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
    .modal {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 14px;
      padding: 1.6rem; width: min(560px, 90vw);
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }
    .modal.wide { width: min(820px, 92vw); }
    .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
    .modal-head h3 { color: #e0e0e0; margin: 0; font-size: 1.3rem; }
    .x {
      background: transparent; border: none; color: #666; font-size: 1.6rem;
      cursor: pointer; line-height: 1; padding: 0;
    }
    .x:hover { color: #fff; }
    .hint { color: #888; margin: 0 0 1rem; font-size: 0.9rem; }

    .inv-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.7rem; margin-bottom: 1.2rem;
    }
    .inv-grid.small { grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); }
    .inv-tile {
      background: #0a0a0f; border: 1px solid #2a2a35; border-radius: 8px;
      padding: 0.7rem 0.5rem; cursor: pointer; color: #e0e0e0;
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      transition: transform 0.12s, border-color 0.12s;
    }
    .inv-tile:hover { transform: translateY(-2px); border-color: #ff6b00; }
    .inv-tile.selected { border-color: #ff6b00; background: #1a1410; }
    .inv-tile img { max-width: 100%; max-height: 70px; object-fit: contain; }
    .inv-tile .fallback { color: #444; font-size: 1.6rem; }
    .tile-name { font-size: 0.78rem; line-height: 1.1; text-align: center; }
    .tile-price { color: #ffd700; font-weight: 700; font-size: 0.82rem; }

    .preview {
      display: flex; align-items: center; gap: 0.6rem;
      padding: 0.85rem; background: #0a0a0f;
      border: 1px solid #2a2a35; border-radius: 8px; margin-bottom: 1rem;
    }
    .preview span { color: #888; font-size: 0.88rem; }
    .preview strong { color: #ff6b00; }
    .preview-price { color: #ffd700 !important; margin-left: auto; font-weight: 700; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 0.7rem; }

    .join-layout {
      display: grid; grid-template-columns: 1fr auto 1.4fr; gap: 1.2rem;
      align-items: stretch; margin-bottom: 1.2rem;
    }
    @media (max-width: 640px) {
      .join-layout { grid-template-columns: 1fr; }
      .vs { justify-self: center; }
    }
    .rival, .picker { background: #0a0a0f; border: 1px solid #2a2a35; border-radius: 10px; padding: 1rem; }
    .rival-label, .picker-label {
      color: #888; font-size: 0.8rem; margin: 0 0 0.6rem;
      letter-spacing: 0.06em; text-transform: uppercase;
    }
    .rival-card {
      background: #16161a; border-radius: 8px; padding: 0.8rem;
      min-height: 130px; display: flex; align-items: center; justify-content: center;
      margin-bottom: 0.6rem;
    }
    .rival-card img { max-width: 90%; max-height: 110px; object-fit: contain; }
    .rival-name { color: #e0e0e0; margin: 0; font-weight: 600; }
    .rival-price { color: #ffd700; font-weight: 700; margin: 0.2rem 0 0.4rem; }
    .rival-by { color: #888; font-size: 0.85rem; margin: 0; }
    .rival-by strong { color: #ff6b00; }
    .vs {
      align-self: center; font-weight: 900; font-size: 1.6rem;
      color: #ff6b00; letter-spacing: 0.1em;
    }

    /* Toast */
    .toast {
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
      padding: 0.9rem 1.4rem; border-radius: 10px;
      font-weight: 600; z-index: 200; animation: slideup 0.25s ease-out;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    .toast.error { background: #2b1414; color: #ff6b6b; border: 1px solid #ff4444; }
    .toast.success { background: #14241c; color: #6bff8f; border: 1px solid #4caf50; }
    @keyframes slideup {
      from { transform: translate(-50%, 20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `],
})
export class CoinflipLobbyComponent implements OnInit, OnDestroy {
  battles = signal<Battle[]>([]);
  inventory = signal<Skin[]>([]);
  toast = signal<{ type: 'error' | 'success'; message: string } | null>(null);

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
      this.showToast('error', 'No tienes skins para apostar');
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
      this.showToast('error', 'No tienes skins para apostar');
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
    this.selectedSkin = s;
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
        this.showToast('error', err?.error?.error || 'Error al crear batalla');
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
        this.showToast('error', err?.error?.error || 'Error al unirse');
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

  rarityColor(rarity?: string): string {
    if (!rarity) return '#888';
    const key = rarity.toLowerCase().replace(/\s+/g, '');
    return RARITY_COLORS[key] || '#888';
  }

  rarityBg(rarity?: string): string {
    return this.rarityColor(rarity) + '33';
  }

  showToast(type: 'error' | 'success', message: string) {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3500);
    if (type === 'error') this.toastSvc.error(message);
    else this.toastSvc.success(message);
  }
}
