import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BoxService, BoxHistoryEntry, BoxOpenResult, BoxStatus } from '../../services/box.service';
import { ToastService } from '../../shared/services/toast.service';

type PageState = 'loading' | 'available' | 'unavailable' | 'opening' | 'result';

@Component({
  selector: 'app-daily-box',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title gradient-text">CAJA DIARIA</h1>
        <p class="page-subtitle" *ngIf="status">
          Nivel {{ status.userLevel }} — recompensa personalizada
        </p>
      </div>

      <!-- Loading -->
      <div class="box-container" *ngIf="state === 'loading'">
        <div class="skeleton" style="width:200px;height:200px;border-radius:var(--radius-lg);margin:auto"></div>
      </div>

      <!-- Disponible -->
      <div class="box-container" *ngIf="state === 'available' && status">
        <div class="box-wrapper">
          <div class="box-3d" (click)="open()">
            <svg viewBox="0 0 120 120" class="box-svg" [style.--box-color]="levelColor">
              <rect x="10" y="50" width="100" height="65" rx="6"
                fill="none" stroke="var(--box-color)" stroke-width="3"/>
              <rect x="5" y="38" width="110" height="18" rx="4"
                fill="none" stroke="var(--box-color)" stroke-width="3"/>
              <path d="M60 38 Q45 20 30 38" fill="none" stroke="var(--box-color)" stroke-width="3"/>
              <path d="M60 38 Q75 20 90 38" fill="none" stroke="var(--box-color)" stroke-width="3"/>
              <line x1="60" y1="38" x2="60" y2="115" stroke="var(--box-color)" stroke-width="2" stroke-dasharray="4 3"/>
            </svg>
            <div class="box-glow" [style.--glow-color]="levelColor"></div>
          </div>
          <p class="box-ready-text">¡Tu recompensa de hoy está lista!</p>
          <p class="box-range" *ngIf="status.estimatedReward">
            Entre <strong>{{ status.estimatedReward.min | number:'1.0-0' }}</strong>
            y <strong>{{ status.estimatedReward.max | number:'1.0-0' }}</strong> coins de valor
          </p>
          <button class="btn btn-primary open-btn" (click)="open()">
            ABRIR CAJA
          </button>
        </div>
      </div>

      <!-- Abriendo (animación) -->
      <div class="box-container" *ngIf="state === 'opening'">
        <div class="box-explode">
          <div class="box-3d exploding">
            <svg viewBox="0 0 120 120" class="box-svg" [style.--box-color]="levelColor">
              <rect x="10" y="50" width="100" height="65" rx="6"
                fill="none" stroke="var(--box-color)" stroke-width="3"/>
              <rect x="5" y="38" width="110" height="18" rx="4"
                fill="none" stroke="var(--box-color)" stroke-width="3"/>
              <path d="M60 38 Q45 20 30 38" fill="none" stroke="var(--box-color)" stroke-width="3"/>
              <path d="M60 38 Q75 20 90 38" fill="none" stroke="var(--box-color)" stroke-width="3"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Resultado -->
      <div class="box-container result-container" *ngIf="state === 'result' && result">
        <div class="result-card" [class]="'rarity-' + result.skin.rarity.toLowerCase().replace(' ', '-')">
          <div class="result-label">¡HAS GANADO!</div>
          <div class="result-image-wrap">
            <img [src]="result.skin.imageUrl" [alt]="result.skin.name" class="result-image"/>
            <div class="result-rarity-glow"></div>
          </div>
          <div class="result-info">
            <p class="result-weapon">{{ result.skin.weapon }}</p>
            <p class="result-name">{{ result.skin.name }}</p>
            <p class="result-value">
              <span class="badge">{{ result.skin.price | number:'1.0-0' }} coins</span>
            </p>
            <p *ngIf="result.isNewRecord" class="result-record">¡Nuevo récord personal!</p>
          </div>
          <a routerLink="/inventory" class="btn btn-primary">Ver en inventario</a>
        </div>
      </div>

      <!-- No disponible -->
      <div class="box-container" *ngIf="state === 'unavailable' && status">
        <div class="box-wrapper locked">
          <div class="box-3d locked-box">
            <svg viewBox="0 0 120 120" class="box-svg" style="--box-color: var(--text-muted)">
              <rect x="10" y="50" width="100" height="65" rx="6"
                fill="none" stroke="var(--text-muted)" stroke-width="3" opacity="0.4"/>
              <rect x="5" y="38" width="110" height="18" rx="4"
                fill="none" stroke="var(--text-muted)" stroke-width="3" opacity="0.4"/>
              <!-- Padlock -->
              <rect x="44" y="60" width="32" height="26" rx="4" fill="var(--bg-elevated)" stroke="var(--text-muted)" stroke-width="2"/>
              <path d="M50 60 v-6 a10 10 0 0 1 20 0 v6" fill="none" stroke="var(--text-muted)" stroke-width="2.5"/>
              <circle cx="60" cy="72" r="4" fill="var(--text-muted)" opacity="0.7"/>
              <line x1="60" y1="76" x2="60" y2="82" stroke="var(--text-muted)" stroke-width="2" opacity="0.7"/>
            </svg>
          </div>
          <p class="countdown-label">Vuelve mañana para tu próxima caja</p>
          <div class="countdown">{{ countdown }}</div>
        </div>

        <!-- Historial -->
        <div class="history-section" *ngIf="history.length > 0">
          <h3 class="section-title">Últimas cajas abiertas</h3>
          <div class="history-list">
            <div class="history-item" *ngFor="let entry of history">
              <img [src]="entry.skin.imageUrl" [alt]="entry.skin.name" class="history-img"/>
              <div class="history-info">
                <span class="history-name">{{ entry.skin.name }}</span>
                <span class="history-sub">{{ entry.skin.weapon }} · Nivel {{ entry.level }}</span>
              </div>
              <span class="history-value badge">{{ entry.coinsValue | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      max-width: 640px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    .page-header { text-align: center; margin-bottom: 2rem; }
    .page-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: clamp(2rem, 6vw, 3.5rem);
      font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0 0 0.5rem;
    }
    .page-subtitle { color: var(--text-secondary); font-size: 15px; margin: 0; }

    .box-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }

    /* 3D box */
    .box-wrapper { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .box-3d {
      position: relative;
      width: 200px; height: 200px;
      cursor: pointer;
      animation: float 3s ease-in-out infinite;
      transition: transform 0.2s;
    }
    .box-3d:hover { transform: scale(1.06); }
    .box-svg { width: 100%; height: 100%; filter: drop-shadow(0 0 18px var(--box-color, var(--accent))); }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-12px); }
    }

    .box-glow {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle, color-mix(in srgb, var(--glow-color, var(--accent)) 25%, transparent), transparent 70%);
      pointer-events: none;
      animation: pulse-glow 2.5s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.15); }
    }

    .box-ready-text {
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }
    .box-range { color: var(--text-secondary); font-size: 14px; margin: 0; }
    .box-range strong { color: var(--gold); }

    .open-btn { font-family: 'Rajdhani', sans-serif; font-size: 1.1rem; letter-spacing: 0.06em; padding: 0.8rem 2.5rem; }

    /* Exploding animation */
    .exploding {
      animation: explode 0.6s ease-out forwards !important;
      cursor: default;
    }
    @keyframes explode {
      0%   { transform: scale(1) rotate(0deg); opacity: 1; }
      40%  { transform: scale(1.4) rotate(15deg); opacity: 1; }
      100% { transform: scale(0) rotate(45deg); opacity: 0; }
    }

    /* Result */
    .result-container { width: 100%; }
    .result-card {
      width: 100%;
      background: var(--bg-surface);
      border: 2px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 2rem 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      animation: result-enter 0.5s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes result-enter {
      from { opacity: 0; transform: scale(0.7) translateY(30px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .result-card.rarity-covert          { border-color: var(--rarity-covert); }
    .result-card.rarity-classified      { border-color: var(--rarity-classified); }
    .result-card.rarity-restricted      { border-color: var(--rarity-restricted); }
    .result-card.rarity-mil-spec-grade  { border-color: var(--rarity-milspec); }
    .result-card.rarity-industrial-grade{ border-color: var(--rarity-industrial); }
    .result-card.rarity-consumer-grade  { border-color: var(--rarity-consumer); }
    .result-card.rarity-contraband      { border-color: var(--rarity-contraband); }

    .result-label {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0.06em;
    }
    .result-image-wrap { position: relative; }
    .result-image { width: 220px; height: 160px; object-fit: contain; }
    .result-rarity-glow {
      position: absolute;
      inset: -10px;
      border-radius: 50%;
      background: radial-gradient(circle, color-mix(in srgb, var(--gold) 20%, transparent), transparent 70%);
      pointer-events: none;
    }
    .result-info { text-align: center; }
    .result-weapon { font-size: 13px; color: var(--text-muted); margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.06em; }
    .result-name { font-family: 'Rajdhani', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px; }
    .result-value { margin: 0 0 4px; }
    .result-record { color: var(--gold); font-size: 13px; font-weight: 600; margin: 0; }

    /* Locked */
    .locked-box { cursor: default; animation: none !important; opacity: 0.6; }
    .countdown-label { color: var(--text-secondary); font-size: 14px; margin: 0; }
    .countdown {
      font-family: 'Rajdhani', sans-serif;
      font-size: 3rem;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.08em;
    }

    /* History */
    .history-section { width: 100%; margin-top: 1rem; }
    .history-list { display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.75rem; }
    .history-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.875rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
    }
    .history-img { width: 44px; height: 32px; object-fit: contain; }
    .history-info { flex: 1; min-width: 0; }
    .history-name { display: block; font-size: 13px; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .history-sub { display: block; font-size: 11px; color: var(--text-muted); }
    .history-value { font-size: 12px; }
  `],
})
export class DailyBoxComponent implements OnInit, OnDestroy {
  state: PageState = 'loading';
  status: BoxStatus | null = null;
  result: BoxOpenResult | null = null;
  history: BoxHistoryEntry[] = [];
  countdown = '00:00:00';
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private badgeInterval: ReturnType<typeof setInterval> | null = null;

  get levelColor(): string {
    const level = this.status?.userLevel ?? 1;
    if (level >= 50) return 'var(--rarity-contraband)';
    if (level >= 30) return 'var(--rarity-covert)';
    if (level >= 20) return 'var(--rarity-classified)';
    if (level >= 10) return 'var(--rarity-restricted)';
    if (level >= 5)  return 'var(--rarity-milspec)';
    return 'var(--accent)';
  }

  constructor(private box: BoxService, private toast: ToastService) {}

  ngOnInit() {
    this.loadStatus();
  }

  ngOnDestroy() {
    this.clearCountdown();
    if (this.badgeInterval) clearInterval(this.badgeInterval);
  }

  loadStatus() {
    this.box.getStatus().subscribe({
      next: (s) => {
        this.status = s;
        if (s.canOpen) {
          this.state = 'available';
        } else {
          this.state = 'unavailable';
          this.startCountdown(s.timeUntilNext);
          this.box.getHistory().subscribe((h) => (this.history = h));
        }
      },
      error: () => { this.state = 'unavailable'; },
    });
  }

  open() {
    if (this.state !== 'available') return;
    this.state = 'opening';
    setTimeout(() => {
      this.box.openBox().subscribe({
        next: (r) => {
          this.result = r;
          this.state = 'result';
          this.toast.success(`¡Ganaste ${r.skin.name}!`, 6000);
        },
        error: (err) => {
          const msg = err?.error?.error || 'Error al abrir la caja';
          this.toast.success(msg, 4000);
          this.loadStatus();
        },
      });
    }, 700);
  }

  private startCountdown(msUntilNext: number) {
    this.updateCountdown(msUntilNext);
    this.clearCountdown();
    let remaining = msUntilNext;
    this.countdownInterval = setInterval(() => {
      remaining -= 1000;
      if (remaining <= 0) {
        this.clearCountdown();
        this.loadStatus();
        return;
      }
      this.updateCountdown(remaining);
    }, 1000);
  }

  private updateCountdown(ms: number) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    this.countdown = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  private clearCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
