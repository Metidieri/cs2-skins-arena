import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { JackpotService } from '../../services/jackpot.service';
import { SocketService } from '../../services/socket.service';
import { SkinsService } from '../../services/skins.service';
import {
  Jackpot,
  JackpotEntry,
  JackpotResolvedEvent,
} from '../../models/jackpot.model';
import { Skin } from '../../models/skin.model';
import { ToastService } from '../../shared/services/toast.service';

const PLAYER_PALETTE = [
  '#ff6b00', '#6366f1', '#10b981', '#ec4899', '#facc15',
  '#22d3ee', '#a855f7', '#ef4444', '#84cc16', '#f97316',
];

interface ParticipantStat {
  userId: string;
  username: string;
  avatar?: string;
  value: number;
  percentage: number;
  color: string;
  skins: JackpotEntry['skin'][];
}

interface DonutSegment {
  color: string;
  dasharray: string;
  dashoffset: string;
}

const DONUT_RADIUS = 86;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

@Component({
  selector: 'app-jackpot',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <h1 class="title">JACKPOT</h1>
          <p class="subtitle">El que más apuesta tiene más probabilidad de ganar.</p>
        </div>
        <div class="status-pill">
          <span class="live-dot"></span>
          <span class="status-text">{{ statusLabel() }}</span>
        </div>
      </header>

      <div class="layout">
        <section class="main-col">
          <!-- DONUT POT -->
          <div class="card pot-card">
            <div class="donut-wrap">
              <svg class="donut" viewBox="0 0 200 200">
                <circle class="donut-track" cx="100" cy="100" r="86"></circle>
                <ng-container *ngIf="participants().length > 0; else placeholderRing">
                  <circle
                    *ngFor="let s of donutSegments()"
                    cx="100" cy="100" r="86"
                    fill="none"
                    [attr.stroke]="s.color"
                    stroke-width="14"
                    [attr.stroke-dasharray]="s.dasharray"
                    [attr.stroke-dashoffset]="s.dashoffset"
                    transform="rotate(-90 100 100)"
                    stroke-linecap="butt">
                  </circle>
                </ng-container>
                <ng-template #placeholderRing>
                  <circle cx="100" cy="100" r="86" fill="none" stroke="var(--border-default)" stroke-width="14"></circle>
                </ng-template>
              </svg>

              <div class="donut-center">
                <span class="pot-label">POT TOTAL</span>
                <span class="pot-value">{{ jackpot()?.totalValue | number:'1.0-0' }}</span>
                <span class="pot-coins">COINS</span>
              </div>

              <div *ngIf="participants().length >= 2 && timer() > 0" class="pot-timer"
                   [class.danger]="timer() <= 10">
                {{ timer() }}s
              </div>
            </div>

            <div class="pot-pills">
              <span class="pill"><span class="pill-label">Jugadores</span><span class="pill-value">{{ participants().length }}</span></span>
              <span class="pill"><span class="pill-label">Skins</span><span class="pill-value">{{ jackpot()?.entries?.length || 0 }}</span></span>
              <span class="pill gold" *ngIf="myStat() as me"><span class="pill-label">Tu chance</span><span class="pill-value">{{ me.percentage | number:'1.0-2' }}%</span></span>
            </div>
          </div>

          <!-- PARTICIPANTES -->
          <div class="card participants-card">
            <header class="section-header">
              <span class="section-title">Participantes</span>
              <span class="section-meta">{{ participants().length }}</span>
            </header>

            <div *ngIf="participants().length === 0" class="empty-row">Sé el primero en apostar.</div>

            <ul class="participants" *ngIf="participants().length > 0">
              <li *ngFor="let p of participants(); trackBy: trackByUserId" class="p-row">
                <div class="p-head">
                  <span class="p-avatar" [style.background]="p.color + '22'" [style.color]="p.color" [style.border-color]="p.color">
                    {{ initial(p.username) }}
                  </span>
                  <span class="p-name">{{ p.username }}</span>
                  <span class="p-pct" [style.color]="p.color">{{ p.percentage | number:'1.0-2' }}%</span>
                  <span class="p-value">{{ p.value | number:'1.0-0' }} <small>coins</small></span>
                </div>
                <div class="p-bar">
                  <div class="p-bar-fill"
                       [style.width.%]="p.percentage"
                       [style.background]="p.color"></div>
                </div>
                <div class="p-skins">
                  <div *ngFor="let s of p.skins" class="p-skin"
                       [title]="s.name + ' — ' + s.price + ' coins'">
                    <img *ngIf="s.imageUrl" [src]="s.imageUrl" [alt]="s.name" />
                    <span *ngIf="!s.imageUrl" class="fallback">?</span>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <!-- SIDEBAR APOSTAR -->
        <aside class="bet-sidebar">
          <div class="card bet-card">
            <header class="section-header">
              <span class="section-title">Apostar skin</span>
            </header>
            <p class="hint">Elige una skin de tu inventario y entra al pot.</p>

            <div *ngIf="inventory().length === 0" class="empty-row">No tienes skins disponibles.</div>

            <div class="inv-grid">
              <button
                *ngFor="let s of inventory()"
                class="inv-tile"
                [class.selected]="selectedSkin?.id === s.id"
                [disabled]="resolving()"
                (click)="selectSkin(s)">
                <div class="inv-img">
                  <img *ngIf="s.imageUrl" [src]="s.imageUrl" [alt]="s.name" />
                  <span *ngIf="!s.imageUrl" class="fallback">?</span>
                </div>
                <span class="inv-name">{{ s.name }}</span>
                <span class="inv-price">{{ s.price | number:'1.0-0' }}</span>
              </button>
            </div>

            <div *ngIf="selectedSkin" class="selected-preview">
              <span class="selected-label">Seleccionada</span>
              <strong>{{ selectedSkin.name }}</strong>
              <span class="selected-price">{{ selectedSkin.price | number:'1.0-0' }} coins</span>
            </div>

            <button
              class="btn btn-primary bet-btn"
              [disabled]="!selectedSkin || betting() || resolving()"
              (click)="confirmBet()">
              {{ betting() ? 'APOSTANDO...' : 'APOSTAR SKIN' }}
            </button>
          </div>
        </aside>
      </div>

      <!-- HISTORIAL -->
      <section class="history">
        <header class="section-header">
          <span class="section-title">Últimos jackpots</span>
        </header>
        <div *ngIf="history().length === 0" class="empty-row">Aún no hay jackpots resueltos.</div>
        <div class="history-grid" *ngIf="history().length > 0">
          <div *ngFor="let h of history()" class="card history-card">
            <div class="h-head">
              <div class="h-avatar">{{ initial(h.winner?.username) }}</div>
              <div class="h-info">
                <span class="h-winner">{{ h.winner?.username || 'N/A' }}</span>
                <span class="h-date">{{ h.resolvedAt | date:'short' }}</span>
              </div>
            </div>
            <div class="h-stats">
              <div class="h-stat"><span>POT</span><strong>{{ h.totalValue | number:'1.0-0' }}</strong></div>
              <div class="h-stat"><span>JUGADORES</span><strong>{{ distinctPlayersOf(h) }}</strong></div>
              <div class="h-stat"><span>SKINS</span><strong>{{ h.entries.length }}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- OVERLAY DE RESOLVE -->
    <div *ngIf="overlay() as ov" class="overlay" [class.spinning]="!ov.revealed" [class.revealed]="ov.revealed">
      <div class="overlay-inner">
        <div class="roulette-wrap">
          <div class="roulette-pointer">▼</div>
          <div class="roulette"
               [style.background]="ov.gradient"
               [style.transform]="'rotate(' + ov.rotation + 'deg)'">
          </div>
          <div class="roulette-center">
            <span>JACKPOT</span>
            <strong>{{ ov.totalValue | number:'1.0-0' }}</strong>
          </div>
        </div>

        <div *ngIf="ov.revealed" class="reveal">
          <div class="confetti" aria-hidden="true">
            <span *ngFor="let i of confettiArr" [style.left.%]="i.left" [style.background]="i.color"
                  [style.animation-delay.s]="i.delay"></span>
          </div>
          <div class="winner-avatar" [style.background]="ov.winnerColor + '22'" [style.color]="ov.winnerColor" [style.border-color]="ov.winnerColor">
            {{ initial(ov.winnerUsername) }}
          </div>
          <h2 class="winner-name">{{ ov.winnerUsername }}</h2>
          <p class="winner-tag">HA GANADO EL JACKPOT</p>
          <p class="winner-amount">{{ ov.totalValue | number:'1.0-0' }} coins · {{ ov.entries.length }} skins</p>

          <div class="won-skins">
            <div *ngFor="let e of ov.entries" class="won-skin" [title]="e.skin.name">
              <img *ngIf="e.skin.imageUrl" [src]="e.skin.imageUrl" />
              <span *ngIf="!e.skin.imageUrl" class="fallback">?</span>
            </div>
          </div>

          <div class="seed-row">
            <span>SEED:</span>
            <code>{{ ov.seed }}</code>
          </div>

          <button class="btn btn-primary" (click)="dismissOverlay()">NUEVO JACKPOT</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1280px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.4rem; }

    .page-head {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 1rem; flex-wrap: wrap;
    }
    .title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 40px;
      letter-spacing: 0.06em; line-height: 1; margin: 0;
      color: var(--text-primary);
    }
    .subtitle { color: var(--text-secondary); margin: 0.3rem 0 0; font-size: 14px; }

    .status-pill {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 0.4rem 0.85rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: 999px;
    }
    .status-text { font-size: 11px; letter-spacing: 0.15em; font-weight: 700; color: var(--green); }

    .layout {
      display: grid;
      grid-template-columns: 1fr 360px;
      gap: 1.25rem;
      align-items: flex-start;
    }
    @media (max-width: 1080px) { .layout { grid-template-columns: 1fr; } }
    .main-col { display: flex; flex-direction: column; gap: 1.25rem; }

    /* POT donut */
    .pot-card {
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
      padding: 2rem 1.5rem;
      background: linear-gradient(180deg, var(--bg-surface), var(--bg-elevated));
    }
    .donut-wrap { position: relative; width: 240px; height: 240px; }
    .donut {
      width: 100%; height: 100%;
      filter: drop-shadow(0 0 20px rgba(255,107,0,0.2));
    }
    .donut-track {
      fill: none; stroke: var(--border-default); stroke-width: 14;
    }
    .donut-center {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 2px;
    }
    .pot-label { color: var(--text-muted); font-size: 10px; letter-spacing: 0.2em; }
    .pot-value {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 42px; line-height: 1;
      background: linear-gradient(180deg, var(--gold), var(--accent));
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    }
    .pot-coins { color: var(--accent); font-weight: 700; letter-spacing: 0.15em; font-size: 11px; }
    .pot-timer {
      position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
      background: var(--bg-elevated); border: 1.5px solid var(--accent);
      color: var(--accent);
      padding: 0.35rem 0.9rem; border-radius: 999px;
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 14px; letter-spacing: 0.05em;
    }
    .pot-timer.danger {
      border-color: var(--red); color: var(--red);
      animation: timer-pulse 0.6s infinite alternate;
    }
    @keyframes timer-pulse { from { transform: translateX(-50%) scale(1); } to { transform: translateX(-50%) scale(1.08); } }

    .pot-pills { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center; margin-top: 0.7rem; }
    .pill {
      display: inline-flex; flex-direction: column; align-items: center;
      padding: 0.4rem 1rem; gap: 2px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: 999px;
    }
    .pill-label { color: var(--text-muted); font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; }
    .pill-value { color: var(--text-primary); font-family: 'Rajdhani', sans-serif; font-weight: 700; }
    .pill.gold .pill-value { color: var(--gold); }

    /* Participants */
    .participants-card { display: flex; flex-direction: column; gap: 0.75rem; }
    .section-header { display: flex; align-items: center; justify-content: space-between; }
    .section-title {
      font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700; color: var(--text-primary);
    }
    .section-meta { color: var(--text-muted); font-size: 12px; }
    .empty-row { color: var(--text-muted); padding: 0.75rem 0; font-size: 13px; }

    .participants { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
    .p-row {
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
    }
    .p-head {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      gap: 0.7rem; align-items: center;
      margin-bottom: 0.55rem;
    }
    .p-avatar {
      width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 13px;
    }
    .p-name { color: var(--text-primary); font-weight: 600; font-size: 13px; }
    .p-pct { font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 16px; }
    .p-value { color: var(--gold); font-weight: 700; font-size: 13px; }
    .p-value small { color: var(--text-muted); font-weight: 500; font-size: 11px; margin-left: 2px; }
    .p-bar {
      height: 6px; background: var(--bg-base);
      border-radius: 999px; overflow: hidden; margin-bottom: 0.5rem;
    }
    .p-bar-fill { height: 100%; transition: width 0.4s ease; }
    .p-skins { display: flex; gap: 4px; flex-wrap: wrap; }
    .p-skin {
      width: 28px; height: 28px;
      border-radius: 6px; padding: 2px;
      background: var(--bg-base); border: 1px solid var(--border-subtle);
      display: flex; align-items: center; justify-content: center;
    }
    .p-skin img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .p-skin .fallback { color: var(--text-muted); font-size: 10px; }

    /* Bet sidebar */
    .bet-sidebar { position: sticky; top: 1.5rem; }
    .bet-card { display: flex; flex-direction: column; gap: 0.75rem; }
    .hint { color: var(--text-secondary); font-size: 13px; margin: 0; }
    .inv-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      max-height: 360px; overflow-y: auto;
    }
    .inv-tile {
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.6rem;
      cursor: pointer;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      transition: var(--transition);
      color: var(--text-primary);
    }
    .inv-tile:hover:not(:disabled) { border-color: var(--accent); transform: translateY(-2px); }
    .inv-tile.selected { border-color: var(--accent); background: var(--accent-muted); box-shadow: 0 0 0 1px var(--accent); }
    .inv-tile:disabled { opacity: 0.4; cursor: not-allowed; }
    .inv-img { width: 100%; height: 56px; display: flex; align-items: center; justify-content: center; }
    .inv-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .inv-img .fallback { color: var(--text-muted); }
    .inv-name { font-size: 11px; line-height: 1.1; text-align: center; color: var(--text-secondary); }
    .inv-price { color: var(--gold); font-weight: 700; font-size: 12px; }

    .selected-preview {
      display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
      padding: 0.7rem 0.85rem;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      font-size: 13px;
    }
    .selected-label { color: var(--text-muted); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
    .selected-preview strong { color: var(--text-primary); }
    .selected-price { color: var(--gold); font-weight: 700; margin-left: auto; }

    .bet-btn {
      width: 100%; justify-content: center;
      padding: 0.85rem;
      font-family: 'Rajdhani', sans-serif; font-size: 15px;
    }

    /* Historial */
    .history-grid {
      display: grid; gap: 0.75rem;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
    .history-card { display: flex; flex-direction: column; gap: 0.7rem; }
    .h-head { display: flex; align-items: center; gap: 0.55rem; }
    .h-avatar {
      width: 36px; height: 36px; border-radius: 10px;
      background: linear-gradient(135deg, var(--gold), var(--accent));
      color: #1a1410; font-weight: 800; font-size: 13px;
      display: flex; align-items: center; justify-content: center;
    }
    .h-info { display: flex; flex-direction: column; }
    .h-winner { color: var(--text-primary); font-weight: 600; font-size: 13px; }
    .h-date { color: var(--text-muted); font-size: 11px; }
    .h-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
    .h-stat { display: flex; flex-direction: column; gap: 2px; }
    .h-stat span { color: var(--text-muted); font-size: 10px; letter-spacing: 0.1em; }
    .h-stat strong { color: var(--gold); font-family: 'Rajdhani', sans-serif; font-weight: 700; font-size: 16px; }

    /* Overlay & roulette (idéntico al previo, ajustado a tokens) */
    .overlay {
      position: fixed; inset: 0;
      background: rgba(5,5,10,0.92);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 300; padding: 1rem;
    }
    .overlay-inner {
      width: min(560px, 100%); text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 1.2rem;
      max-height: 92vh; overflow-y: auto;
    }
    .roulette-wrap { position: relative; width: 320px; height: 320px; display: flex; align-items: center; justify-content: center; }
    .roulette-pointer {
      position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
      color: var(--accent); font-size: 1.8rem; z-index: 3;
      filter: drop-shadow(0 0 8px rgba(255,107,0,0.7));
    }
    .roulette {
      width: 100%; height: 100%; border-radius: 50%;
      transition: transform 5s cubic-bezier(0.18, 0.85, 0.18, 1);
      box-shadow: 0 0 40px rgba(255,107,0,0.3), inset 0 0 0 4px var(--bg-surface);
    }
    .roulette-center {
      position: absolute; width: 130px; height: 130px;
      border-radius: 50%; background: var(--bg-base);
      border: 3px solid var(--accent);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 0 18px rgba(255,107,0,0.5);
    }
    .roulette-center span { color: var(--text-muted); font-size: 11px; letter-spacing: 0.15em; }
    .roulette-center strong {
      font-family: 'Rajdhani', sans-serif;
      font-size: 22px; line-height: 1;
      background: linear-gradient(180deg, var(--gold), var(--accent));
      -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    }
    .reveal { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; position: relative; }
    .winner-avatar {
      width: 110px; height: 110px; border-radius: 24px;
      display: flex; align-items: center; justify-content: center;
      font-size: 3rem; font-weight: 900;
      border: 2px solid;
      animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
    .winner-name { font-family: 'Rajdhani', sans-serif; font-size: 24px; margin: 0; color: var(--text-primary); }
    .winner-tag { color: var(--gold); letter-spacing: 0.18em; font-weight: 800; margin: 0; }
    .winner-amount { color: var(--accent); font-weight: 700; margin: 0; }
    .won-skins { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; max-width: 480px; }
    .won-skin {
      width: 50px; height: 50px;
      background: var(--bg-elevated); border: 1px solid var(--border-subtle);
      border-radius: 8px; padding: 4px;
      display: flex; align-items: center; justify-content: center;
    }
    .won-skin img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .seed-row {
      display: inline-flex; gap: 0.4rem; align-items: center;
      background: var(--bg-elevated); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.4rem 0.7rem;
      max-width: 100%; flex-wrap: wrap;
    }
    .seed-row span { color: var(--text-muted); font-size: 10px; letter-spacing: 0.1em; }
    .seed-row code { color: var(--text-secondary); font-size: 11px; font-family: monospace; word-break: break-all; }

    .confetti { position: absolute; inset: -40px 0 0 0; pointer-events: none; overflow: visible; }
    .confetti span {
      position: absolute; top: -10px;
      width: 8px; height: 14px; border-radius: 2px;
      animation: confettiFall 2.4s ease-in forwards; opacity: 0;
    }
    @keyframes confettiFall {
      0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
      100% { transform: translateY(360px) rotate(720deg); opacity: 0; }
    }
  `],
})
export class JackpotComponent implements OnInit, OnDestroy {
  jackpot = signal<Jackpot | null>(null);
  inventory = signal<Skin[]>([]);
  history = signal<Jackpot[]>([]);
  timer = signal(0);
  resolving = signal(false);
  betting = signal(false);

  selectedSkin?: Skin;

  overlay = signal<{
    revealed: boolean;
    rotation: number;
    gradient: string;
    seed: string;
    totalValue: number;
    entries: JackpotEntry[];
    winnerUsername: string;
    winnerColor: string;
  } | null>(null);

  confettiArr = Array.from({ length: 30 }, () => ({
    left: Math.random() * 100,
    color: PLAYER_PALETTE[Math.floor(Math.random() * PLAYER_PALETTE.length)],
    delay: Math.random() * 0.6,
  }));

  participants = computed<ParticipantStat[]>(() => {
    const j = this.jackpot();
    if (!j || !j.entries) return [];
    const total = j.totalValue || 1;
    const map = new Map<string, ParticipantStat>();
    for (const e of j.entries) {
      const id = String(e.userId);
      if (!map.has(id)) {
        map.set(id, {
          userId: id,
          username: e.user?.username || 'Anon',
          avatar: e.user?.avatar,
          value: 0,
          percentage: 0,
          color: this.colorFor(id),
          skins: [],
        });
      }
      const p = map.get(id)!;
      p.value += e.value;
      p.skins.push(e.skin);
    }
    for (const p of map.values()) {
      p.percentage = total > 0 ? (p.value / total) * 100 : 0;
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  });

  myStat = computed<ParticipantStat | undefined>(() => {
    const me = this.auth.user();
    if (!me) return undefined;
    return this.participants().find((p) => p.userId === String(me.id));
  });

  donutSegments = computed<DonutSegment[]>(() => {
    const stats = this.participants();
    if (stats.length === 0) return [];
    const C = DONUT_CIRCUMFERENCE;
    let acc = 0;
    return stats.map((p) => {
      const len = (p.percentage / 100) * C;
      const seg: DonutSegment = {
        color: p.color,
        dasharray: `${len} ${C - len}`,
        dashoffset: `${-acc}`,
      };
      acc += len;
      return seg;
    });
  });

  statusLabel = computed(() => {
    if (this.resolving()) return 'RESOLVIENDO';
    if (this.participants().length >= 2 && this.timer() > 0) return `EN ${this.timer()}s`;
    return 'EN VIVO';
  });

  private subs: Subscription[] = [];
  private colorMap = new Map<string, string>();

  constructor(
    public auth: AuthService,
    private jackpotSvc: JackpotService,
    private socket: SocketService,
    private skinsSvc: SkinsService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit() {
    this.loadCurrent();
    this.loadInventory();
    this.loadHistory();
    this.socket.joinJackpot();

    this.subs.push(
      this.socket.onJackpotEntry().subscribe((entry) => this.applyEntry(entry)),
      this.socket.onJackpotTimer().subscribe((seconds) => this.timer.set(seconds)),
      this.socket.onJackpotResolved().subscribe((ev) => this.handleResolved(ev)),
      this.socket.onJackpotNew().subscribe(() => {
        this.loadCurrent();
        this.timer.set(0);
      }),
    );
  }

  ngOnDestroy() {
    this.socket.leaveJackpot();
    this.subs.forEach((s) => s.unsubscribe());
  }

  loadCurrent() {
    this.jackpotSvc.getCurrentJackpot().subscribe((j) => {
      this.jackpot.set(this.normalize(j));
      this.resolving.set(false);
    });
  }
  loadInventory() {
    this.skinsSvc.getInventory().subscribe((skins) => this.inventory.set(skins));
  }
  loadHistory() {
    this.jackpotSvc.getHistory().subscribe((h) => {
      this.history.set(h.slice(0, 5).map((j) => this.normalize(j)));
    });
  }

  applyEntry(entry: JackpotEntry) {
    const current = this.jackpot();
    if (!current || String(current.id) !== String(entry.jackpotId)) {
      this.loadCurrent();
      return;
    }
    if (current.entries.some((e) => e.id === entry.id)) return;
    const newEntries = [...current.entries, entry];
    const newTotal = newEntries.reduce((s, e) => s + e.value, 0);
    this.jackpot.set({ ...current, entries: newEntries, totalValue: newTotal });
  }

  selectSkin(s: Skin) {
    if (this.resolving()) return;
    this.selectedSkin = this.selectedSkin?.id === s.id ? undefined : s;
  }

  confirmBet() {
    if (!this.selectedSkin || this.betting() || this.resolving()) return;
    const skin = this.selectedSkin;
    this.betting.set(true);
    this.jackpotSvc.addEntry(String(skin.id)).subscribe({
      next: () => {
        this.betting.set(false);
        this.selectedSkin = undefined;
        this.inventory.update((arr) => arr.filter((s) => s.id !== skin.id));
        this.toastSvc.info('Apuesta enviada al pot');
      },
      error: (err) => {
        this.betting.set(false);
        this.toastSvc.error(err?.error?.error || 'Error al apostar');
      },
    });
  }

  handleResolved(ev: JackpotResolvedEvent) {
    this.resolving.set(true);
    const stats = this.computeStatsFromEntries(ev.entries, ev.totalValue);
    const gradient = this.buildConicGradient(stats);
    const winnerStat = stats.find((p) => p.userId === String(ev.winnerId));
    const winnerColor = winnerStat?.color || '#ff6b00';
    const winnerCenterAngle = this.winnerCenterAngle(stats, String(ev.winnerId));
    const baseRotation = 360 * 6 + (360 - winnerCenterAngle);

    this.overlay.set({
      revealed: false, rotation: 0, gradient,
      seed: ev.seed, totalValue: ev.totalValue, entries: ev.entries,
      winnerUsername: ev.winnerUsername, winnerColor,
    });

    setTimeout(() => this.overlay.update((o) => (o ? { ...o, rotation: baseRotation } : o)), 100);
    setTimeout(() => {
      this.overlay.update((o) => (o ? { ...o, revealed: true } : o));
      this.loadHistory();
      this.loadInventory();
    }, 5300);
  }

  dismissOverlay() {
    this.overlay.set(null);
    this.resolving.set(false);
    this.loadCurrent();
    this.loadInventory();
  }

  trackByUserId(_: number, p: ParticipantStat) { return p.userId; }
  initial(name?: string) { return (name?.charAt(0) || '?').toUpperCase(); }
  distinctPlayersOf(j: Jackpot) { return new Set(j.entries.map((e) => String(e.userId))).size; }

  private normalize(j: Jackpot): Jackpot {
    return {
      ...j,
      entries: (j.entries || []).map((e) => ({
        ...e,
        userId: String(e.userId),
        skinId: String(e.skinId),
        jackpotId: String(e.jackpotId),
        user: e.user ? { ...e.user, id: String(e.user.id) } : e.user,
        skin: e.skin ? { ...e.skin, id: String(e.skin.id) } : e.skin,
      })),
    };
  }

  private computeStatsFromEntries(entries: JackpotEntry[], total: number): ParticipantStat[] {
    const map = new Map<string, ParticipantStat>();
    for (const e of entries) {
      const id = String(e.userId);
      if (!map.has(id)) {
        map.set(id, {
          userId: id, username: e.user?.username || 'Anon', avatar: e.user?.avatar,
          value: 0, percentage: 0, color: this.colorFor(id), skins: [],
        });
      }
      const p = map.get(id)!;
      p.value += e.value; p.skins.push(e.skin);
    }
    const arr = [...map.values()];
    for (const p of arr) p.percentage = total > 0 ? (p.value / total) * 100 : 0;
    return arr.sort((a, b) => b.value - a.value);
  }

  private buildConicGradient(stats: ParticipantStat[]): string {
    if (stats.length === 0) return 'var(--bg-surface)';
    let acc = 0;
    const segs: string[] = [];
    for (const p of stats) {
      const start = acc;
      const end = acc + p.percentage;
      segs.push(`${p.color} ${start.toFixed(3)}% ${end.toFixed(3)}%`);
      acc = end;
    }
    return `conic-gradient(${segs.join(', ')})`;
  }

  private winnerCenterAngle(stats: ParticipantStat[], winnerId: string): number {
    let acc = 0;
    for (const p of stats) {
      if (p.userId === winnerId) return ((acc + p.percentage / 2) / 100) * 360;
      acc += p.percentage;
    }
    return 0;
  }

  private colorFor(userId: string): string {
    if (this.colorMap.has(userId)) return this.colorMap.get(userId)!;
    const idx = this.colorMap.size % PLAYER_PALETTE.length;
    const color = PLAYER_PALETTE[idx];
    this.colorMap.set(userId, color);
    return color;
  }
}
