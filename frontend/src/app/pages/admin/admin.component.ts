import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ToastService } from '../../shared/services/toast.service';
import { LevelBadgeComponent } from '../../shared/components/level-badge/level-badge.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, LevelBadgeComponent],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="admin-header">
        <div>
          <h1 class="admin-title">PANEL DE ADMINISTRACIÓN</h1>
          <p class="admin-disclaimer">Solo visible para administradores</p>
        </div>
        <span class="admin-badge">ADMIN</span>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="skeleton-page">
        <div class="skeleton" style="height:100px; border-radius:12px; margin-bottom:1rem"></div>
        <div class="skeleton" style="height:200px; border-radius:12px"></div>
      </div>

      <ng-container *ngIf="!loading && stats">

        <!-- Economy -->
        <section class="section">
          <h2 class="section-header">Economía</h2>
          <div class="stats-grid">
            <div class="stat-card blue">
              <span class="stat-label">Coins en circulación</span>
              <span class="stat-val">{{ stats.economy.totalCoinsInCirculation | number:'1.0-0' }}</span>
            </div>
            <div class="stat-card orange">
              <span class="stat-label">Total apostado</span>
              <span class="stat-val">{{ stats.economy.totalCoinsWagered | number:'1.0-0' }}</span>
            </div>
            <div class="stat-card gold">
              <span class="stat-label">Balance de la casa</span>
              <span class="stat-val">{{ stats.economy.houseBalance | number:'1.0-0' }}</span>
            </div>
            <div class="stat-card green">
              <span class="stat-label">Volumen marketplace</span>
              <span class="stat-val">{{ stats.economy.marketplaceVolume | number:'1.0-0' }}</span>
            </div>
          </div>
        </section>

        <!-- Users -->
        <section class="section">
          <h2 class="section-header">Usuarios</h2>
          <div class="users-summary card">
            <div class="summary-grid">
              <div class="summary-item"><span class="summary-num">{{ stats.users.total }}</span><span class="summary-label">Total</span></div>
              <div class="summary-item"><span class="summary-num">{{ stats.users.newToday }}</span><span class="summary-label">Hoy</span></div>
              <div class="summary-item"><span class="summary-num">{{ stats.users.newThisWeek }}</span><span class="summary-label">Esta semana</span></div>
              <div class="summary-item"><span class="summary-num">{{ stats.users.withInventory }}</span><span class="summary-label">Con skins</span></div>
            </div>
            <h4 class="top-label">Top por balance</h4>
            <table class="mini-table">
              <tr *ngFor="let u of stats.users.topByBalance; let i = index">
                <td class="rank">#{{ i+1 }}</td>
                <td>{{ u.username }}</td>
                <td class="gold-val">{{ u.balance | number:'1.0-0' }}</td>
              </tr>
            </table>
          </div>
        </section>

        <!-- Activity -->
        <section class="section">
          <h2 class="section-header">Actividad</h2>
          <div class="activity-grid">
            <div class="activity-card card">
              <span class="act-label">Coinflips total</span>
              <span class="act-val">{{ stats.games.coinflipsTotal }}</span>
              <span class="act-today">Hoy: {{ stats.games.coinflipsToday }}</span>
            </div>
            <div class="activity-card card">
              <span class="act-label">Jackpots total</span>
              <span class="act-val">{{ stats.games.jackpotsTotal }}</span>
              <span class="act-today">Hoy: {{ stats.games.jackpotsToday }}</span>
            </div>
            <div class="activity-card card">
              <span class="act-label">Cajas abiertas</span>
              <span class="act-val">{{ stats.games.caseOpeningsTotal }}</span>
              <span class="act-today">Hoy: {{ stats.games.caseOpeningsToday }}</span>
            </div>
            <div class="activity-card card">
              <span class="act-label">Rondas ruleta</span>
              <span class="act-val">{{ stats.games.rouletteRoundsTotal }}</span>
            </div>
          </div>
        </section>

        <!-- User management -->
        <section class="section">
          <h2 class="section-header">Gestión de usuarios</h2>
          <div class="search-row">
            <input [(ngModel)]="search" (input)="onSearch()" placeholder="Buscar por username o email..."
                   class="search-input"/>
          </div>

          <div class="table-wrapper card">
            <table class="users-table" *ngIf="!usersLoading && users.length > 0">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Balance</th>
                  <th>Nivel</th>
                  <th>Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of users">
                  <td>
                    <div class="user-cell">
                      <div class="user-avatar">{{ u.username.charAt(0).toUpperCase() }}</div>
                      <div>
                        <div class="user-name">{{ u.username }}</div>
                        <div class="user-email">{{ u.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="gold-val">{{ u.balance | number:'1.0-0' }}</td>
                  <td>
                    <app-level-badge [level]="u.level" [progress]="0" size="sm"/>
                  </td>
                  <td class="date-val">{{ u.createdAt | date:'dd/MM/yy' }}</td>
                  <td>
                    <div class="action-btns">
                      <button class="btn btn-sm" (click)="openGiveCoins(u)">DAR COINS</button>
                      <button class="btn btn-danger btn-sm" (click)="confirmBan(u)"
                              [disabled]="u.role === 'BANNED'">
                        {{ u.role === 'BANNED' ? 'BANEADO' : 'BANEAR' }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
            <div *ngIf="usersLoading" class="skeleton" style="height:200px"></div>
            <div *ngIf="!usersLoading && users.length === 0" class="empty-state">No se encontraron usuarios</div>
          </div>

          <div class="pagination" *ngIf="totalPages > 1">
            <button class="btn btn-ghost btn-sm" (click)="prevPage()" [disabled]="currentPage === 1">Anterior</button>
            <span>{{ currentPage }} / {{ totalPages }}</span>
            <button class="btn btn-ghost btn-sm" (click)="nextPage()" [disabled]="currentPage === totalPages">Siguiente</button>
          </div>
        </section>
      </ng-container>
    </div>

    <!-- Modal dar coins -->
    <div class="modal-overlay" *ngIf="giveCoinsUser" (click)="closeModal()">
      <div class="modal-card" (click)="$event.stopPropagation()">
        <h3 class="modal-title">Dar coins a {{ giveCoinsUser.username }}</h3>
        <input [(ngModel)]="giveCoinsAmount" type="number" min="1" placeholder="Cantidad" class="modal-input"/>
        <input [(ngModel)]="giveCoinsReason" placeholder="Razón" class="modal-input"/>
        <div class="modal-actions">
          <button class="btn btn-ghost" (click)="closeModal()">Cancelar</button>
          <button class="btn btn-primary" (click)="confirmGiveCoins()" [disabled]="!giveCoinsAmount || giveCoinsAmount < 1">Confirmar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1000px; margin: 0 auto; padding: 1.5rem; }

    .admin-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2rem; }
    .admin-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 2rem;
      font-weight: 700;
      color: var(--red);
      margin: 0 0 4px;
    }
    .admin-disclaimer { font-size: 12px; color: var(--text-muted); margin: 0; }
    .admin-badge {
      background: rgba(239,68,68,0.15);
      color: var(--red);
      border: 1px solid rgba(239,68,68,0.3);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }

    .section { margin-bottom: 2rem; }
    .section-header {
      font-family: 'Rajdhani', sans-serif;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      text-transform: uppercase;
      margin: 0 0 0.875rem;
    }

    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.875rem; }
    .stat-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .stat-card.blue { border-left: 3px solid #3b82f6; }
    .stat-card.orange { border-left: 3px solid var(--accent); }
    .stat-card.gold { border-left: 3px solid var(--gold); }
    .stat-card.green { border-left: 3px solid var(--green); }
    .stat-label { font-size: 12px; color: var(--text-muted); }
    .stat-val { font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700; color: var(--text-primary); }

    .users-summary { padding: 1.25rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 1rem; margin-bottom: 1rem; }
    .summary-item { text-align: center; }
    .summary-num { display: block; font-family: 'Rajdhani', sans-serif; font-size: 24px; font-weight: 700; }
    .summary-label { font-size: 11px; color: var(--text-muted); }
    .top-label { font-size: 12px; color: var(--text-muted); margin: 0 0 0.5rem; font-weight: 600; }
    .mini-table { width: 100%; border-collapse: collapse; }
    .mini-table td { padding: 4px 8px; font-size: 13px; }
    .mini-table .rank { color: var(--text-muted); width: 30px; }
    .gold-val { color: var(--gold); font-weight: 600; font-family: 'Rajdhani', sans-serif; }

    .activity-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px,1fr)); gap: 0.875rem; }
    .activity-card { padding: 1rem; display: flex; flex-direction: column; gap: 4px; }
    .act-label { font-size: 12px; color: var(--text-muted); }
    .act-val { font-family: 'Rajdhani', sans-serif; font-size: 28px; font-weight: 700; }
    .act-today { font-size: 11px; color: var(--text-muted); }

    .search-row { margin-bottom: 0.875rem; }
    .search-input {
      width: 100%;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--text-primary);
      padding: 0.625rem 1rem;
      font-size: 14px;
    }
    .search-input:focus { outline: none; border-color: var(--accent); }

    .table-wrapper { overflow-x: auto; }
    .users-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .users-table th { padding: 0.75rem 1rem; text-align: left; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid var(--border-subtle); }
    .users-table td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
    .user-cell { display: flex; align-items: center; gap: 0.625rem; }
    .user-avatar { width: 28px; height: 28px; background: var(--accent-muted); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--accent); flex-shrink: 0; }
    .user-name { font-weight: 600; color: var(--text-primary); }
    .user-email { font-size: 11px; color: var(--text-muted); }
    .date-val { font-size: 12px; color: var(--text-muted); }
    .action-btns { display: flex; gap: 6px; }
    .btn-sm { padding: 4px 10px; font-size: 11px; }

    .pagination { display: flex; align-items: center; gap: 1rem; justify-content: center; margin-top: 1rem; font-size: 13px; color: var(--text-muted); }

    .skeleton-page { padding: 1rem 0; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 300; }
    .modal-card { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 2rem; min-width: 320px; display: flex; flex-direction: column; gap: 1rem; }
    .modal-title { font-family: 'Rajdhani', sans-serif; font-size: 18px; font-weight: 700; margin: 0; }
    .modal-input { background: var(--bg-elevated); border: 1px solid var(--border-default); border-radius: var(--radius-sm); color: var(--text-primary); padding: 0.625rem 0.875rem; font-size: 14px; width: 100%; }
    .modal-input:focus { outline: none; border-color: var(--accent); }
    .modal-actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
  `],
})
export class AdminComponent implements OnInit {
  stats: any = null;
  users: any[] = [];
  loading = true;
  usersLoading = false;
  search = '';
  currentPage = 1;
  totalPages = 1;
  giveCoinsUser: any = null;
  giveCoinsAmount: number | null = null;
  giveCoinsReason = '';
  private searchTimeout: any;

  constructor(private adminService: AdminService, private toast: ToastService) {}

  ngOnInit() {
    this.adminService.getDashboardStats().subscribe({
      next: (s) => { this.stats = s; this.loading = false; },
      error: () => { this.loading = false; },
    });
    this.loadUsers();
  }

  loadUsers() {
    this.usersLoading = true;
    this.adminService.getUsers(this.currentPage, this.search).subscribe({
      next: (r) => {
        this.users = r.users;
        this.totalPages = r.totalPages;
        this.usersLoading = false;
      },
      error: () => { this.usersLoading = false; },
    });
  }

  onSearch() {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.currentPage = 1;
      this.loadUsers();
    }, 400);
  }

  prevPage() { if (this.currentPage > 1) { this.currentPage--; this.loadUsers(); } }
  nextPage() { if (this.currentPage < this.totalPages) { this.currentPage++; this.loadUsers(); } }

  openGiveCoins(u: any) {
    this.giveCoinsUser = u;
    this.giveCoinsAmount = null;
    this.giveCoinsReason = '';
  }

  closeModal() { this.giveCoinsUser = null; }

  confirmGiveCoins() {
    if (!this.giveCoinsUser || !this.giveCoinsAmount) return;
    this.adminService.giveCoins(this.giveCoinsUser.id, this.giveCoinsAmount, this.giveCoinsReason || 'Admin gift').subscribe({
      next: () => {
        this.toast.success(`${this.giveCoinsAmount} coins dados a ${this.giveCoinsUser.username}`, 3000);
        this.closeModal();
        this.loadUsers();
      },
      error: () => this.toast.success('Error al dar coins', 3000),
    });
  }

  confirmBan(u: any) {
    if (!confirm(`¿Banear a ${u.username}?`)) return;
    this.adminService.banUser(u.id).subscribe({
      next: () => { this.toast.success(`${u.username} baneado`, 3000); this.loadUsers(); },
      error: () => this.toast.success('Error al banear', 3000),
    });
  }
}
