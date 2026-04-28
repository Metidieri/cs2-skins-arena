import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="nf-page">
      <div class="nf-card">
        <div class="nf-number">404</div>
        <div class="nf-glitch" aria-hidden="true">404</div>
        <h1 class="nf-title">Página no encontrada</h1>
        <p class="nf-sub">El destino al que intentaste acceder no existe o fue eliminado.</p>
        <div class="nf-actions">
          <a routerLink="/coinflip" class="btn btn-primary">Ir al lobby</a>
          <a routerLink="/" class="btn btn-ghost">Inicio</a>
        </div>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .nf-page {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      padding: 2rem;
      background: var(--bg-base);
    }
    .nf-card {
      text-align: center;
      max-width: 480px;
      width: 100%;
      display: flex; flex-direction: column; align-items: center; gap: 1rem;
      position: relative;
    }
    .nf-number {
      font-family: 'Rajdhani', sans-serif;
      font-size: clamp(80px, 18vw, 140px);
      font-weight: 700;
      line-height: 1;
      background: linear-gradient(180deg, var(--accent) 0%, var(--gold) 100%);
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: bounce-up 1.2s cubic-bezier(.36,.07,.19,.97) infinite alternate;
      position: relative; z-index: 1;
      letter-spacing: 0.04em;
    }
    @keyframes bounce-up {
      0% { transform: translateY(0); }
      100% { transform: translateY(-12px); }
    }
    .nf-glitch {
      position: absolute;
      top: 0; left: 50%; transform: translateX(-50%);
      font-family: 'Rajdhani', sans-serif;
      font-size: clamp(80px, 18vw, 140px);
      font-weight: 700;
      line-height: 1;
      color: var(--accent);
      opacity: 0.08;
      letter-spacing: 0.04em;
      pointer-events: none;
      animation: glitch 3s steps(2) infinite;
      filter: blur(2px);
    }
    @keyframes glitch {
      0%   { clip-path: inset(0 0 95% 0); transform: translateX(calc(-50% - 4px)); }
      25%  { clip-path: inset(30% 0 50% 0); transform: translateX(calc(-50% + 3px)); }
      50%  { clip-path: inset(60% 0 20% 0); transform: translateX(calc(-50% - 2px)); }
      75%  { clip-path: inset(80% 0 5% 0); transform: translateX(calc(-50% + 4px)); }
      100% { clip-path: inset(95% 0 0 0); transform: translateX(-50%); }
    }
    .nf-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 28px; font-weight: 700;
      color: var(--text-primary); margin: 0;
    }
    .nf-sub { color: var(--text-secondary); font-size: 14px; margin: 0; max-width: 360px; }
    .nf-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; margin-top: 0.5rem; }
  `],
})
export class NotFoundComponent {}
