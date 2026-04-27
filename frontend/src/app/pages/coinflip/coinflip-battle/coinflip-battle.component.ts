import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { BattleService } from '../../../services/battle.service';
import { SocketService } from '../../../services/socket.service';
import { Battle, BattleResolvedEvent, BattleSkin, BattlePlayer } from '../../../models/battle.model';

type DisplayState = 'loading' | 'waiting' | 'flipping' | 'completed';
type BotState = 'idle' | 'calling' | 'done';

const RARITY_COLORS: Record<string, string> = {
  consumer: '#b0c3d9', industrial: '#5e98d9',
  milspec: '#4b69ff', 'mil-spec': '#4b69ff',
  restricted: '#8847ff', classified: '#d32ce6',
  covert: '#eb4b4b', contraband: '#e4ae39',
};

@Component({
  selector: 'app-coinflip-battle',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <div class="back-row">
        <a routerLink="/coinflip" class="back">← Volver al lobby</a>
        <span class="battle-id">Batalla #{{ battleId }}</span>
      </div>

      <div *ngIf="display() === 'loading'" class="loading">
        <div class="spinner-big"></div>
        <p>Cargando batalla...</p>
      </div>

      <ng-container *ngIf="display() !== 'loading' && battle()">
        <!-- Resultado central (heads/tails / VS) -->
        <div class="center-status" [class.flipping]="display() === 'flipping'" [class.completed]="display() === 'completed'">
          <div *ngIf="display() === 'waiting'" class="waiting-status">
            <div class="spinner"></div>
            <p>Esperando rival...</p>
            <button class="copy-link" (click)="copyLink()">
              {{ linkCopied() ? '✓ ENLACE COPIADO' : '📋 COPIAR ENLACE' }}
            </button>
            <button class="call-bot-btn" (click)="callBot()"
              [disabled]="botState() !== 'idle'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                   stroke-linecap="round" stroke-linejoin="round" width="16" height="16">
                <rect x="3" y="11" width="18" height="11" rx="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <circle cx="12" cy="16" r="1"></circle>
                <line x1="8" y1="16" x2="8" y2="16"></line>
                <line x1="16" y1="16" x2="16" y2="16"></line>
              </svg>
              {{ botState() === 'calling' ? 'LLAMANDO BOT...' : 'LLAMAR BOT' }}
            </button>
          </div>

          <div *ngIf="display() === 'flipping'" class="coin-wrap">
            <div class="coin">
              <div class="coin-face heads">H</div>
              <div class="coin-face tails">T</div>
            </div>
            <p class="flip-label">LANZANDO LA MONEDA...</p>
          </div>

          <div *ngIf="display() === 'completed'" class="result-block">
            <span class="result-label">RESULTADO</span>
            <h2 class="result"
                [class.heads]="resolved()?.result === 'heads'"
                [class.tails]="resolved()?.result === 'tails'">
              {{ (resolved()?.result || battle()?.result || '').toUpperCase() }}
            </h2>
          </div>
        </div>

        <!-- Arena dos columnas -->
        <div class="arena">
          <div class="player-card"
               [class.winner]="display() === 'completed' && isWinner('A')"
               [class.loser]="display() === 'completed' && isWinner('B')">
            <div class="avatar-big">{{ initial(battle()!.playerA?.username) }}</div>
            <div class="username-big">{{ battle()!.playerA?.username || '???' }}</div>
            <div class="skin-frame"
                 [style.box-shadow]="'inset 0 -4px 0 ' + rarityColor(battle()!.skinA?.rarity)">
              <img *ngIf="battle()!.skinA?.imageUrl" [src]="battle()!.skinA?.imageUrl" />
              <span *ngIf="!battle()!.skinA?.imageUrl" class="fallback">?</span>
            </div>
            <div class="skin-name">{{ battle()!.skinA?.name }}</div>
            <div class="skin-meta">{{ battle()!.skinA?.weapon }}</div>
            <div class="skin-price">{{ battle()!.skinA?.price | number:'1.0-0' }} coins</div>
            <div *ngIf="display() === 'completed' && isWinner('A')" class="trophy">🏆 GANADOR</div>
          </div>

          <div class="vs-divider">VS</div>

          <div class="player-card"
               [class.winner]="display() === 'completed' && isWinner('B')"
               [class.loser]="display() === 'completed' && isWinner('A')"
               [class.empty-slot]="!battle()?.playerB">
            <ng-container *ngIf="battle()!.playerB; else waitingSlot">
              <div class="avatar-big">{{ initial(battle()!.playerB?.username) }}</div>
              <div class="username-big">{{ battle()!.playerB?.username }}</div>
              <div class="skin-frame"
                   [style.box-shadow]="'inset 0 -4px 0 ' + rarityColor(battle()!.skinB?.rarity)">
                <img *ngIf="battle()!.skinB?.imageUrl" [src]="battle()!.skinB?.imageUrl" />
                <span *ngIf="!battle()!.skinB?.imageUrl" class="fallback">?</span>
              </div>
              <div class="skin-name">{{ battle()!.skinB?.name }}</div>
              <div class="skin-meta">{{ battle()!.skinB?.weapon }}</div>
              <div class="skin-price">{{ battle()!.skinB?.price | number:'1.0-0' }} coins</div>
              <div *ngIf="display() === 'completed' && isWinner('B')" class="trophy">🏆 GANADOR</div>
            </ng-container>
            <ng-template #waitingSlot>
              <div class="avatar-big placeholder">?</div>
              <div class="username-big placeholder-text">Esperando jugador...</div>
              <div class="skin-frame placeholder">
                <span class="fallback">?</span>
              </div>
            </ng-template>
          </div>
        </div>

        <!-- Footer con seed y volver -->
        <div *ngIf="display() === 'completed'" class="footer">
          <div class="seed-row">
            <span class="seed-label">SEED:</span>
            <code class="seed">{{ resolved()?.seed || battle()?.seed }}</code>
            <button class="seed-copy" (click)="copySeed()">
              {{ seedCopied() ? '✓' : '📋' }}
            </button>
          </div>
          <button class="back-btn" (click)="goLobby()">VOLVER AL LOBBY</button>
        </div>
      </ng-container>
    </main>

    <!-- Toast resultado -->
    <div *ngIf="toast()" class="toast" [class.win]="toast()?.type === 'win'" [class.lose]="toast()?.type === 'lose'">
      {{ toast()?.message }}
    </div>
  `,
  styles: [`
    :host { display: block; background: #0a0a0f; min-height: 100vh; color: #e0e0e0; }
    .page { max-width: 1200px; margin: 0 auto; padding: 2rem; }
    .back-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem;
    }
    .back {
      color: #888; text-decoration: none; font-weight: 500;
      transition: color 0.2s;
    }
    .back:hover { color: #ff6b00; }
    .battle-id {
      color: #555; font-size: 0.85rem;
      font-family: 'Courier New', monospace;
    }

    .loading { text-align: center; padding: 5rem 0; color: #888; }

    /* Center status */
    .center-status {
      text-align: center; padding: 1.5rem 0 2rem;
      min-height: 180px;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .waiting-status p {
      color: #888; margin: 1rem 0; font-size: 1.1rem; letter-spacing: 0.05em;
    }
    .spinner, .spinner-big {
      width: 48px; height: 48px; border-radius: 50%;
      border: 3px solid #2a2a35; border-top-color: #ff6b00;
      animation: spin 0.8s linear infinite;
    }
    .spinner-big { width: 60px; height: 60px; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .copy-link {
      background: transparent; border: 1.5px solid #ff6b00; color: #ff6b00;
      padding: 0.65rem 1.3rem; border-radius: 8px; font-weight: 700;
      letter-spacing: 0.06em; cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .copy-link:hover { background: #ff6b00; color: #fff; }

    .call-bot-btn {
      display: flex; align-items: center; gap: 6px;
      background: transparent; border: 1.5px solid var(--rarity-milspec, #4b69ff);
      color: var(--rarity-milspec, #4b69ff);
      padding: 0.65rem 1.3rem; border-radius: 8px; font-weight: 700;
      letter-spacing: 0.06em; cursor: pointer;
      transition: background 0.2s, color 0.2s;
      margin-top: 0.5rem;
    }
    .call-bot-btn:hover:not(:disabled) { background: var(--rarity-milspec, #4b69ff); color: #fff; }
    .call-bot-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* Coin flip */
    .coin-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .coin {
      width: 110px; height: 110px;
      position: relative; transform-style: preserve-3d;
      animation: flip 0.6s linear infinite;
    }
    @keyframes flip {
      0% { transform: rotateY(0deg); }
      100% { transform: rotateY(360deg); }
    }
    .coin-face {
      position: absolute; inset: 0;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 3rem; font-weight: 900;
      color: #fff; backface-visibility: hidden;
      box-shadow: 0 0 30px rgba(255,107,0,0.5);
    }
    .coin-face.heads { background: radial-gradient(circle at 30% 30%, #ff8a3d, #ff6b00); }
    .coin-face.tails {
      background: radial-gradient(circle at 30% 30%, #818bff, #6366f1);
      transform: rotateY(180deg);
      box-shadow: 0 0 30px rgba(99,102,241,0.5);
    }
    .flip-label {
      color: #ff6b00; font-weight: 800; letter-spacing: 0.15em;
      animation: pulseText 0.7s infinite alternate;
      margin: 0;
    }
    @keyframes pulseText { from { opacity: 0.5; } to { opacity: 1; } }

    /* Result block */
    .result-block { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
    .result-label { color: #666; font-size: 0.85rem; letter-spacing: 0.18em; }
    .result {
      font-size: 4rem; font-weight: 900; letter-spacing: 0.12em;
      margin: 0; line-height: 1;
      animation: pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .result.heads { color: #ff6b00; text-shadow: 0 0 30px rgba(255,107,0,0.5); }
    .result.tails { color: #6366f1; text-shadow: 0 0 30px rgba(99,102,241,0.5); }
    @keyframes pop {
      0% { transform: scale(0.6); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }

    /* Arena */
    .arena {
      display: grid; grid-template-columns: 1fr auto 1fr;
      gap: 2rem; align-items: stretch;
      margin-top: 1rem;
    }
    @media (max-width: 760px) {
      .arena { grid-template-columns: 1fr; }
      .vs-divider { justify-self: center; }
    }
    .vs-divider {
      align-self: center; font-weight: 900; font-size: 2.3rem;
      color: #ff6b00; letter-spacing: 0.15em;
      text-shadow: 0 0 18px rgba(255,107,0,0.45);
    }

    .player-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 16px;
      padding: 1.6rem; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      transition: transform 0.4s ease, box-shadow 0.4s ease, border-color 0.4s ease, opacity 0.4s ease;
    }
    .player-card.empty-slot { border-style: dashed; opacity: 0.6; }
    .player-card.winner {
      transform: scale(1.05); border-color: #ffd700;
      box-shadow: 0 0 40px rgba(255,215,0,0.35);
    }
    .player-card.loser { opacity: 0.5; }

    .avatar-big {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      color: #fff; font-weight: 800; font-size: 2rem;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 0.4rem;
    }
    .avatar-big.placeholder { background: #1a1a25; color: #444; }
    .username-big { font-size: 1.2rem; font-weight: 700; }
    .placeholder-text { color: #555; font-style: italic; }

    .skin-frame {
      background: #0a0a0f; border-radius: 12px; padding: 1rem;
      width: 100%; min-height: 180px;
      display: flex; align-items: center; justify-content: center;
      margin: 0.6rem 0;
    }
    .skin-frame.placeholder { border: 1px dashed #2a2a35; box-shadow: none !important; }
    .skin-frame img { max-width: 95%; max-height: 160px; object-fit: contain; }
    .skin-frame .fallback { color: #444; font-size: 3rem; }

    .skin-name { color: #e0e0e0; font-weight: 600; }
    .skin-meta { color: #888; font-size: 0.85rem; }
    .skin-price {
      color: #ff6b00; font-weight: 800; font-size: 1.1rem; margin-top: 0.2rem;
    }
    .trophy {
      margin-top: 0.7rem; padding: 0.5rem 1rem;
      background: rgba(255,215,0,0.15); color: #ffd700;
      border: 1px solid #ffd700; border-radius: 8px;
      font-weight: 800; letter-spacing: 0.1em;
    }

    .footer { margin-top: 2rem; text-align: center; }
    .seed-row {
      display: inline-flex; align-items: center; gap: 0.5rem;
      background: #16161a; border: 1px solid #2a2a35; border-radius: 8px;
      padding: 0.5rem 0.9rem; margin-bottom: 1.2rem;
      flex-wrap: wrap; max-width: 100%;
    }
    .seed-label { color: #666; font-size: 0.78rem; letter-spacing: 0.1em; }
    .seed {
      color: #888; font-size: 0.78rem;
      font-family: 'Courier New', monospace; word-break: break-all;
    }
    .seed-copy {
      background: transparent; border: 1px solid #2a2a35;
      color: #888; cursor: pointer; padding: 0.2rem 0.5rem;
      border-radius: 5px; font-size: 0.85rem;
    }
    .seed-copy:hover { color: #ff6b00; border-color: #ff6b00; }
    .back-btn {
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      border: none; padding: 0.95rem 2rem; border-radius: 10px;
      font-weight: 800; letter-spacing: 0.1em; cursor: pointer;
      box-shadow: 0 4px 18px rgba(255,107,0,0.35);
      transition: transform 0.15s;
    }
    .back-btn:hover { transform: translateY(-2px); }

    /* Toast */
    .toast {
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
      padding: 1rem 1.6rem; border-radius: 10px;
      font-weight: 700; z-index: 200;
      box-shadow: 0 10px 30px rgba(0,0,0,0.55);
      animation: toastUp 0.3s ease-out;
    }
    .toast.win { background: #14241c; color: #6bff8f; border: 1px solid #4caf50; }
    .toast.lose { background: #2b1414; color: #ff6b6b; border: 1px solid #ff4444; }
    @keyframes toastUp {
      from { transform: translate(-50%, 20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `],
})
export class CoinflipBattleComponent implements OnInit, OnDestroy {
  battleId = '';
  battle = signal<Battle | null>(null);
  resolved = signal<BattleResolvedEvent | null>(null);
  display = signal<DisplayState>('loading');
  toast = signal<{ type: 'win' | 'lose'; message: string } | null>(null);
  linkCopied = signal(false);
  seedCopied = signal(false);
  botState = signal<BotState>('idle');

  private subs: Subscription[] = [];
  private resolveTimer?: any;
  private completionShown = false;

  constructor(
    public auth: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private battleService: BattleService,
    private socket: SocketService,
  ) {}

  ngOnInit() {
    this.battleId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.battleId) {
      this.router.navigate(['/coinflip']);
      return;
    }

    this.socket.joinBattle(this.battleId);

    this.battleService.getBattleById(this.battleId).subscribe({
      next: (b) => {
        this.battle.set(b);
        if (b.status === 'completed') {
          this.startFlipThenComplete({
            battleId: String(b.id),
            winnerId: String(b.winnerId),
            winnerUsername:
              String(b.winnerId) === String(b.playerAId)
                ? b.playerA?.username || ''
                : b.playerB?.username || '',
            result: (b.result as 'heads' | 'tails') || 'heads',
            seed: b.seed,
            skinA: b.skinA,
            skinB: b.skinB,
            playerA: b.playerA,
            playerB: b.playerB,
          });
        } else if (b.status === 'in_progress') {
          this.display.set('flipping');
        } else {
          this.display.set('waiting');
        }
      },
      error: () => {
        this.router.navigate(['/coinflip']);
      },
    });

    this.subs.push(
      this.socket.onBattleResolved().subscribe((ev) => {
        if (String(ev.battleId) !== String(this.battleId)) return;
        this.startFlipThenComplete(ev);
      }),
    );
  }

  ngOnDestroy() {
    this.socket.leaveBattle(this.battleId);
    this.subs.forEach((s) => s.unsubscribe());
    if (this.resolveTimer) clearTimeout(this.resolveTimer);
  }

  private startFlipThenComplete(ev: BattleResolvedEvent) {
    if (this.completionShown) return;
    this.resolved.set(ev);
    this.battle.update((b) =>
      b
        ? {
            ...b,
            status: 'completed',
            result: ev.result,
            winnerId: ev.winnerId,
            seed: ev.seed,
            playerA: ev.playerA || b.playerA,
            playerB: ev.playerB || b.playerB,
            skinA: ev.skinA || b.skinA,
            skinB: ev.skinB || b.skinB,
          }
        : b,
    );

    if (this.display() !== 'flipping') {
      this.display.set('flipping');
    }

    this.resolveTimer = setTimeout(() => {
      this.display.set('completed');
      this.completionShown = true;
      this.maybeShowOutcomeToast(ev);
    }, 3000);
  }

  private maybeShowOutcomeToast(ev: BattleResolvedEvent) {
    const me = this.auth.user()?.id;
    if (me == null) return;
    const winnerId = String(ev.winnerId);
    const isWinner = String(me) === winnerId;
    const wonSkinName = isWinner
      ? winnerId === String(ev.playerA?.id)
        ? ev.skinB?.name
        : ev.skinA?.name
      : winnerId === String(ev.playerA?.id)
        ? ev.skinA?.name
        : ev.skinB?.name;
    const lostSkinName = !isWinner
      ? String(me) === String(ev.playerA?.id)
        ? ev.skinA?.name
        : ev.skinB?.name
      : '';

    if (isWinner) {
      this.toast.set({ type: 'win', message: `¡Has ganado ${wonSkinName || 'la skin rival'}!` });
    } else {
      this.toast.set({ type: 'lose', message: `Has perdido ${lostSkinName || 'tu skin'}` });
    }
    setTimeout(() => this.toast.set(null), 5000);
  }

  isWinner(side: 'A' | 'B'): boolean {
    const b = this.battle();
    if (!b || b.status !== 'completed') return false;
    const winnerId = String(b.winnerId);
    const playerId = side === 'A' ? String(b.playerAId) : String(b.playerBId);
    return winnerId === playerId;
  }

  initial(name?: string) {
    return (name?.charAt(0) || '?').toUpperCase();
  }

  rarityColor(r?: string) {
    if (!r) return '#888';
    return RARITY_COLORS[r.toLowerCase().replace(/\s+/g, '')] || '#888';
  }

  copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      this.linkCopied.set(true);
      setTimeout(() => this.linkCopied.set(false), 2200);
    });
  }

  copySeed() {
    const seed = this.resolved()?.seed || this.battle()?.seed || '';
    navigator.clipboard.writeText(seed).then(() => {
      this.seedCopied.set(true);
      setTimeout(() => this.seedCopied.set(false), 2200);
    });
  }

  goLobby() {
    this.router.navigate(['/coinflip']);
  }

  callBot() {
    if (this.botState() !== 'idle') return;
    this.botState.set('calling');
    this.battleService.callBot(this.battleId).subscribe({
      next: () => {
        this.botState.set('done');
      },
      error: () => {
        this.botState.set('idle');
        this.toast.set({ type: 'lose', message: 'No hay bots disponibles ahora mismo' });
        setTimeout(() => this.toast.set(null), 3000);
      },
    });
  }
}
