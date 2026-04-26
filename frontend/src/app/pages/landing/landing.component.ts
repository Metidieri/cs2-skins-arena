import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { GlobalStatsService } from '../../services/global-stats.service';
import { GlobalStats } from '../../models/global-stats.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-inner">
          <span class="kicker">CS2 SKINS</span>
          <h1 class="title">ARENA</h1>
          <p class="lead">
            Coinflip 1v1, jackpot multi-jugador y marketplace P2P.
            Apuesta tus skins, lanza la moneda, llévatelo todo.
          </p>
          <div class="cta-row">
            <a routerLink="/login" class="cta primary">ENTRAR</a>
            <a routerLink="/register" class="cta ghost">REGISTRARSE</a>
          </div>
        </div>
      </section>

      <section class="modes">
        <article class="mode">
          <div class="mode-icon">⚔️</div>
          <h3>COINFLIP</h3>
          <p>Reta a otro jugador, apuesta una skin, 50/50 verificable por seed.</p>
        </article>
        <article class="mode">
          <div class="mode-icon">🎰</div>
          <h3>JACKPOT</h3>
          <p>Mete tus skins al pot. Cuanto más apuestas, más probabilidad de llevarlo todo.</p>
        </article>
        <article class="mode">
          <div class="mode-icon">🛒</div>
          <h3>MARKETPLACE</h3>
          <p>Compra y vende skins entre jugadores. Filtros, paginación y tiempo real.</p>
        </article>
      </section>

      <section class="stats" *ngIf="stats() as s">
        <div class="stat-card">
          <span class="stat-label">PARTIDAS JUGADAS</span>
          <span class="stat-value">{{ s.totalGames | number:'1.0-0' }}</span>
          <span class="stat-meta">{{ s.coinflipsPlayed }} coinflips · {{ s.jackpotsResolved }} jackpots</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">COINS APOSTADAS</span>
          <span class="stat-value gold">{{ s.totalCoinsWagered | number:'1.0-0' }}</span>
          <span class="stat-meta">{{ s.totalCoinsWon | number:'1.0-0' }} repartidos en premios</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">JUGADORES</span>
          <span class="stat-value">{{ s.totalUsers | number:'1.0-0' }}</span>
          <span class="stat-meta">{{ s.totalSkins }} skins en circulación</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">MARKETPLACE</span>
          <span class="stat-value">{{ s.marketActive | number:'1.0-0' }}</span>
          <span class="stat-meta">listings activos · {{ s.marketSold }} vendidos</span>
        </div>
      </section>

      <footer class="foot">
        <p>Proyecto demo full-stack. No es una plataforma real de apuestas.</p>
      </footer>
    </main>
  `,
  styles: [`
    :host { display: block; background: #0a0a0f; min-height: 100vh; color: #e0e0e0; }
    .page { display: flex; flex-direction: column; }

    .hero {
      position: relative; padding: 5rem 1.5rem 4rem; text-align: center;
      overflow: hidden;
    }
    .hero-bg {
      position: absolute; inset: 0;
      background:
        radial-gradient(circle at 20% 20%, rgba(255,107,0,0.18) 0%, transparent 45%),
        radial-gradient(circle at 80% 60%, rgba(255,215,0,0.12) 0%, transparent 50%),
        linear-gradient(180deg, #0a0a0f 0%, #0a0a0f 100%);
      pointer-events: none;
    }
    .hero-inner { position: relative; max-width: 720px; margin: 0 auto; }
    .kicker {
      display: inline-block; color: #ff6b00; font-weight: 800;
      letter-spacing: 0.4em; font-size: 0.85rem; margin-bottom: 0.6rem;
    }
    .title {
      font-size: clamp(3rem, 9vw, 6rem); font-weight: 900;
      letter-spacing: 0.12em; line-height: 1; margin: 0 0 1rem;
      background: linear-gradient(180deg, #ffd700 0%, #ff6b00 70%);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      text-shadow: 0 8px 50px rgba(255,107,0,0.25);
    }
    .lead {
      color: #aaa; max-width: 560px; margin: 0 auto 2rem;
      font-size: 1.05rem; line-height: 1.5;
    }
    .cta-row { display: flex; gap: 0.8rem; justify-content: center; flex-wrap: wrap; }
    .cta {
      display: inline-block; padding: 0.95rem 1.6rem;
      border-radius: 10px; text-decoration: none;
      font-weight: 800; letter-spacing: 0.1em; font-size: 0.95rem;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .cta.primary {
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      box-shadow: 0 4px 22px rgba(255,107,0,0.4);
    }
    .cta.primary:hover { transform: translateY(-2px); box-shadow: 0 6px 26px rgba(255,107,0,0.55); }
    .cta.ghost {
      background: transparent; color: #ff6b00; border: 1.5px solid #ff6b00;
    }
    .cta.ghost:hover { background: rgba(255,107,0,0.08); transform: translateY(-2px); }

    .modes {
      max-width: 1100px; margin: 0 auto; padding: 1rem 1.5rem 2rem;
      display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    }
    .mode {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 14px;
      padding: 1.6rem 1.4rem; text-align: center;
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .mode:hover {
      transform: translateY(-4px); border-color: #ff6b00;
      box-shadow: 0 8px 26px rgba(0,0,0,0.5);
    }
    .mode-icon { font-size: 2.4rem; margin-bottom: 0.6rem; }
    .mode h3 {
      color: #ff6b00; margin: 0.3rem 0; font-size: 1.1rem; letter-spacing: 0.1em;
    }
    .mode p { color: #aaa; font-size: 0.9rem; line-height: 1.5; margin: 0; }

    .stats {
      max-width: 1100px; margin: 0 auto; padding: 1rem 1.5rem 3rem;
      display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
    .stat-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 12px;
      padding: 1.2rem 1.4rem; display: flex; flex-direction: column; gap: 0.3rem;
    }
    .stat-label {
      color: #666; font-size: 0.72rem; letter-spacing: 0.15em;
    }
    .stat-value {
      color: #e0e0e0; font-size: 1.85rem; font-weight: 900; line-height: 1.1;
    }
    .stat-value.gold {
      background: linear-gradient(180deg, #ffd700, #ff6b00);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .stat-meta { color: #888; font-size: 0.78rem; }

    .foot { text-align: center; color: #555; padding: 2rem 1rem 3rem; font-size: 0.8rem; }
  `],
})
export class LandingComponent implements OnInit {
  stats = signal<GlobalStats | null>(null);

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
}
