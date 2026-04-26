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
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
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

@Component({
  selector: 'app-jackpot',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar></app-navbar>

    <main class="page">
      <header class="hero">
        <h1 class="title">JACKPOT</h1>
        <p class="subtitle">El que más apuesta tiene más probabilidad de ganar.</p>
      </header>

      <section class="stage">
        <div class="left">
          <div class="pot-wrap">
            <div class="pot" [class.pulse]="potPulse()">
              <div class="pot-inner">
                <span class="pot-label">POT TOTAL</span>
                <span class="pot-value">{{ jackpot()?.totalValue | number:'1.0-0' }}</span>
                <span class="pot-coins">COINS</span>
              </div>
              <div *ngIf="participants().length >= 2 && timer() > 0" class="pot-timer"
                   [class.danger]="timer() <= 10">
                {{ timer() }}s
              </div>
            </div>

            <div class="meta">
              <div class="meta-item">
                <span class="meta-label">JUGADORES</span>
                <span class="meta-value">{{ participants().length }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">SKINS</span>
                <span class="meta-value">{{ jackpot()?.entries?.length || 0 }}</span>
              </div>
              <div class="meta-item" *ngIf="myStat() as me">
                <span class="meta-label">TU CHANCE</span>
                <span class="meta-value gold">{{ me.percentage | number:'1.0-2' }}%</span>
              </div>
            </div>
          </div>

          <div class="participants">
            <h3 class="section-h">Participantes</h3>
            <div *ngIf="participants().length === 0" class="empty-row">
              Sé el primero en apostar.
            </div>
            <div *ngFor="let p of participants(); trackBy: trackByUserId" class="participant">
              <div class="p-head">
                <span class="p-avatar" [style.background]="p.color + '33'" [style.color]="p.color">
                  {{ initial(p.username) }}
                </span>
                <span class="p-name">{{ p.username }}</span>
                <span class="p-pct" [style.color]="p.color">{{ p.percentage | number:'1.0-2' }}%</span>
                <span class="p-value">{{ p.value | number:'1.0-0' }} coins</span>
              </div>
              <div class="p-bar">
                <div class="p-bar-fill"
                     [style.width.%]="p.percentage"
                     [style.background]="p.color">
                </div>
              </div>
              <div class="p-skins">
                <div *ngFor="let s of p.skins" class="p-skin"
                     [title]="s.name + ' — ' + s.price + ' coins'">
                  <img *ngIf="s.imageUrl" [src]="s.imageUrl" [alt]="s.name" />
                  <span *ngIf="!s.imageUrl" class="fallback">?</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside class="sidebar">
          <h3 class="section-h">Apostar skin</h3>
          <p class="sidebar-hint">Elige una skin de tu inventario y entra al pot.</p>

          <div *ngIf="inventory().length === 0" class="empty-inv">
            No tienes skins disponibles.
          </div>

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

          <button
            class="bet-btn"
            [disabled]="!selectedSkin || betting() || resolving()"
            (click)="confirmBet()">
            {{ betting() ? 'APOSTANDO...' : 'APOSTAR SKIN' }}
          </button>

          <div *ngIf="toast()" class="toast" [class.error]="toast()?.type === 'error'">
            {{ toast()?.message }}
          </div>
        </aside>
      </section>

      <section class="history">
        <h3 class="section-h">Últimos jackpots</h3>
        <div *ngIf="history().length === 0" class="empty-row">Aún no hay jackpots resueltos.</div>
        <div class="history-grid" *ngIf="history().length > 0">
          <div *ngFor="let h of history()" class="history-card">
            <div class="h-head">
              <div class="h-avatar">{{ initial(h.winner?.username) }}</div>
              <div class="h-info">
                <span class="h-winner">{{ h.winner?.username || 'N/A' }}</span>
                <span class="h-date">{{ h.resolvedAt | date:'short' }}</span>
              </div>
            </div>
            <div class="h-body">
              <div class="h-stat">
                <span>POT</span>
                <strong>{{ h.totalValue | number:'1.0-0' }}</strong>
              </div>
              <div class="h-stat">
                <span>PARTICIPANTES</span>
                <strong>{{ distinctPlayersOf(h) }}</strong>
              </div>
              <div class="h-stat">
                <span>SKINS</span>
                <strong>{{ h.entries.length }}</strong>
              </div>
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
          <div class="winner-avatar" [style.background]="ov.winnerColor + '33'" [style.color]="ov.winnerColor">
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

          <button class="cta" (click)="dismissOverlay()">NUEVO JACKPOT</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; background: #0a0a0f; min-height: 100vh; color: #e0e0e0; }
    .page { max-width: 1280px; margin: 0 auto; padding: 2rem; }
    .hero { text-align: center; margin-bottom: 2rem; }
    .title {
      font-size: 3rem; font-weight: 900; letter-spacing: 0.12em; margin: 0;
      background: linear-gradient(90deg, #ff6b00, #ffd700);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .subtitle { color: #888; margin-top: 0.4rem; }

    .section-h {
      color: #e0e0e0; font-size: 1rem; letter-spacing: 0.12em;
      text-transform: uppercase; margin: 0 0 0.9rem;
    }
    .empty-row { color: #666; padding: 1rem 0; }

    /* Stage layout: pot+participants | sidebar */
    .stage {
      display: grid; grid-template-columns: 1fr 360px; gap: 1.5rem;
    }
    @media (max-width: 1000px) {
      .stage { grid-template-columns: 1fr; }
    }
    .left { display: flex; flex-direction: column; gap: 1.5rem; }

    /* Pot */
    .pot-wrap {
      background: linear-gradient(135deg, #16161a 0%, #1f1216 100%);
      border: 1px solid #2a2a35; border-radius: 18px;
      padding: 2rem; display: flex; flex-direction: column; align-items: center; gap: 1.4rem;
      box-shadow: 0 0 60px rgba(255,107,0,0.08);
    }
    .pot {
      width: 240px; height: 240px; border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, #1f1410 0%, #0a0a0f 70%);
      border: 3px solid #ff6b00;
      box-shadow: 0 0 40px rgba(255,107,0,0.4), inset 0 0 30px rgba(255,107,0,0.2);
      display: flex; align-items: center; justify-content: center;
      position: relative; transition: transform 0.25s ease;
    }
    .pot.pulse {
      animation: potPulse 0.6s ease;
    }
    @keyframes potPulse {
      0% { transform: scale(1); box-shadow: 0 0 40px rgba(255,107,0,0.4), inset 0 0 30px rgba(255,107,0,0.2); }
      50% { transform: scale(1.07); box-shadow: 0 0 70px rgba(255,107,0,0.7), inset 0 0 50px rgba(255,107,0,0.4); }
      100% { transform: scale(1); box-shadow: 0 0 40px rgba(255,107,0,0.4), inset 0 0 30px rgba(255,107,0,0.2); }
    }
    .pot-inner { text-align: center; }
    .pot-label { display: block; color: #888; font-size: 0.78rem; letter-spacing: 0.18em; }
    .pot-value {
      display: block; font-size: 3rem; font-weight: 900; line-height: 1.1;
      background: linear-gradient(180deg, #ffd700, #ff6b00);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      margin: 0.1rem 0;
    }
    .pot-coins { color: #ff6b00; font-weight: 700; letter-spacing: 0.15em; font-size: 0.9rem; }
    .pot-timer {
      position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%);
      background: #16161a; border: 2px solid #ff6b00; color: #ff6b00;
      padding: 0.4rem 1rem; border-radius: 999px;
      font-weight: 800; letter-spacing: 0.08em; font-size: 1.1rem;
      box-shadow: 0 0 20px rgba(255,107,0,0.4);
    }
    .pot-timer.danger {
      border-color: #ef4444; color: #ef4444;
      box-shadow: 0 0 20px rgba(239,68,68,0.5);
      animation: dangerPulse 0.6s infinite alternate;
    }
    @keyframes dangerPulse { from { transform: translateX(-50%) scale(1); } to { transform: translateX(-50%) scale(1.08); } }

    .meta { display: flex; gap: 1.5rem; }
    .meta-item { text-align: center; }
    .meta-label { display: block; color: #666; font-size: 0.72rem; letter-spacing: 0.15em; }
    .meta-value { display: block; color: #e0e0e0; font-size: 1.4rem; font-weight: 800; }
    .meta-value.gold { color: #ffd700; }

    /* Participants */
    .participants {
      background: #16161a; border: 1px solid #2a2a35;
      border-radius: 14px; padding: 1.4rem;
    }
    .participant {
      background: #0a0a0f; border-radius: 10px; padding: 0.85rem 1rem;
      margin-bottom: 0.7rem; border: 1px solid transparent;
      transition: border-color 0.2s;
    }
    .participant:hover { border-color: #2a2a35; }
    .p-head {
      display: grid; grid-template-columns: auto 1fr auto auto;
      gap: 0.8rem; align-items: center; margin-bottom: 0.55rem;
    }
    .p-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 800; font-size: 0.95rem;
    }
    .p-name { color: #e0e0e0; font-weight: 600; }
    .p-pct { font-weight: 800; }
    .p-value { color: #ffd700; font-weight: 700; font-size: 0.9rem; }
    .p-bar {
      height: 8px; background: #1f1f2a; border-radius: 999px;
      overflow: hidden; margin-bottom: 0.55rem;
    }
    .p-bar-fill { height: 100%; transition: width 0.4s ease; }
    .p-skins { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .p-skin {
      width: 38px; height: 38px; border-radius: 6px; padding: 3px;
      background: #16161a; border: 1px solid #2a2a35;
      display: flex; align-items: center; justify-content: center;
    }
    .p-skin img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .p-skin .fallback { color: #444; font-size: 0.85rem; }

    /* Sidebar */
    .sidebar {
      background: #16161a; border: 1px solid #2a2a35;
      border-radius: 14px; padding: 1.4rem; align-self: start;
      position: sticky; top: 90px;
    }
    .sidebar-hint { color: #888; font-size: 0.85rem; margin-top: 0; }
    .empty-inv {
      color: #666; padding: 1rem; text-align: center;
      background: #0a0a0f; border-radius: 8px; margin-bottom: 1rem;
    }
    .inv-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 0.6rem; margin-bottom: 1rem; max-height: 360px; overflow-y: auto;
    }
    .inv-tile {
      background: #0a0a0f; border: 1px solid #2a2a35; border-radius: 8px;
      padding: 0.55rem; cursor: pointer; color: #e0e0e0;
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      transition: transform 0.12s, border-color 0.12s;
    }
    .inv-tile:hover:not(:disabled) { transform: translateY(-2px); border-color: #ff6b00; }
    .inv-tile.selected { border-color: #ff6b00; background: #1a1410; box-shadow: 0 0 0 2px rgba(255,107,0,0.4); }
    .inv-tile:disabled { opacity: 0.4; cursor: not-allowed; }
    .inv-img {
      width: 100%; height: 60px;
      display: flex; align-items: center; justify-content: center;
    }
    .inv-img img { max-width: 100%; max-height: 60px; object-fit: contain; }
    .inv-img .fallback { color: #444; font-size: 1.4rem; }
    .inv-name { font-size: 0.74rem; line-height: 1.1; text-align: center; }
    .inv-price { color: #ffd700; font-weight: 700; font-size: 0.78rem; }
    .bet-btn {
      width: 100%; padding: 0.95rem; border: none; border-radius: 10px;
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      font-weight: 900; letter-spacing: 0.1em; cursor: pointer;
      box-shadow: 0 4px 20px rgba(255,107,0,0.35);
      transition: transform 0.15s;
    }
    .bet-btn:hover:not(:disabled) { transform: translateY(-2px); }
    .bet-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

    .toast {
      margin-top: 0.8rem; padding: 0.65rem 0.9rem; border-radius: 8px;
      background: #0a0a0f; color: #aaa; font-size: 0.85rem;
      border: 1px solid #2a2a35;
    }
    .toast.error { color: #ff6b6b; border-color: #ff4444; background: #2b1414; }

    /* History */
    .history { margin-top: 2.5rem; }
    .history-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;
    }
    .history-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 12px;
      padding: 1rem 1.2rem; transition: border-color 0.2s, transform 0.15s;
    }
    .history-card:hover { border-color: #ff6b00; transform: translateY(-2px); }
    .h-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.7rem; }
    .h-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #ffd700, #ff6b00);
      color: #0a0a0f; font-weight: 800; font-size: 1rem;
      display: flex; align-items: center; justify-content: center;
    }
    .h-info { display: flex; flex-direction: column; }
    .h-winner { font-weight: 700; color: #e0e0e0; }
    .h-date { color: #666; font-size: 0.78rem; }
    .h-body { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.4rem; }
    .h-stat { display: flex; flex-direction: column; gap: 0.1rem; align-items: flex-start; }
    .h-stat span { color: #666; font-size: 0.65rem; letter-spacing: 0.1em; }
    .h-stat strong { color: #ffd700; font-size: 0.95rem; }

    /* Overlay / Roulette */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.92);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; backdrop-filter: blur(6px);
      animation: fadein 0.25s ease-out;
    }
    @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
    .overlay-inner {
      width: min(560px, 92vw); text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 1.2rem;
      max-height: 92vh; overflow-y: auto;
    }
    .roulette-wrap {
      position: relative; width: 320px; height: 320px;
      display: flex; align-items: center; justify-content: center;
    }
    .roulette-pointer {
      position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
      color: #ff6b00; font-size: 1.8rem; z-index: 3;
      filter: drop-shadow(0 0 8px rgba(255,107,0,0.6));
    }
    .roulette {
      width: 100%; height: 100%; border-radius: 50%;
      transition: transform 5s cubic-bezier(0.18, 0.85, 0.18, 1);
      box-shadow: 0 0 40px rgba(255,107,0,0.3), inset 0 0 0 4px #16161a;
    }
    .roulette-center {
      position: absolute; width: 130px; height: 130px;
      border-radius: 50%; background: #0a0a0f;
      border: 3px solid #ff6b00;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 0 18px rgba(255,107,0,0.5);
    }
    .roulette-center span { color: #888; font-size: 0.72rem; letter-spacing: 0.15em; }
    .roulette-center strong {
      font-size: 1.4rem; font-weight: 900; line-height: 1;
      background: linear-gradient(180deg, #ffd700, #ff6b00);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .reveal { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; position: relative; }
    .winner-avatar {
      width: 110px; height: 110px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 3rem; font-weight: 900;
      box-shadow: 0 0 35px rgba(255,215,0,0.4);
      animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
    .winner-name {
      font-size: 1.8rem; font-weight: 900; margin: 0; color: #e0e0e0;
    }
    .winner-tag {
      color: #ffd700; letter-spacing: 0.18em; font-weight: 800; margin: 0;
    }
    .winner-amount { color: #ff6b00; font-weight: 700; margin: 0; }
    .won-skins {
      display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;
      max-width: 480px;
    }
    .won-skin {
      width: 56px; height: 56px;
      background: #16161a; border: 1px solid #2a2a35; border-radius: 8px;
      padding: 4px;
      display: flex; align-items: center; justify-content: center;
    }
    .won-skin img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .won-skin .fallback { color: #444; }
    .seed-row {
      display: inline-flex; gap: 0.5rem; align-items: center;
      background: #16161a; border: 1px solid #2a2a35; border-radius: 8px;
      padding: 0.4rem 0.8rem;
      max-width: 100%; flex-wrap: wrap;
    }
    .seed-row span { color: #666; font-size: 0.7rem; letter-spacing: 0.1em; }
    .seed-row code {
      color: #888; font-family: 'Courier New', monospace; font-size: 0.75rem;
      word-break: break-all;
    }
    .cta {
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      border: none; padding: 0.9rem 1.6rem; border-radius: 10px;
      font-weight: 900; letter-spacing: 0.1em; cursor: pointer;
      box-shadow: 0 4px 18px rgba(255,107,0,0.35);
      transition: transform 0.15s;
    }
    .cta:hover { transform: translateY(-2px); }

    /* Confetti */
    .confetti {
      position: absolute; inset: -40px 0 0 0;
      pointer-events: none; overflow: visible;
    }
    .confetti span {
      position: absolute; top: -10px;
      width: 8px; height: 14px; border-radius: 2px;
      animation: confettiFall 2.4s ease-in forwards;
      opacity: 0;
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
  potPulse = signal(false);
  resolving = signal(false);
  betting = signal(false);
  toast = signal<{ type: 'error' | 'info'; message: string } | null>(null);

  selectedSkin?: Skin;

  // Overlay state
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
      this.socket.onJackpotEntry().subscribe((entry) => {
        this.applyEntry(entry);
      }),
      this.socket.onJackpotTimer().subscribe((seconds) => {
        this.timer.set(seconds);
      }),
      this.socket.onJackpotResolved().subscribe((ev) => {
        this.handleResolved(ev);
      }),
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
    this.jackpot.set({
      ...current,
      entries: newEntries,
      totalValue: newTotal,
    });
    this.triggerPulse();
  }

  triggerPulse() {
    this.potPulse.set(false);
    setTimeout(() => this.potPulse.set(true), 10);
    setTimeout(() => this.potPulse.set(false), 700);
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
        this.showToast('info', 'Apuesta enviada');
      },
      error: (err) => {
        this.betting.set(false);
        this.showToast('error', err?.error?.error || 'Error al apostar');
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
    // Pointer is at top (0deg). To put winner's center at top, we rotate to align.
    const baseRotation = 360 * 6 + (360 - winnerCenterAngle);

    this.overlay.set({
      revealed: false,
      rotation: 0,
      gradient,
      seed: ev.seed,
      totalValue: ev.totalValue,
      entries: ev.entries,
      winnerUsername: ev.winnerUsername,
      winnerColor,
    });

    setTimeout(() => {
      this.overlay.update((o) => (o ? { ...o, rotation: baseRotation } : o));
    }, 100);

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

  showToast(type: 'error' | 'info', message: string) {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3000);
    if (type === 'error') this.toastSvc.error(message);
    else this.toastSvc.info(message);
  }

  trackByUserId(_: number, p: ParticipantStat) {
    return p.userId;
  }

  initial(name?: string) {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  distinctPlayersOf(j: Jackpot) {
    return new Set(j.entries.map((e) => String(e.userId))).size;
  }

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
    const arr = [...map.values()];
    for (const p of arr) {
      p.percentage = total > 0 ? (p.value / total) * 100 : 0;
    }
    return arr.sort((a, b) => b.value - a.value);
  }

  private buildConicGradient(stats: ParticipantStat[]): string {
    if (stats.length === 0) return '#16161a';
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
      if (p.userId === winnerId) {
        return ((acc + p.percentage / 2) / 100) * 360;
      }
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
