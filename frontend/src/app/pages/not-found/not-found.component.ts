import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <main class="page">
      <div class="card">
        <div class="ghost">404</div>
        <h1>Página no encontrada</h1>
        <p>El destino al que intentaste acceder no existe o fue movido.</p>
        <a routerLink="/" class="cta">VOLVER AL INICIO</a>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; }
    .page {
      min-height: 100vh; background: #0a0a0f; color: #e0e0e0;
      display: flex; align-items: center; justify-content: center;
      padding: 2rem;
    }
    .card {
      background: linear-gradient(135deg, #16161a 0%, #1f1216 100%);
      border: 1px solid #2a2a35; border-radius: 16px;
      padding: 3rem 2.5rem; text-align: center; max-width: 460px;
      box-shadow: 0 0 60px rgba(255,107,0,0.08);
    }
    .ghost {
      font-size: 6rem; font-weight: 900; line-height: 1; margin-bottom: 0.4rem;
      background: linear-gradient(180deg, #ff6b00, #ffd700);
      -webkit-background-clip: text; background-clip: text; color: transparent;
      letter-spacing: 0.06em;
    }
    h1 { color: #e0e0e0; margin: 0.4rem 0; font-size: 1.5rem; }
    p { color: #888; margin: 0.4rem 0 1.6rem; }
    .cta {
      display: inline-block;
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      padding: 0.85rem 1.6rem; border-radius: 10px;
      text-decoration: none; font-weight: 800; letter-spacing: 0.08em;
      box-shadow: 0 4px 18px rgba(255,107,0,0.32);
      transition: transform 0.15s;
    }
    .cta:hover { transform: translateY(-2px); }
  `],
})
export class NotFoundComponent {}
