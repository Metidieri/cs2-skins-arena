import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SkinsService } from '../../services/skins.service';
import { Skin } from '../../models/skin.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="navbar">
      <span class="logo">CS2 Skins Arena</span>
      <div class="nav-right">
        <span class="balance">{{ auth.user()?.balance | number:'1.0-0' }} coins</span>
        <span class="username">{{ auth.user()?.username }}</span>
        <a routerLink="/inventory" class="nav-link">Inventario</a>
        <button class="logout-btn" (click)="auth.logout()">Salir</button>
      </div>
    </nav>
    <main class="content">
      <h2>Marketplace</h2>
      <div class="skins-grid">
        <div class="skin-card" *ngFor="let skin of skins" [class]="'rarity-' + skin.rarity.toLowerCase()">
          <div class="skin-img">{{ skin.weapon }}</div>
          <h3>{{ skin.name }}</h3>
          <p class="weapon">{{ skin.weapon }}</p>
          <p class="price">{{ skin.price | number:'1.0-0' }} coins</p>
          <span class="rarity-badge">{{ skin.rarity }}</span>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .navbar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 2rem; background: #16161a; border-bottom: 1px solid #2a2a35;
    }
    .logo { color: #ff6b00; font-size: 1.3rem; font-weight: 700; }
    .nav-right { display: flex; align-items: center; gap: 1rem; }
    .balance { color: #ffd700; font-weight: 600; }
    .username { color: #e0e0e0; }
    .nav-link { color: #888; text-decoration: none; transition: color 0.2s; }
    .nav-link:hover { color: #ff6b00; }
    .logout-btn {
      background: transparent; border: 1px solid #ff4444; color: #ff4444;
      padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer;
    }
    .content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h2 { color: #e0e0e0; margin-bottom: 1.5rem; }
    .skins-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.2rem;
    }
    .skin-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 1.2rem; text-align: center; transition: transform 0.2s, border-color 0.2s;
    }
    .skin-card:hover { transform: translateY(-4px); border-color: #ff6b00; }
    .skin-img {
      background: #0a0a0f; border-radius: 8px; padding: 2rem; margin-bottom: 0.8rem;
      color: #555; font-size: 0.9rem;
    }
    h3 { color: #e0e0e0; font-size: 1rem; margin-bottom: 0.3rem; }
    .weapon { color: #888; font-size: 0.85rem; }
    .price { color: #ffd700; font-weight: 600; margin: 0.5rem 0; }
    .rarity-badge {
      display: inline-block; padding: 0.2rem 0.6rem; border-radius: 4px;
      font-size: 0.75rem; font-weight: 600;
    }
    .rarity-covert .rarity-badge { background: rgba(235,75,75,0.2); color: #eb4b4b; }
    .rarity-classified .rarity-badge { background: rgba(211,44,230,0.2); color: #d32ce6; }
  `],
})
export class HomeComponent implements OnInit {
  skins: Skin[] = [];

  constructor(public auth: AuthService, private skinsService: SkinsService) {}

  ngOnInit() {
    this.skinsService.getAll().subscribe((skins) => (this.skins = skins));
  }
}
