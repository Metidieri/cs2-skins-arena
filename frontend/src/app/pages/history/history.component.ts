import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { Transaction } from '../../models/transaction.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="content">
      <div class="header">
        <h2>Historial de transacciones</h2>
        <div class="filters">
          <button
            *ngFor="let f of filters"
            class="filter-btn"
            [class.active]="active === f"
            (click)="active = f">
            {{ f }}
          </button>
        </div>
      </div>

      <p class="empty" *ngIf="transactions.length === 0">Sin transacciones aún.</p>
      <p class="empty" *ngIf="transactions.length > 0 && filtered().length === 0">
        Sin resultados para este filtro.
      </p>

      <div class="tx-list">
        <div class="tx" *ngFor="let tx of filtered()" [class]="'type-' + tx.type.toLowerCase()">
          <div class="tx-icon">{{ iconFor(tx.type) }}</div>
          <div class="tx-body">
            <span class="tx-type">{{ labelFor(tx.type) }}</span>
            <span class="tx-desc">{{ tx.description || '-' }}</span>
          </div>
          <div class="tx-meta">
            <span class="tx-amount" [class.positive]="tx.amount >= 0" [class.negative]="tx.amount < 0">
              {{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount | number:'1.0-2' }}
            </span>
            <span class="tx-date">{{ tx.createdAt | date:'short' }}</span>
          </div>
        </div>
      </div>
    </main>
  `,
  styles: [`
    .content { padding: 2rem; max-width: 900px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
    h2 { color: #e0e0e0; margin: 0; }
    .filters { display: flex; gap: 0.5rem; }
    .filter-btn { background: #16161a; border: 1px solid #2a2a35; color: #888;
      padding: 0.4rem 1rem; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
    .filter-btn:hover { border-color: #ff6b00; color: #e0e0e0; }
    .filter-btn.active { background: #ff6b00; color: white; border-color: #ff6b00; }
    .empty { color: #888; text-align: center; padding: 3rem; }
    .tx-list { display: flex; flex-direction: column; gap: 0.6rem; }
    .tx { display: flex; align-items: center; gap: 1rem;
      background: #16161a; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 1rem 1.2rem; transition: border-color 0.2s; }
    .tx.type-win { border-left: 3px solid #4caf50; }
    .tx.type-loss { border-left: 3px solid #eb4b4b; }
    .tx.type-deposit { border-left: 3px solid #ffd700; }
    .tx-icon { font-size: 1.4rem; width: 38px; height: 38px;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: #0a0a0f; color: #e0e0e0; }
    .tx-body { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
    .tx-type { color: #e0e0e0; font-weight: 600; }
    .tx-desc { color: #888; font-size: 0.85rem; }
    .tx-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
    .tx-amount { font-weight: 700; font-size: 1.1rem; }
    .tx-amount.positive { color: #4caf50; }
    .tx-amount.negative { color: #eb4b4b; }
    .tx-date { color: #666; font-size: 0.8rem; }
  `],
})
export class HistoryComponent implements OnInit {
  transactions: Transaction[] = [];
  filters: Array<'TODAS' | 'WIN' | 'LOSS' | 'DEPOSIT'> = ['TODAS', 'WIN', 'LOSS', 'DEPOSIT'];
  active: 'TODAS' | 'WIN' | 'LOSS' | 'DEPOSIT' = 'TODAS';

  constructor(public auth: AuthService, private users: UsersService) {}

  ngOnInit() {
    this.users.getTransactions().subscribe((tx) => (this.transactions = tx));
  }

  filtered() {
    if (this.active === 'TODAS') return this.transactions;
    return this.transactions.filter((t) => t.type === this.active);
  }

  iconFor(type: string) {
    if (type === 'WIN') return 'W';
    if (type === 'LOSS') return 'L';
    return 'D';
  }

  labelFor(type: string) {
    if (type === 'WIN') return 'Victoria';
    if (type === 'LOSS') return 'Derrota';
    return 'Depósito';
  }
}
