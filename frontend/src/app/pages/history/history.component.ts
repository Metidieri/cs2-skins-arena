import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UsersService } from '../../services/users.service';
import { Transaction, TransactionType } from '../../models/transaction.model';

type Filter = 'TODAS' | TransactionType;
const PAGE_SIZE = 12;

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <h1 class="title">Historial</h1>
          <p class="subtitle">Todas tus transacciones de la arena.</p>
        </div>
      </header>

      <nav class="tabs">
        <button
          *ngFor="let f of filters"
          class="tab"
          [class.active]="active() === f"
          [attr.data-tone]="toneFor(f)"
          (click)="setFilter(f)">
          {{ labelFor(f) }}
          <span class="tab-count">{{ countFor(f) }}</span>
        </button>
      </nav>

      <section *ngIf="filtered().length === 0" class="empty-state card">
        <p>Sin transacciones para este filtro.</p>
      </section>

      <ol *ngIf="filtered().length > 0" class="timeline">
        <li
          *ngFor="let tx of paged(); trackBy: trackById"
          class="tl-item"
          [attr.data-type]="tx.type">
          <div class="tl-dot">
            <ng-container [ngSwitch]="tx.type">
              <svg *ngSwitchCase="'WIN'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12l4 4L19 7"></path>
              </svg>
              <svg *ngSwitchCase="'LOSS'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="6" y1="6" x2="18" y2="18"></line>
                <line x1="6" y1="18" x2="18" y2="6"></line>
              </svg>
              <svg *ngSwitchCase="'DEPOSIT'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 5v14M5 12l7 7 7-7"></path>
              </svg>
            </ng-container>
          </div>

          <article class="tl-card card">
            <div class="tl-head">
              <span class="tl-type">{{ labelFor(tx.type) }}</span>
              <span class="tl-amount">
                {{ tx.amount >= 0 ? '+' : '' }}{{ tx.amount | number:'1.0-2' }}
                <small>coins</small>
              </span>
            </div>
            <p class="tl-desc">{{ tx.description || '—' }}</p>
            <span class="tl-date">{{ tx.createdAt | date:'medium' }}</span>
          </article>
        </li>
      </ol>

      <div *ngIf="totalPages() > 1" class="pagination">
        <button class="btn btn-ghost" [disabled]="page() <= 1" (click)="goPage(page() - 1)">‹ Anterior</button>
        <span class="page-info">Página {{ page() }} de {{ totalPages() }}</span>
        <button class="btn btn-ghost" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">Siguiente ›</button>
      </div>
    </main>
  `,
  styles: [`
    .page { max-width: 880px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.4rem; }

    .page-head .title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 32px;
      color: var(--text-primary); margin: 0;
    }
    .page-head .subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .tabs { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .tab {
      --tone: var(--text-secondary);
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      padding: 0.4rem 0.95rem;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.05em;
      display: inline-flex; align-items: center; gap: 0.4rem;
      transition: var(--transition);
    }
    .tab:hover { color: var(--text-primary); border-color: var(--border-strong); }
    .tab.active {
      color: var(--tone);
      border-color: var(--tone);
      background: color-mix(in srgb, var(--tone) 12%, transparent);
    }
    .tab[data-tone="green"] { --tone: var(--green); }
    .tab[data-tone="red"] { --tone: var(--red); }
    .tab[data-tone="blue"] { --tone: var(--blue); }
    .tab[data-tone="accent"] { --tone: var(--accent); }
    .tab-count {
      background: var(--bg-base);
      padding: 1px 6px;
      border-radius: 999px;
      font-size: 10px;
      color: var(--text-muted);
    }
    .tab.active .tab-count { background: color-mix(in srgb, var(--tone) 22%, transparent); color: var(--tone); }

    .empty-state { text-align: center; padding: 3rem; color: var(--text-muted); }

    /* Timeline */
    .timeline {
      list-style: none; padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 0.9rem;
      position: relative;
    }
    .timeline::before {
      content: '';
      position: absolute;
      top: 0; bottom: 0; left: 18px;
      width: 2px;
      background: linear-gradient(180deg, var(--border-default), transparent);
    }
    .tl-item {
      --tone: var(--text-secondary);
      display: grid;
      grid-template-columns: 38px 1fr;
      gap: 1rem;
      align-items: flex-start;
      position: relative;
    }
    .tl-item[data-type="WIN"] { --tone: var(--green); }
    .tl-item[data-type="LOSS"] { --tone: var(--red); }
    .tl-item[data-type="DEPOSIT"] { --tone: var(--blue); }

    .tl-dot {
      width: 38px; height: 38px;
      border-radius: 50%;
      background: var(--bg-elevated);
      border: 2px solid var(--tone);
      color: var(--tone);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 0 4px var(--bg-base);
      position: relative;
      z-index: 1;
    }
    .tl-dot svg { width: 16px; height: 16px; }

    .tl-card {
      padding: 0.9rem 1.1rem;
      border-left: 3px solid var(--tone);
      transition: var(--transition);
    }
    .tl-card:hover {
      transform: translateX(2px);
      border-color: color-mix(in srgb, var(--tone) 35%, var(--border-subtle));
      border-left-color: var(--tone);
    }
    .tl-head {
      display: flex; align-items: baseline; justify-content: space-between;
      gap: 0.5rem;
    }
    .tl-type {
      font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
      color: var(--tone); font-weight: 700;
    }
    .tl-amount {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 18px;
      color: var(--tone);
      line-height: 1;
    }
    .tl-amount small {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 11px;
      color: var(--text-muted);
      margin-left: 3px;
    }
    .tl-desc {
      color: var(--text-primary);
      font-size: 13px;
      margin: 6px 0 4px;
    }
    .tl-date { color: var(--text-muted); font-size: 11px; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 0.5rem; }
    .page-info { color: var(--text-muted); font-size: 12px; }
  `],
})
export class HistoryComponent implements OnInit {
  filters: Filter[] = ['TODAS', 'WIN', 'LOSS', 'DEPOSIT'];
  active = signal<Filter>('TODAS');
  transactions = signal<Transaction[]>([]);
  page = signal(1);

  filtered = computed(() => {
    const a = this.active();
    if (a === 'TODAS') return this.transactions();
    return this.transactions().filter((t) => t.type === a);
  });

  paged = computed(() => {
    const list = this.filtered();
    const start = (this.page() - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  constructor(public auth: AuthService, private users: UsersService) {}

  ngOnInit() {
    this.users.getTransactions(200).subscribe((tx) => this.transactions.set(tx));
  }

  setFilter(f: Filter) {
    this.active.set(f);
    this.page.set(1);
  }

  goPage(p: number) { this.page.set(p); }

  countFor(f: Filter): number {
    if (f === 'TODAS') return this.transactions().length;
    return this.transactions().filter((t) => t.type === f).length;
  }

  labelFor(f: Filter | TransactionType): string {
    if (f === 'TODAS') return 'Todas';
    if (f === 'WIN') return 'Ganadas';
    if (f === 'LOSS') return 'Perdidas';
    return 'Depósitos';
  }

  toneFor(f: Filter): string {
    if (f === 'WIN') return 'green';
    if (f === 'LOSS') return 'red';
    if (f === 'DEPOSIT') return 'blue';
    return 'accent';
  }

  trackById(_: number, tx: Transaction) { return tx.id; }
}
