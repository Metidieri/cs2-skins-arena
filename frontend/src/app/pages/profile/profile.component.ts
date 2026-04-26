import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { StatsResponse, UserProfile } from '../../models/transaction.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="content" *ngIf="profile">
      <section class="profile-card">
        <div class="avatar">{{ profile.username.charAt(0).toUpperCase() }}</div>
        <div class="info">
          <h2>{{ profile.username }}</h2>
          <p class="email">{{ profile.email }}</p>
          <p class="since">Miembro desde {{ profile.createdAt | date:'longDate' }}</p>
        </div>
      </section>

      <section class="meta-grid">
        <div class="meta">
          <span class="label">Saldo</span>
          <span class="value gold">{{ auth.user()?.balance | number:'1.0-2' }} coins</span>
        </div>
        <div class="meta">
          <span class="label">Skins en inventario</span>
          <span class="value">{{ profile.inventoryCount }}</span>
        </div>
        <div class="meta">
          <span class="label">ID</span>
          <span class="value">#{{ profile.id }}</span>
        </div>
      </section>

      <section class="card deposit-card">
        <h3 class="section-h">Depósito de coins</h3>
        <p class="hint">Recarga tu saldo entre 100 y 10000 coins.</p>
        <div class="deposit-row">
          <input
            type="number"
            class="amount"
            [(ngModel)]="depositAmount"
            min="100"
            max="10000"
            placeholder="Cantidad" />
          <div class="presets">
            <button class="preset" *ngFor="let p of presets" (click)="depositAmount = p">
              +{{ p | number:'1.0-0' }}
            </button>
          </div>
          <button
            class="cta"
            [disabled]="!validDeposit() || depositing()"
            (click)="doDeposit()">
            {{ depositing() ? 'Depositando...' : 'DEPOSITAR' }}
          </button>
        </div>
      </section>

      <section class="card stats-card" *ngIf="stats() as s">
        <h3 class="section-h">Estadísticas extendidas</h3>
        <div class="stats-grid">
          <div class="kpi">
            <span class="k-label">Coinflips</span>
            <span class="k-value">{{ s.coinflipsPlayed || 0 }}</span>
            <span class="k-meta">
              <span class="win">{{ s.coinflipsWon || 0 }}W</span>
              ·
              <span class="loss">{{ s.coinflipsLost || 0 }}L</span>
            </span>
          </div>
          <div class="kpi">
            <span class="k-label">Jackpots</span>
            <span class="k-value">{{ s.jackpotsPlayed || 0 }}</span>
            <span class="k-meta">
              <span class="win">{{ s.jackpotsWon || 0 }}W</span>
            </span>
          </div>
          <div class="kpi">
            <span class="k-label">Marketplace</span>
            <span class="k-value">{{ (s.marketplaceSales || 0) + (s.marketplacePurchases || 0) }}</span>
            <span class="k-meta">
              <span class="win">{{ s.marketplaceSales || 0 }} ventas</span>
              ·
              <span class="loss">{{ s.marketplacePurchases || 0 }} compras</span>
            </span>
          </div>
          <div class="kpi">
            <span class="k-label">Ganancias totales</span>
            <span class="k-value gold">{{ s.totalEarnings || 0 | number:'1.0-2' }}</span>
            <span class="k-meta">coins</span>
          </div>
          <div class="kpi big" *ngIf="s.biggestWin">
            <span class="k-label">Mayor ganancia individual</span>
            <span class="k-value gold">+{{ s.biggestWin.amount | number:'1.0-2' }}</span>
            <span class="k-meta">{{ s.biggestWin.description || '—' }}</span>
          </div>
          <div class="kpi" *ngIf="s.favoriteWeapon">
            <span class="k-label">Arma favorita</span>
            <span class="k-value">{{ s.favoriteWeapon.weapon }}</span>
            <span class="k-meta">{{ s.favoriteWeapon.count }} en inventario</span>
          </div>
        </div>
      </section>

      <div class="actions">
        <a routerLink="/stats" class="action-btn">Ver estadísticas completas</a>
        <a routerLink="/history" class="action-btn">Ver historial</a>
        <a routerLink="/inventory" class="action-btn">Ver inventario</a>
      </div>
    </main>

    <p class="loading" *ngIf="!profile">Cargando perfil...</p>

    <div *ngIf="toast()" class="toast" [class.error]="toast()?.type === 'error'" [class.success]="toast()?.type === 'success'">
      {{ toast()?.message }}
    </div>
  `,
  styles: [`
    .content { padding: 2rem; max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.4rem; }
    .loading { text-align: center; color: #888; padding: 3rem; }
    .profile-card { display: flex; align-items: center; gap: 1.5rem;
      background: #16161a; border: 1px solid #2a2a35; border-radius: 12px;
      padding: 2rem; }
    .avatar { width: 90px; height: 90px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 2.5rem; font-weight: 700; }
    .info h2 { color: #e0e0e0; margin: 0 0 0.4rem 0; }
    .email { color: #888; margin: 0.2rem 0; }
    .since { color: #666; font-size: 0.85rem; margin: 0.2rem 0; }

    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .meta {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 1.2rem; display: flex; flex-direction: column; gap: 0.4rem;
    }
    .label { color: #888; font-size: 0.85rem; }
    .value { color: #e0e0e0; font-size: 1.3rem; font-weight: 600; }
    .value.gold { color: #ffd700; }

    .card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 12px;
      padding: 1.4rem 1.6rem;
    }
    .section-h { color: #e0e0e0; margin: 0; font-size: 1.05rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .hint { color: #888; font-size: 0.85rem; margin: 0.4rem 0 0.9rem; }

    /* Deposit */
    .deposit-row { display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; }
    .amount {
      flex: 1; min-width: 160px;
      background: #0a0a0f; border: 1px solid #2a2a35; color: #e0e0e0;
      padding: 0.7rem 1rem; border-radius: 8px; font-size: 1rem;
    }
    .amount:focus { outline: none; border-color: #ff6b00; }
    .presets { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .preset {
      background: #0a0a0f; border: 1px solid #2a2a35; color: #aaa;
      padding: 0.5rem 0.8rem; border-radius: 8px; cursor: pointer;
      font-size: 0.85rem; font-weight: 600;
    }
    .preset:hover { color: #ff6b00; border-color: #ff6b00; }
    .cta {
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      border: none; padding: 0.75rem 1.4rem; border-radius: 8px;
      font-weight: 800; letter-spacing: 0.08em; cursor: pointer;
      box-shadow: 0 4px 18px rgba(255,107,0,0.3);
      transition: transform 0.15s;
    }
    .cta:hover:not(:disabled) { transform: translateY(-2px); }
    .cta:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

    /* Stats grid */
    .stats-grid {
      display: grid; gap: 0.85rem; margin-top: 0.9rem;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    }
    .kpi {
      background: #0a0a0f; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 1rem 1.2rem; display: flex; flex-direction: column; gap: 0.25rem;
    }
    .kpi.big { grid-column: span 2; }
    .k-label { color: #666; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; }
    .k-value { color: #e0e0e0; font-size: 1.4rem; font-weight: 800; line-height: 1.1; }
    .k-value.gold { color: #ffd700; }
    .k-meta { color: #888; font-size: 0.8rem; }
    .win { color: #4caf50; font-weight: 700; }
    .loss { color: #eb4b4b; font-weight: 700; }

    .actions { display: flex; gap: 1rem; flex-wrap: wrap; }
    .action-btn {
      background: #ff6b00; color: white; padding: 0.7rem 1.4rem;
      border-radius: 8px; text-decoration: none; font-weight: 600;
      transition: background 0.2s;
    }
    .action-btn:hover { background: #ff8f00; }

    /* Toast */
    .toast {
      position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
      padding: 0.85rem 1.4rem; border-radius: 10px;
      font-weight: 600; z-index: 200;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
      animation: toastUp 0.25s ease-out;
    }
    .toast.error { background: #2b1414; color: #ff6b6b; border: 1px solid #ff4444; }
    .toast.success { background: #14241c; color: #6bff8f; border: 1px solid #4caf50; }
    @keyframes toastUp { from { transform: translate(-50%, 20px); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
  `],
})
export class ProfileComponent implements OnInit {
  profile?: UserProfile;
  stats = signal<StatsResponse['stats'] | null>(null);
  depositAmount = 500;
  depositing = signal(false);
  presets = [100, 500, 1000, 5000];
  toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  constructor(public auth: AuthService, private users: UsersService) {}

  ngOnInit() {
    this.users.getProfile().subscribe((p) => (this.profile = p));
    this.users.getStats().subscribe((res) => this.stats.set(res.stats));
  }

  validDeposit() {
    return this.depositAmount >= 100 && this.depositAmount <= 10000;
  }

  doDeposit() {
    if (!this.validDeposit() || this.depositing()) return;
    const amt = this.depositAmount;
    this.depositing.set(true);
    this.users.deposit(amt).subscribe({
      next: (res) => {
        this.depositing.set(false);
        if (this.profile) this.profile = { ...this.profile, balance: res.balance };
        this.users.getStats().subscribe((s) => this.stats.set(s.stats));
        this.showToast('success', `Saldo actualizado: ${res.balance.toLocaleString()} coins`);
      },
      error: (err) => {
        this.depositing.set(false);
        this.showToast('error', err?.error?.error || 'Error al depositar');
      },
    });
  }

  showToast(type: 'success' | 'error', message: string) {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3500);
  }
}
