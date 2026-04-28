import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { RouletteService } from '../../services/roulette.service';
import { SocketService } from '../../services/socket.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { RouletteBet, RouletteHistoryItem, RouletteResult, RouletteRound } from '../../models/roulette.model';

const NUMS = [
  { n: 0, color: 'green' }, { n: 1, color: 'red' }, { n: 2, color: 'black' },
  { n: 3, color: 'red' },   { n: 4, color: 'black' },{ n: 5, color: 'red' },
  { n: 6, color: 'black' }, { n: 7, color: 'red' },  { n: 8, color: 'black' },
  { n: 9, color: 'red' },   { n: 10, color: 'black' },{ n: 11, color: 'red' },
  { n: 12, color: 'black' },{ n: 13, color: 'red' }, { n: 14, color: 'black' },
];

const ITEM_W = 60;
const REPEATS = 12;
const TOTAL_ITEMS = NUMS.length * REPEATS; // 180
const MID_ITEM = Math.floor(TOTAL_ITEMS / 2); // 90
// Center of each item: item I is centered when translateX = CENTER_ANCHOR - I * ITEM_W
// where CENTER_ANCHOR = 240 (270 - 30 = half of 540px visible - half item width)
const CENTER_ANCHOR = 240;
const INITIAL_TX = CENTER_ANCHOR - MID_ITEM * ITEM_W; // 240 - 5400 = -5160

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="page-header">
        <h1 class="page-title gradient-text">RULETA</h1>
        <p class="page-subtitle">Rojo x2 · Negro x2 · Verde x14</p>
      </div>

      <!-- Jackpot banner -->
      <div class="jackpot-banner" *ngIf="consecutiveGreens > 0"
           [class.hot]="consecutiveGreens >= 2">
        🔥 RACHA VERDE: {{ consecutiveGreens }}/3 — BOTE:
        <strong>{{ accumulatedJackpot | number:'1.0-0' }} coins</strong>
      </div>

      <!-- Roulette wheel -->
      <div class="wheel-section">
        <div class="wheel-wrapper">
          <div class="wheel-indicator"></div>
          <div class="wheel-fade-left"></div>
          <div class="wheel-fade-right"></div>
          <div class="wheel-track" [style.transform]="'translateX(' + wheelTx + 'px)'"
               [class.spinning]="isSpinning">
            <div
              *ngFor="let item of strip; trackBy: trackByIdx"
              class="wheel-item"
              [class.green]="item.color === 'green'"
              [class.red]="item.color === 'red'"
              [class.black]="item.color === 'black'"
            >{{ item.n }}</div>
          </div>
        </div>
      </div>

      <!-- Main content: bets + timer -->
      <div class="content-grid">

        <!-- Bet columns -->
        <div class="bet-section">
          <div class="bet-columns">
            <!-- BLACK -->
            <div class="bet-col black-col">
              <div class="bet-col-header">
                <span class="bet-color-dot black-dot"></span>
                <span class="bet-label">NEGRO</span>
                <span class="bet-multi">x2</span>
              </div>
              <div class="bet-input-row">
                <input type="number" [(ngModel)]="betBlack" min="1" [max]="userBalance"
                  class="bet-input" placeholder="Cantidad" [disabled]="!canBet"/>
                <button class="btn btn-bet black-btn" (click)="bet('black')"
                  [disabled]="!canBet || !betBlack || betBlack < 1">APOSTAR</button>
              </div>
              <div class="my-bets" *ngIf="myBetsForColor('black').length > 0">
                <div *ngFor="let b of myBetsForColor('black')" class="my-bet-chip black-chip">
                  {{ b.amount | number:'1.0-0' }}
                </div>
              </div>
              <div class="col-total" *ngIf="totalForColor('black') > 0">
                Total: {{ totalForColor('black') | number:'1.0-0' }}
              </div>
            </div>

            <!-- GREEN -->
            <div class="bet-col green-col">
              <div class="bet-col-header">
                <span class="bet-color-dot green-dot"></span>
                <span class="bet-label">VERDE</span>
                <span class="bet-multi">x14</span>
                <span class="jackpot-hint" *ngIf="accumulatedJackpot > 0">+BOTE</span>
              </div>
              <div class="bet-input-row">
                <input type="number" [(ngModel)]="betGreen" min="1" [max]="userBalance"
                  class="bet-input" placeholder="Cantidad" [disabled]="!canBet"/>
                <button class="btn btn-bet green-btn" (click)="bet('green')"
                  [disabled]="!canBet || !betGreen || betGreen < 1">APOSTAR</button>
              </div>
              <div class="my-bets" *ngIf="myBetsForColor('green').length > 0">
                <div *ngFor="let b of myBetsForColor('green')" class="my-bet-chip green-chip">
                  {{ b.amount | number:'1.0-0' }}
                </div>
              </div>
              <div class="col-total" *ngIf="totalForColor('green') > 0">
                Total: {{ totalForColor('green') | number:'1.0-0' }}
              </div>
            </div>

            <!-- RED -->
            <div class="bet-col red-col">
              <div class="bet-col-header">
                <span class="bet-color-dot red-dot"></span>
                <span class="bet-label">ROJO</span>
                <span class="bet-multi">x2</span>
              </div>
              <div class="bet-input-row">
                <input type="number" [(ngModel)]="betRed" min="1" [max]="userBalance"
                  class="bet-input" placeholder="Cantidad" [disabled]="!canBet"/>
                <button class="btn btn-bet red-btn" (click)="bet('red')"
                  [disabled]="!canBet || !betRed || betRed < 1">APOSTAR</button>
              </div>
              <div class="my-bets" *ngIf="myBetsForColor('red').length > 0">
                <div *ngFor="let b of myBetsForColor('red')" class="my-bet-chip red-chip">
                  {{ b.amount | number:'1.0-0' }}
                </div>
              </div>
              <div class="col-total" *ngIf="totalForColor('red') > 0">
                Total: {{ totalForColor('red') | number:'1.0-0' }}
              </div>
            </div>
          </div>

          <!-- Balance -->
          <div class="balance-row">
            <span class="balance-label">Tu balance:</span>
            <span class="balance-val">{{ userBalance | number:'1.0-0' }} coins</span>
          </div>
        </div>

        <!-- Timer + status -->
        <div class="timer-section">
          <div class="timer-wrap" *ngIf="phase === 'betting'">
            <svg class="timer-svg" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none"
                stroke="var(--bg-elevated)" stroke-width="6"/>
              <circle cx="40" cy="40" r="34" fill="none"
                [attr.stroke]="timerSeconds <= 5 ? 'var(--red)' : 'var(--accent)'"
                stroke-width="6"
                stroke-linecap="round"
                stroke-dasharray="213.6"
                [attr.stroke-dashoffset]="213.6 - (213.6 * timerSeconds / 20)"
                transform="rotate(-90 40 40)"
                style="transition: stroke-dashoffset 0.9s linear, stroke 0.3s"/>
            </svg>
            <span class="timer-number" [class.urgent]="timerSeconds <= 5">
              {{ timerSeconds }}
            </span>
          </div>
          <div class="calculating" *ngIf="phase === 'resolving'">
            CALCULANDO...
          </div>
          <div class="phase-label">
            {{ phase === 'betting' ? 'Tiempo para apostar' : 'Resolviendo ronda' }}
          </div>
        </div>
      </div>

      <!-- History dots -->
      <div class="history-section" *ngIf="history.length > 0">
        <span class="history-label">ÚLTIMAS RONDAS</span>
        <div class="history-dots">
          <div
            *ngFor="let h of history"
            class="history-dot"
            [class.green]="h.color === 'green'"
            [class.red]="h.color === 'red'"
            [class.black]="h.color === 'black'"
            [title]="h.result + ' — ' + (h.color | uppercase)"
          >{{ h.result }}</div>
        </div>
      </div>
    </div>

    <!-- Result overlay -->
    <div class="result-overlay" *ngIf="showResult && lastResult" (click)="dismissResult()">
      <div class="result-card" [class.green]="lastResult.color === 'green'"
           [class.red]="lastResult.color === 'red'"
           [class.black-card]="lastResult.color === 'black'">
        <div class="result-number">{{ lastResult.result }}</div>
        <div class="result-color-label">
          {{ colorLabel(lastResult.color) }}
          {{ lastResult.color === 'green' && lastResult.hasJackpot ? '+ BOTE' : '' }}
        </div>
        <div class="result-my-payout" *ngIf="myResultPayout !== null">
          <span *ngIf="myResultPayout > 0" class="payout-win">
            +{{ myResultPayout | number:'1.0-0' }} coins
          </span>
          <span *ngIf="myResultPayout === 0" class="payout-lose">
            Sin suerte esta vez
          </span>
        </div>
        <p class="result-dismiss-hint">Toca para cerrar</p>
      </div>
    </div>
  `,
  styles: [`
    .page {
      max-width: 900px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .page-header { text-align: center; margin-bottom: 1rem; }
    .page-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: clamp(1.8rem, 5vw, 3rem);
      font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0 0 0.25rem;
    }
    .page-subtitle { color: var(--text-muted); font-size: 13px; }

    /* Jackpot banner */
    .jackpot-banner {
      text-align: center;
      padding: 0.625rem 1rem;
      background: var(--green-muted);
      border: 1px solid rgba(74,222,128,0.25);
      border-radius: var(--radius-md);
      color: var(--green);
      font-size: 14px;
      margin-bottom: 1rem;
      animation: banner-pulse 2s ease-in-out infinite;
    }
    .jackpot-banner.hot {
      background: rgba(255,107,0,0.12);
      border-color: rgba(255,107,0,0.3);
      color: var(--accent);
      animation-duration: 1s;
    }
    @keyframes banner-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* Wheel */
    .wheel-section {
      margin-bottom: 1.5rem;
    }
    .wheel-wrapper {
      position: relative;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      height: 80px;
      overflow: hidden;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
    }
    .wheel-indicator {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--accent);
      transform: translateX(-50%);
      z-index: 3;
      box-shadow: 0 0 8px var(--accent);
    }
    .wheel-indicator::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      border-left: 8px solid transparent;
      border-right: 8px solid transparent;
      border-top: 10px solid var(--accent);
    }
    .wheel-fade-left, .wheel-fade-right {
      position: absolute;
      top: 0; bottom: 0;
      width: 80px;
      z-index: 2;
      pointer-events: none;
    }
    .wheel-fade-left  { left: 0;  background: linear-gradient(to right, var(--bg-surface), transparent); }
    .wheel-fade-right { right: 0; background: linear-gradient(to left, var(--bg-surface), transparent); }

    .wheel-track {
      display: flex;
      height: 80px;
      will-change: transform;
    }
    .wheel-track.spinning {
      transition: transform 4s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .wheel-item {
      width: 60px;
      height: 80px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Rajdhani', sans-serif;
      font-size: 22px;
      font-weight: 700;
      border-right: 1px solid rgba(0,0,0,0.3);
    }
    .wheel-item.green  { background: #166534; color: #4ade80; }
    .wheel-item.red    { background: #7f1d1d; color: #f87171; }
    .wheel-item.black  { background: #1a1a24; color: #9ca3af; }

    /* Content grid */
    .content-grid {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1.5rem;
      align-items: start;
      margin-bottom: 1.5rem;
    }

    /* Bet columns */
    .bet-columns {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.75rem;
    }
    .bet-col {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
    }
    .bet-col-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }
    .bet-color-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .black-dot { background: #6b7280; }
    .green-dot { background: #4ade80; }
    .red-dot   { background: #f87171; }
    .bet-label {
      font-family: 'Rajdhani', sans-serif;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.05em;
      flex: 1;
    }
    .bet-multi {
      font-size: 12px;
      font-weight: 700;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--bg-elevated);
      color: var(--text-muted);
    }
    .jackpot-hint {
      font-size: 10px;
      font-weight: 700;
      color: var(--green);
      padding: 1px 4px;
      background: var(--green-muted);
      border-radius: 4px;
    }
    .bet-input-row { display: flex; gap: 4px; }
    .bet-input {
      flex: 1;
      min-width: 0;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 13px;
      padding: 5px 8px;
      transition: border-color 0.15s;
    }
    .bet-input:focus { outline: none; border-color: var(--accent); }
    .bet-input:disabled { opacity: 0.4; }
    .btn-bet {
      padding: 5px 10px;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      transition: var(--transition);
      white-space: nowrap;
    }
    .btn-bet:disabled { opacity: 0.4; cursor: not-allowed; }
    .black-btn { background: #374151; color: #e5e7eb; }
    .black-btn:hover:not(:disabled) { background: #4b5563; }
    .green-btn { background: #166534; color: #4ade80; }
    .green-btn:hover:not(:disabled) { background: #15803d; }
    .red-btn   { background: #7f1d1d; color: #f87171; }
    .red-btn:hover:not(:disabled)   { background: #991b1b; }

    .my-bets { display: flex; flex-wrap: wrap; gap: 4px; }
    .my-bet-chip {
      padding: 2px 7px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }
    .black-chip { background: #374151; color: #e5e7eb; }
    .green-chip { background: var(--green-muted); color: var(--green); }
    .red-chip   { background: var(--red-muted); color: var(--red); }

    .col-total {
      font-size: 11px;
      color: var(--text-muted);
      text-align: right;
    }

    .balance-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      margin-top: 0.5rem;
    }
    .balance-label { font-size: 12px; color: var(--text-muted); }
    .balance-val { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; color: var(--gold); }

    /* Timer */
    .timer-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      min-width: 100px;
    }
    .timer-wrap {
      position: relative;
      width: 80px; height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .timer-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .timer-number {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--accent);
      position: relative;
      z-index: 1;
    }
    .timer-number.urgent { color: var(--red); }

    .calculating {
      font-family: 'Rajdhani', sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.1em;
      animation: blink 1s ease-in-out infinite;
      text-align: center;
      padding: 1rem 0;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .phase-label { font-size: 11px; color: var(--text-muted); text-align: center; }

    /* History */
    .history-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .history-label {
      font-size: 10px;
      font-weight: 700;
      color: var(--text-muted);
      letter-spacing: 0.1em;
      white-space: nowrap;
    }
    .history-dots {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .history-dot {
      width: 28px; height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      cursor: default;
    }
    .history-dot.green  { background: #166534; color: #4ade80; }
    .history-dot.red    { background: #7f1d1d; color: #f87171; }
    .history-dot.black  { background: #1a1a24; color: #6b7280; border: 1px solid var(--border-default); }

    /* Result overlay */
    .result-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.65);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 200;
      cursor: pointer;
      animation: fade-in 0.2s ease;
    }
    @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }

    .result-card {
      background: var(--bg-surface);
      border: 2px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 2.5rem 3rem;
      text-align: center;
      min-width: 280px;
      animation: pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1);
      cursor: default;
    }
    @keyframes pop-in {
      from { opacity: 0; transform: scale(0.7); }
      to   { opacity: 1; transform: scale(1); }
    }
    .result-card.green  { border-color: #4ade80; box-shadow: 0 0 40px rgba(74,222,128,0.2); }
    .result-card.red    { border-color: #f87171; box-shadow: 0 0 40px rgba(248,113,113,0.2); }
    .result-card.black-card { border-color: #6b7280; }

    .result-number {
      font-family: 'Rajdhani', sans-serif;
      font-size: 5rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.25rem;
    }
    .result-card.green  .result-number { color: #4ade80; }
    .result-card.red    .result-number { color: #f87171; }
    .result-card.black-card .result-number { color: #9ca3af; }

    .result-color-label {
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-secondary);
      margin-bottom: 1rem;
    }
    .result-my-payout { margin-bottom: 0.75rem; }
    .payout-win {
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--green);
    }
    .payout-lose { font-size: 14px; color: var(--text-muted); }
    .result-dismiss-hint { font-size: 11px; color: var(--text-muted); margin-top: 0.5rem; }
  `],
})
export class RouletteComponent implements OnInit, OnDestroy {
  strip = this.buildStrip();
  wheelTx = INITIAL_TX;
  isSpinning = false;

  phase: 'betting' | 'resolving' = 'betting';
  timerSeconds = 20;
  consecutiveGreens = 0;
  accumulatedJackpot = 0;

  currentRoundId: string | null = null;
  roundBets: RouletteBet[] = [];
  history: RouletteHistoryItem[] = [];

  betBlack: number | null = null;
  betGreen: number | null = null;
  betRed: number | null = null;

  showResult = false;
  lastResult: RouletteResult | null = null;
  myResultPayout: number | null = null;
  private resultTimeout: ReturnType<typeof setTimeout> | null = null;

  private subs: Subscription[] = [];

  get canBet(): boolean {
    return this.phase === 'betting' && this.timerSeconds > 0 && this.auth.isLoggedIn();
  }

  get userBalance(): number {
    return this.auth.user()?.balance ?? 0;
  }

  constructor(
    private roulette: RouletteService,
    private socket: SocketService,
    public auth: AuthService,
    private toast: ToastService,
  ) {}

  ngOnInit() {
    this.subs.push(
      this.socket.onRouletteNewRound().subscribe((round) => {
        this.onNewRound(round);
      }),
      this.socket.onRouletteTimer().subscribe((s) => {
        this.timerSeconds = s;
        this.phase = 'betting';
      }),
      this.socket.onRouletteBetPlaced().subscribe((bet) => {
        this.roundBets.push(bet);
      }),
      this.socket.onRouletteResult().subscribe((result) => {
        this.onResult(result);
      }),
    );

    this.socket.joinRoulette();
    this.loadInitialState();
    this.roulette.getHistory().subscribe((h) => (this.history = h.reverse()));
  }

  ngOnDestroy() {
    this.socket.leaveRoulette();
    this.subs.forEach((s) => s.unsubscribe());
    if (this.resultTimeout) clearTimeout(this.resultTimeout);
  }

  private loadInitialState() {
    this.roulette.getCurrentRound().subscribe((state) => {
      this.consecutiveGreens = state.consecutiveGreens;
      this.accumulatedJackpot = state.accumulatedJackpot;
      if (state.round) {
        this.currentRoundId = state.round.id;
        this.roundBets = state.round.bets ?? [];
        const msLeft = new Date(state.round.bettingEndsAt).getTime() - Date.now();
        this.timerSeconds = Math.max(0, Math.ceil(msLeft / 1000));
        this.phase = state.round.status === 'betting' ? 'betting' : 'resolving';
      }
    });
  }

  private onNewRound(payload: any) {
    this.phase = 'betting';
    this.timerSeconds = 20;
    this.currentRoundId = payload.id;
    this.roundBets = [];
    this.consecutiveGreens = payload.consecutiveGreens;
    this.accumulatedJackpot = payload.accumulatedJackpot;
    this.isSpinning = false;
    // Reset wheel instantly (no transition)
    this.wheelTx = INITIAL_TX;
  }

  private onResult(result: RouletteResult) {
    this.phase = 'resolving';
    this.consecutiveGreens = result.consecutiveGreens;
    this.accumulatedJackpot = result.accumulatedJackpot;
    this.history = [
      { id: result.roundId, result: result.result, color: result.color, potTotal: 0, createdAt: new Date().toISOString() },
      ...this.history,
    ].slice(0, 20);

    // Spin wheel
    this.spinTo(result.result);

    // Find my payout
    const userId = this.auth.user()?.id;
    if (userId) {
      const mine = result.payouts.filter((p) => p.userId === userId);
      if (mine.length > 0) {
        const totalPayout = mine.reduce((s, p) => s + p.payout, 0);
        const totalBet = mine.reduce((s, p) => s + p.amount, 0);
        this.myResultPayout = mine.some((p) => p.won) ? totalPayout : 0;
        if (mine.some((p) => p.won)) {
          this.auth.updateBalance(this.userBalance + totalPayout - totalBet);
        }
      } else {
        this.myResultPayout = null;
      }
    }

    // Show overlay after 4s (spin duration)
    setTimeout(() => {
      this.lastResult = result;
      this.showResult = true;
      if (this.resultTimeout) clearTimeout(this.resultTimeout);
      this.resultTimeout = setTimeout(() => this.dismissResult(), 4000);
    }, 4000);
  }

  private spinTo(resultN: number) {
    // Target item index: start at MID_ITEM (90), spin 5 full loops, land on resultN
    const targetIdx = MID_ITEM + 5 * NUMS.length + resultN; // 90 + 75 + n = 165+n
    const targetTx = CENTER_ANCHOR - targetIdx * ITEM_W;
    // Apply instantly first (no transition), then let the class add the transition
    this.isSpinning = false;
    setTimeout(() => {
      this.isSpinning = true;
      this.wheelTx = targetTx;
    }, 50);
  }

  dismissResult() {
    this.showResult = false;
    if (this.resultTimeout) clearTimeout(this.resultTimeout);
  }

  bet(color: string) {
    if (!this.canBet) return;
    const amountMap: Record<string, number | null> = {
      black: this.betBlack, green: this.betGreen, red: this.betRed,
    };
    const amount = amountMap[color];
    if (!amount || amount < 1) return;

    this.roulette.placeBet(color, amount).subscribe({
      next: (bet) => {
        if (color === 'black') this.betBlack = null;
        if (color === 'green') this.betGreen = null;
        if (color === 'red')   this.betRed = null;
        this.auth.updateBalance(this.userBalance - amount);
        this.toast.success(`Apuesta ${color} de ${amount} coins registrada`, 2500);
      },
      error: (err) => {
        this.toast.success(err?.error?.error || 'Error al apostar', 3000);
      },
    });
  }

  myBetsForColor(color: string): RouletteBet[] {
    const userId = this.auth.user()?.id;
    if (!userId) return [];
    return this.roundBets.filter((b) => b.color === color && b.userId === userId);
  }

  totalForColor(color: string): number {
    return this.roundBets
      .filter((b) => b.color === color)
      .reduce((s, b) => s + b.amount, 0);
  }

  colorLabel(color: string): string {
    return color === 'green' ? 'VERDE GANA x14' : color === 'red' ? 'ROJO GANA x2' : 'NEGRO GANA x2';
  }

  trackByIdx(index: number): number { return index; }

  private buildStrip() {
    const arr = [];
    for (let r = 0; r < REPEATS; r++) {
      for (const num of NUMS) arr.push(num);
    }
    return arr;
  }
}
