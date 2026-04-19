import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { StatsResponse } from '../../models/transaction.model';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <nav class="navbar">
      <a routerLink="/" class="logo">CS2 Skins Arena</a>
      <div class="nav-right">
        <span class="balance">{{ auth.user()?.balance | number:'1.0-0' }} coins</span>
        <a routerLink="/profile" class="nav-link">Perfil</a>
        <a routerLink="/history" class="nav-link">Historial</a>
        <a routerLink="/inventory" class="nav-link">Inventario</a>
        <button class="logout-btn" (click)="auth.logout()">Salir</button>
      </div>
    </nav>
    <main class="content" *ngIf="data">
      <h2>Estadísticas de {{ data.user.username }}</h2>

      <div class="kpi-grid">
        <div class="kpi win">
          <span class="label">Victorias</span>
          <span class="value">{{ data.stats.wins }}</span>
        </div>
        <div class="kpi loss">
          <span class="label">Derrotas</span>
          <span class="value">{{ data.stats.losses }}</span>
        </div>
        <div class="kpi">
          <span class="label">Win rate</span>
          <span class="value">{{ data.stats.winRate }}%</span>
        </div>
        <div class="kpi">
          <span class="label">Apuestas totales</span>
          <span class="value">{{ data.stats.totalBets }}</span>
        </div>
      </div>

      <div class="money-grid">
        <div class="money-card">
          <span class="label">Total ganado</span>
          <span class="value win">+{{ data.stats.totalWon | number:'1.0-2' }}</span>
        </div>
        <div class="money-card">
          <span class="label">Total perdido</span>
          <span class="value loss">-{{ data.stats.totalLost | number:'1.0-2' }}</span>
        </div>
        <div class="money-card">
          <span class="label">Ganancia neta</span>
          <span class="value" [class.win]="data.stats.netProfit >= 0" [class.loss]="data.stats.netProfit < 0">
            {{ data.stats.netProfit >= 0 ? '+' : '' }}{{ data.stats.netProfit | number:'1.0-2' }}
          </span>
        </div>
        <div class="money-card">
          <span class="label">Depositado</span>
          <span class="value gold">{{ data.stats.totalDeposited | number:'1.0-2' }}</span>
        </div>
      </div>

      <div class="progress-section">
        <div class="progress-header">
          <span>Win rate</span>
          <span>{{ data.stats.winRate }}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" [style.width.%]="data.stats.winRate"></div>
        </div>
      </div>

      <div class="inventory-summary">
        <div class="summary-card">
          <span class="label">Skins poseídas</span>
          <span class="value">{{ data.stats.inventoryCount }}</span>
        </div>
        <div class="summary-card">
          <span class="label">Valor del inventario</span>
          <span class="value gold">{{ data.stats.inventoryValue | number:'1.0-2' }} coins</span>
        </div>
      </div>
    </main>
    <p class="loading" *ngIf="!data">Cargando estadísticas...</p>
  `,
  styles: [`
    .navbar { display: flex; justify-content: space-between; align-items: center;
      padding: 1rem 2rem; background: #16161a; border-bottom: 1px solid #2a2a35; }
    .logo { color: #ff6b00; font-size: 1.3rem; font-weight: 700; text-decoration: none; }
    .nav-right { display: flex; align-items: center; gap: 1rem; }
    .balance { color: #ffd700; font-weight: 600; }
    .nav-link { color: #888; text-decoration: none; }
    .nav-link:hover { color: #ff6b00; }
    .logout-btn { background: transparent; border: 1px solid #ff4444; color: #ff4444;
      padding: 0.4rem 0.8rem; border-radius: 6px; cursor: pointer; }
    .content { padding: 2rem; max-width: 1100px; margin: 0 auto; }
    .loading { text-align: center; color: #888; padding: 3rem; }
    h2 { color: #e0e0e0; margin-bottom: 1.5rem; }
    .kpi-grid, .money-grid { display: grid; gap: 1rem; margin-bottom: 1.5rem;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }
    .kpi, .money-card, .summary-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 1.2rem; display: flex; flex-direction: column; gap: 0.5rem; }
    .kpi.win { border-color: rgba(76,175,80,0.4); }
    .kpi.loss { border-color: rgba(235,75,75,0.4); }
    .label { color: #888; font-size: 0.85rem; }
    .value { color: #e0e0e0; font-size: 1.6rem; font-weight: 700; }
    .value.win { color: #4caf50; }
    .value.loss { color: #eb4b4b; }
    .value.gold { color: #ffd700; }
    .progress-section { margin-bottom: 1.5rem; background: #16161a;
      border: 1px solid #2a2a35; border-radius: 10px; padding: 1.2rem; }
    .progress-header { display: flex; justify-content: space-between;
      color: #e0e0e0; margin-bottom: 0.6rem; font-weight: 600; }
    .progress-bar { height: 12px; background: #0a0a0f; border-radius: 6px;
      overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #ff6b00, #ffd700);
      transition: width 0.4s ease; }
    .inventory-summary { display: grid; gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
  `],
})
export class StatsComponent implements OnInit {
  data?: StatsResponse;

  constructor(public auth: AuthService, private users: UsersService) {}

  ngOnInit() {
    this.users.getStats().subscribe((d) => (this.data = d));
  }
}
