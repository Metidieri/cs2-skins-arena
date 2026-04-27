import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChildren,
  QueryList,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GlobalStatsService } from '../../services/global-stats.service';
import { GlobalStats } from '../../models/global-stats.model';

interface CounterStat {
  key: keyof GlobalStats;
  label: string;
  format: 'int' | 'compact';
}

const STAT_DEFS: CounterStat[] = [
  { key: 'totalGames', label: 'Partidas', format: 'int' },
  { key: 'totalCoinsWagered', label: 'Coins apostadas', format: 'compact' },
  { key: 'totalUsers', label: 'Jugadores', format: 'int' },
  { key: 'marketActive', label: 'Listings activos', format: 'int' },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="landing">
      <!-- HERO fullscreen -->
      <section class="hero">
        <div class="hero-pattern"></div>
        <div class="hero-glow"></div>

        <div class="hero-content">
          <span class="kicker">CS2</span>
          <h1 class="hero-title">ARENA</h1>
          <p class="hero-sub">
            Coinflip 1v1, jackpot multi-jugador y marketplace P2P de skins.<br />
            Apuesta, lanza la moneda, llévatelo todo.
          </p>
          <div class="hero-cta">
            <a routerLink="/login" class="btn btn-primary btn-lg">ENTRAR</a>
            <a routerLink="/register" class="btn btn-ghost btn-lg">REGISTRARSE</a>
          </div>
        </div>

        <a class="scroll-hint" href="#modes" aria-label="Ver modos">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"></path>
          </svg>
        </a>
      </section>

      <!-- MODES -->
      <section id="modes" class="modes">
        <header class="section-head">
          <h2 class="section-title">Modos de juego</h2>
          <p>Elige cómo quieres apostar tus skins.</p>
        </header>

        <div class="modes-grid">
          <article class="mode-card">
            <div class="mode-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M12 7v10M9.5 9.5h3.5a2 2 0 010 4h-3a2 2 0 000 4h4"></path>
              </svg>
            </div>
            <h3>Coinflip</h3>
            <p>1 vs 1. Apuesta una skin, el seed determina el ganador. Verificable.</p>
          </article>

          <article class="mode-card">
            <div class="mode-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 4h12v4a6 6 0 01-12 0V4z"></path>
                <path d="M6 6H3.5a2 2 0 002 4H6M18 6h2.5a2 2 0 01-2 4H18"></path>
                <path d="M9 14h6M10 14v6h4v-6M8 20h8"></path>
              </svg>
            </div>
            <h3>Jackpot</h3>
            <p>Mete tus skins al pot. Cuanto más apuestas, más probabilidad de ganarlo todo.</p>
          </article>

          <article class="mode-card">
            <div class="mode-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l1-5h16l1 5"></path>
                <path d="M4 9v11h16V9"></path>
                <path d="M9 13h6"></path>
              </svg>
            </div>
            <h3>Marketplace</h3>
            <p>Compra y vende skins entre jugadores con filtros y tiempo real.</p>
          </article>
        </div>
      </section>

      <!-- STATS countup -->
      <section class="stats-section">
        <header class="section-head">
          <h2 class="section-title">En vivo en la arena</h2>
        </header>

        <div class="counters">
          <div class="counter" *ngFor="let s of statDefs; let i = index" #counter>
            <span class="counter-num">{{ formatStat(displayedValue(i), s.format) }}</span>
            <span class="counter-lbl">{{ s.label }}</span>
          </div>
        </div>
      </section>

      <footer class="legal">
        <p>
          Proyecto demo full-stack. No es una plataforma real de apuestas
          y no acepta depósitos con dinero real.
        </p>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    /* Romper el padding 2rem del .main-content para hero fullscreen */
    .landing { margin: -2rem; }

    .hero {
      position: relative;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: var(--bg-base);
      padding: 2rem;
    }
    .hero-pattern {
      position: absolute; inset: 0;
      background-image:
        radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
      background-size: 24px 24px;
      mask-image: radial-gradient(ellipse at center, #000 0%, transparent 75%);
      pointer-events: none;
    }
    .hero-glow {
      position: absolute; inset: 0;
      background: radial-gradient(
        ellipse at 50% 35%,
        rgba(255,107,0,0.2) 0%,
        transparent 50%
      );
      pointer-events: none;
    }
    .hero-content {
      position: relative;
      text-align: center;
      max-width: 780px;
    }
    .kicker {
      display: inline-block;
      color: var(--accent);
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      letter-spacing: 0.45em;
      font-size: 18px;
      margin-bottom: 0.4rem;
    }
    .hero-title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: clamp(64px, 12vw, 96px);
      letter-spacing: 0.08em;
      line-height: 1;
      margin: 0 0 1.4rem;
      background: linear-gradient(180deg, var(--accent) 0%, var(--gold) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
      text-shadow: 0 8px 60px rgba(255,107,0,0.3);
    }
    .hero-sub {
      color: var(--text-secondary);
      font-size: 18px;
      line-height: 1.6;
      margin: 0 auto 2rem;
      max-width: 540px;
    }
    .hero-cta { display: flex; gap: 0.8rem; justify-content: center; flex-wrap: wrap; }
    .btn-lg {
      padding: 0.95rem 1.8rem;
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px;
      letter-spacing: 0.08em;
      border-radius: var(--radius-md);
    }

    .scroll-hint {
      position: absolute;
      bottom: 1.5rem; left: 50%; transform: translateX(-50%);
      color: var(--text-muted);
      animation: bounce 2s infinite;
    }
    .scroll-hint svg { width: 28px; height: 28px; }
    @keyframes bounce {
      0%, 100% { transform: translate(-50%, 0); }
      50% { transform: translate(-50%, 6px); }
    }

    /* Section heads */
    .section-head { text-align: center; margin-bottom: 2rem; }
    .section-title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 32px;
      color: var(--text-primary);
      margin: 0;
    }
    .section-head p { color: var(--text-secondary); margin: 6px 0 0; }

    /* Modes */
    .modes { padding: 5rem 2rem; max-width: 1100px; margin: 0 auto; }
    .modes-grid {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    }
    .mode-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 2rem 1.6rem;
      text-align: center;
      transition: var(--transition);
    }
    .mode-card:hover {
      transform: translateY(-4px);
      border-color: var(--accent);
      box-shadow: 0 10px 30px rgba(0,0,0,0.4), var(--accent-glow);
    }
    .mode-icon {
      width: 64px; height: 64px;
      margin: 0 auto 1rem;
      border-radius: 16px;
      background: var(--accent-muted);
      color: var(--accent);
      display: flex; align-items: center; justify-content: center;
    }
    .mode-icon svg { width: 32px; height: 32px; }
    .mode-card h3 {
      font-family: 'Rajdhani', sans-serif;
      font-size: 22px;
      color: var(--text-primary);
      margin: 0 0 0.4rem;
    }
    .mode-card p { color: var(--text-secondary); font-size: 14px; margin: 0; }

    /* Stats counters */
    .stats-section { padding: 4rem 2rem; max-width: 1100px; margin: 0 auto; }
    .counters {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }
    .counter {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1.5rem;
      text-align: center;
      display: flex; flex-direction: column; gap: 6px;
    }
    .counter-num {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 36px;
      line-height: 1;
      background: linear-gradient(180deg, var(--gold) 0%, var(--accent) 100%);
      -webkit-background-clip: text;
      background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .counter-lbl {
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    /* Legal */
    .legal {
      padding: 2rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 12px;
      border-top: 1px solid var(--border-subtle);
    }
    .legal p { margin: 0; }
  `],
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  statDefs = STAT_DEFS;
  stats = signal<GlobalStats | null>(null);
  current = signal<number[]>([0, 0, 0, 0]);

  @ViewChildren('counter') counterEls!: QueryList<ElementRef<HTMLElement>>;

  private observer?: IntersectionObserver;
  private rafIds: number[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    private statsSvc: GlobalStatsService,
  ) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.router.navigate(['/coinflip']);
      return;
    }
    this.statsSvc.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set(null),
    });
  }

  ngAfterViewInit() {
    this.observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const idx = this.counterEls.toArray().findIndex(
            (ref) => ref.nativeElement === e.target,
          );
          if (idx >= 0) this.animateCounter(idx);
          this.observer?.unobserve(e.target);
        }
      }
    }, { threshold: 0.4 });
    this.counterEls.forEach((el) => this.observer!.observe(el.nativeElement));
  }

  ngOnDestroy() {
    this.observer?.disconnect();
    this.rafIds.forEach((id) => cancelAnimationFrame(id));
  }

  displayedValue(index: number): number {
    return this.current()[index] || 0;
  }

  formatStat(value: number, format: 'int' | 'compact'): string {
    if (format === 'compact') {
      if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
      if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
      return Math.round(value).toLocaleString();
    }
    return Math.round(value).toLocaleString();
  }

  private animateCounter(index: number) {
    const data = this.stats();
    if (!data) return;
    const target = Number(data[this.statDefs[index].key]) || 0;
    const start = performance.now();
    const duration = 1200;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = target * eased;
      this.current.update((arr) => {
        const next = [...arr];
        next[index] = value;
        return next;
      });
      if (t < 1) {
        this.rafIds.push(requestAnimationFrame(step));
      }
    };
    this.rafIds.push(requestAnimationFrame(step));
  }
}
