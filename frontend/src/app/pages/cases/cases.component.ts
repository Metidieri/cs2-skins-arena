import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CasesService, CaseDefinition, CaseOpenResult } from '../../services/cases.service';
import { SkinsService } from '../../services/skins.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { Skin } from '../../models/skin.model';

const RARITY_COLORS: Record<string, string> = {
  consumer:   '#9ea3ae', industrial: '#7bb4d4', 'mil-spec': '#4b69ff',
  restricted: '#8847ff', classified: '#d32ce6', covert:     '#eb4b4b',
  contraband: '#e4ae39',
};

const RARITY_LABELS: Record<string, string> = {
  consumer: 'Consumer', industrial: 'Industrial', 'mil-spec': 'Mil-Spec',
  restricted: 'Restricted', classified: 'Classified', covert: 'Covert',
  contraband: 'Contraband',
};

const ITEM_W = 120;
const REPEAT = 6;

@Component({
  selector: 'app-cases',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title gradient-text">APERTURA DE CAJAS</h1>
        <p class="page-subtitle">Abre cajas y consigue skins exclusivas</p>
      </div>

      <!-- Cases grid -->
      <div class="cases-grid" *ngIf="!showModal">
        <div class="case-card" *ngFor="let c of cases">
          <!-- Case icon -->
          <div class="case-icon" [style.border-color]="c.key === 'premium-case' ? 'var(--rarity-contraband)' : 'var(--rarity-milspec)'">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <rect x="8" y="30" width="64" height="42" rx="5" fill="none"
                [attr.stroke]="c.key === 'premium-case' ? '#e4ae39' : '#4b69ff'" stroke-width="2.5"/>
              <rect x="4" y="22" width="72" height="14" rx="4" fill="none"
                [attr.stroke]="c.key === 'premium-case' ? '#e4ae39' : '#4b69ff'" stroke-width="2.5"/>
              <path [attr.d]="'M40 22 Q30 10 20 22'" fill="none"
                [attr.stroke]="c.key === 'premium-case' ? '#e4ae39' : '#4b69ff'" stroke-width="2.5"/>
              <path [attr.d]="'M40 22 Q50 10 60 22'" fill="none"
                [attr.stroke]="c.key === 'premium-case' ? '#e4ae39' : '#4b69ff'" stroke-width="2.5"/>
              <line x1="40" y1="22" x2="40" y2="72"
                [attr.stroke]="c.key === 'premium-case' ? '#e4ae39' : '#4b69ff'" stroke-width="1.5" stroke-dasharray="4 3"/>
            </svg>
          </div>

          <h3 class="case-name">{{ c.name }}</h3>
          <p class="case-price">{{ c.price | number:'1.0-0' }} coins</p>

          <!-- Probability table -->
          <div class="prob-table">
            <div class="prob-row" *ngFor="let item of c.items">
              <span class="prob-dot" [style.background]="rarityColor(item.rarity)"></span>
              <span class="prob-rarity">{{ rarityLabel(item.rarity) }}</span>
              <span class="prob-range">{{ item.priceRange[0] }}–{{ item.priceRange[1] }}</span>
              <span class="prob-pct">{{ item.probability | number:'1.2-2' }}%</span>
            </div>
          </div>

          <button class="btn btn-primary open-case-btn"
            [disabled]="!auth.isLoggedIn() || (auth.user()?.balance ?? 0) < c.price || opening"
            (click)="startOpen(c)">
            {{ opening && activeCase?.key === c.key ? 'ABRIENDO...' : 'ABRIR — ' + c.price + ' coins' }}
          </button>
          <p class="balance-hint" *ngIf="auth.isLoggedIn()">
            Balance: {{ auth.user()?.balance | number:'1.0-0' }} coins
          </p>
        </div>
      </div>

      <!-- Spinning modal -->
      <div class="spin-modal" *ngIf="showModal">
        <!-- Spinner phase -->
        <div class="spin-phase" *ngIf="phase === 'spinning'">
          <h2 class="spin-title">{{ activeCase?.name }}</h2>
          <div class="spin-wheel-wrap">
            <div class="spin-indicator"></div>
            <div class="spin-fade-left"></div>
            <div class="spin-fade-right"></div>
            <div class="spin-track"
                 [style.transform]="'translateX(' + spinTx + 'px)'"
                 [class.spin-anim]="isSpinning">
              <div *ngFor="let item of spinStrip; trackBy: trackByIdx"
                   class="spin-item"
                   [style.border-bottom]="'4px solid ' + rarityColor(item.rarity)">
                <img [src]="item.imageUrl" [alt]="item.name" class="spin-img"/>
                <div class="spin-item-name">{{ item.name }}</div>
              </div>
            </div>
          </div>
          <p class="spin-hint">Calculando resultado...</p>
        </div>

        <!-- Result phase -->
        <div class="result-phase" *ngIf="phase === 'result' && openResult">
          <div class="result-won">¡HAS GANADO!</div>
          <div class="result-skin-card"
               [style.border-color]="rarityColorByDb(openResult.skin.rarity)">
            <img [src]="openResult.skin.imageUrl" [alt]="openResult.skin.name" class="result-skin-img"/>
            <div class="result-glow" [style.background]="'radial-gradient(circle, ' + rarityColorByDb(openResult.skin.rarity) + '33, transparent 70%)'"></div>
          </div>
          <div class="result-details">
            <p class="result-weapon">{{ openResult.skin.weapon }}</p>
            <p class="result-name">{{ openResult.skin.name }}</p>
            <p class="result-rarity" [style.color]="rarityColorByDb(openResult.skin.rarity)">
              {{ openResult.skin.rarity }}
            </p>
            <p class="result-value">Valor: <strong>{{ openResult.skin.price | number:'1.0-0' }} coins</strong></p>
            <p class="result-profit" [class.profit-pos]="openResult.profit >= 0" [class.profit-neg]="openResult.profit < 0">
              {{ openResult.profit >= 0 ? '¡Beneficio! +' : '' }}{{ openResult.profit | number:'1.0-0' }} coins
            </p>
          </div>
          <div class="result-seed">
            <span>Seed: <code>{{ openResult.seed }}</code></span>
          </div>
          <div class="result-actions">
            <button class="btn btn-primary" (click)="openAnother()">ABRIR OTRA</button>
            <a routerLink="/inventory" class="btn btn-ghost">Ver en inventario</a>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }
    .page-header { text-align: center; margin-bottom: 2rem; }
    .page-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: clamp(1.8rem, 5vw, 3rem);
      font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0 0 0.3rem;
    }
    .page-subtitle { color: var(--text-muted); font-size: 14px; }

    /* Cases grid */
    .cases-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
    }
    .case-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.875rem;
    }
    .case-icon {
      width: 100px; height: 100px;
      border: 2px solid var(--border-default);
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-elevated);
      filter: drop-shadow(0 0 12px currentColor);
    }
    .case-name {
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .case-price {
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--gold);
      margin: 0;
    }
    .prob-table {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .prob-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
    }
    .prob-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .prob-rarity { flex: 1; color: var(--text-secondary); }
    .prob-range { color: var(--text-muted); font-size: 11px; min-width: 70px; text-align: right; }
    .prob-pct { color: var(--text-muted); font-size: 11px; min-width: 45px; text-align: right; }
    .open-case-btn {
      width: 100%;
      font-family: 'Rajdhani', sans-serif;
      font-size: 1rem;
      letter-spacing: 0.06em;
      padding: 0.75rem;
    }
    .open-case-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .balance-hint { font-size: 11px; color: var(--text-muted); margin: 0; }

    /* Spin modal */
    .spin-modal {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .spin-phase {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
    }
    .spin-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--text-primary);
      margin: 0;
    }
    .spin-wheel-wrap {
      position: relative;
      width: 100%;
      max-width: 720px;
      height: 160px;
      overflow: hidden;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
    }
    .spin-indicator {
      position: absolute;
      left: 50%; top: 0; bottom: 0;
      width: 3px;
      background: var(--accent);
      transform: translateX(-50%);
      z-index: 3;
      box-shadow: 0 0 10px var(--accent);
    }
    .spin-indicator::before {
      content: '';
      position: absolute;
      top: 0; left: 50%;
      transform: translateX(-50%);
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-top: 12px solid var(--accent);
    }
    .spin-fade-left, .spin-fade-right {
      position: absolute; top: 0; bottom: 0; width: 100px; z-index: 2; pointer-events: none;
    }
    .spin-fade-left  { left: 0;  background: linear-gradient(to right, var(--bg-surface), transparent); }
    .spin-fade-right { right: 0; background: linear-gradient(to left,  var(--bg-surface), transparent); }
    .spin-track {
      display: flex;
      height: 160px;
      will-change: transform;
    }
    .spin-anim {
      transition: transform 5s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .spin-item {
      width: 120px;
      height: 160px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: var(--bg-elevated);
      border-right: 1px solid var(--border-subtle);
      padding: 8px;
    }
    .spin-img { width: 90px; height: 90px; object-fit: contain; }
    .spin-item-name {
      font-size: 9px;
      color: var(--text-muted);
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      padding: 0 4px;
    }
    .spin-hint {
      color: var(--text-muted);
      font-size: 13px;
      animation: blink 1s ease-in-out infinite;
    }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }

    /* Result */
    .result-phase {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 1rem;
      animation: result-pop 0.5s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes result-pop {
      from { opacity: 0; transform: scale(0.8); }
      to   { opacity: 1; transform: scale(1); }
    }
    .result-won {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2.5rem;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: 0.06em;
    }
    .result-skin-card {
      position: relative;
      background: var(--bg-surface);
      border: 2px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 1rem;
      width: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .result-skin-img { width: 200px; height: 150px; object-fit: contain; }
    .result-glow {
      position: absolute; inset: 0;
      border-radius: var(--radius-lg);
      pointer-events: none;
    }
    .result-details { text-align: center; }
    .result-weapon { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 4px; }
    .result-name { font-family: 'Rajdhani', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .result-rarity { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 6px; }
    .result-value { font-size: 14px; color: var(--text-secondary); margin: 0 0 4px; }
    .result-value strong { color: var(--gold); }
    .result-profit { font-family: 'Rajdhani', sans-serif; font-size: 1.25rem; font-weight: 700; }
    .profit-pos { color: var(--green); }
    .profit-neg { color: var(--red); }
    .result-seed {
      font-size: 11px;
      color: var(--text-muted);
      background: var(--bg-elevated);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      max-width: 400px;
      word-break: break-all;
      text-align: center;
    }
    .result-seed code { font-family: 'Courier New', monospace; }
    .result-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }
  `],
})
export class CasesComponent implements OnInit {
  cases: CaseDefinition[] = [];
  allSkins: Skin[] = [];
  spinStrip: (Skin & { rarity: string })[] = [];
  spinTx = 0;
  isSpinning = false;
  showModal = false;
  phase: 'spinning' | 'result' = 'spinning';
  activeCase: CaseDefinition | null = null;
  openResult: CaseOpenResult | null = null;
  opening = false;

  private readonly SPIN_INITIAL_IDX = 0;
  private readonly CENTER_ANCHOR = 300; // half of 720px - half item (60px)

  constructor(
    private casesService: CasesService,
    private skinsService: SkinsService,
    public auth: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.casesService.getCases().subscribe((c) => (this.cases = c));
    this.skinsService.getAll().subscribe((s) => (this.allSkins = s));
  }

  startOpen(c: CaseDefinition) {
    if (this.opening || !this.allSkins.length) return;
    this.activeCase = c;
    this.opening = true;
    this.showModal = true;
    this.phase = 'spinning';
    this.openResult = null;

    // Build strip from all skins, repeated
    const baseStrip: (Skin & { rarity: string })[] = [];
    for (let r = 0; r < REPEAT; r++) {
      for (const s of this.allSkins) {
        baseStrip.push({ ...s, rarity: s.rarity });
      }
    }
    this.spinStrip = baseStrip;

    // Reset to start position (no transition)
    this.isSpinning = false;
    this.spinTx = 0;

    // Call API
    this.casesService.openCase(c.key).subscribe({
      next: (result) => {
        // Update balance
        this.auth.updateBalance((this.auth.user()?.balance ?? 0) - c.price);

        // Find winning skin in the strip: put it in the 5th repetition
        const winSkinId = result.skin.id;
        const totalItems = this.spinStrip.length;
        // Use the last repetition (5th = index 4, items at 4*allSkins.length + skinIndex)
        const skinIndex = this.allSkins.findIndex((s) => s.id === winSkinId);
        const targetRepeat = REPEAT - 1; // last repetition
        const targetItemIdx = targetRepeat * this.allSkins.length + (skinIndex >= 0 ? skinIndex : 0);

        // Make sure the winning skin is actually in the strip at targetItemIdx
        if (skinIndex >= 0) {
          this.spinStrip[targetItemIdx] = { ...result.skin, rarity: result.skin.rarity };
        }

        // Calculate target translateX
        const targetTx = this.CENTER_ANCHOR - targetItemIdx * ITEM_W - ITEM_W / 2;

        // Start animation
        setTimeout(() => {
          this.isSpinning = true;
          this.spinTx = targetTx;
        }, 50);

        // Show result after animation
        setTimeout(() => {
          this.openResult = result;
          this.phase = 'result';
          this.opening = false;
          if (result.profit >= 0) {
            this.toast.success(`¡Ganaste ${result.skin.name}! +${result.profit.toFixed(0)} coins`, 5000);
          }
        }, 5500);
      },
      error: (err) => {
        this.opening = false;
        this.showModal = false;
        this.toast.success(err?.error?.error || 'Error al abrir caja', 4000);
      },
    });
  }

  openAnother() {
    this.showModal = false;
    this.opening = false;
    this.openResult = null;
    this.isSpinning = false;
  }

  rarityColor(r: string): string {
    return RARITY_COLORS[r.toLowerCase().replace(/[\s-]/g, '-')] ??
           RARITY_COLORS[r.toLowerCase()] ?? '#888';
  }

  rarityColorByDb(r: string): string {
    const key = r.toLowerCase().replace(/\s+/g, '-').replace(/-grade$/, '');
    return RARITY_COLORS[key] ?? '#888';
  }

  rarityLabel(r: string): string {
    return RARITY_LABELS[r] ?? r;
  }

  trackByIdx(index: number): number { return index; }
}
