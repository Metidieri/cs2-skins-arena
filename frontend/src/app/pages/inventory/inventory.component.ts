import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SkinsService } from '../../services/skins.service';
import { Skin } from '../../models/skin.model';
import { SkinCardComponent } from '../../shared/components/skin-card/skin-card.component';

const RARITIES = ['Consumer', 'Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert', 'Contraband'];

type SortKey = 'price_desc' | 'price_asc' | 'name_asc';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule, SkinCardComponent],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <h1 class="title">Mi Inventario</h1>
          <p class="subtitle">Tus skins disponibles para apostar o vender.</p>
        </div>
        <div class="head-meta">
          <div class="meta-cell">
            <span class="meta-label">Skins</span>
            <span class="meta-value">{{ skins().length }}</span>
          </div>
          <div class="meta-cell gold">
            <span class="meta-label">Valor total</span>
            <span class="meta-value">{{ totalValue() | number:'1.0-0' }} <small>coins</small></span>
          </div>
        </div>
      </header>

      <section class="filter-bar">
        <div class="filter-row">
          <span class="filter-label">Rareza</span>
          <div class="pills">
            <button class="pill" [class.active]="!filterRarity()" (click)="setRarity(null)">Todas</button>
            <button
              *ngFor="let r of rarities"
              class="pill"
              [class.active]="filterRarity() === r"
              [style.--rarity]="rarityVar(r)"
              (click)="setRarity(r)">
              {{ r }}
            </button>
          </div>
        </div>

        <div class="filter-row right">
          <label class="control">
            <span>Arma</span>
            <select [ngModel]="filterWeapon()" (ngModelChange)="filterWeapon.set($event)">
              <option [ngValue]="null">Todas</option>
              <option *ngFor="let w of weapons()" [ngValue]="w">{{ w }}</option>
            </select>
          </label>
          <label class="control">
            <span>Ordenar</span>
            <select [ngModel]="sortKey()" (ngModelChange)="sortKey.set($event)">
              <option ngValue="price_desc">Precio: mayor</option>
              <option ngValue="price_asc">Precio: menor</option>
              <option ngValue="name_asc">Nombre A-Z</option>
            </select>
          </label>
          <button class="btn btn-ghost" (click)="clearFilters()">Limpiar</button>
        </div>
      </section>

      <section class="grid-wrap">
        <div *ngIf="loading()" class="grid">
          <div *ngFor="let _ of skeletonArr" class="skeleton card-skeleton"></div>
        </div>

        <div *ngIf="!loading() && filtered().length === 0" class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <rect x="14" y="14" width="7" height="7" rx="1"></rect>
          </svg>
          <p *ngIf="skins().length === 0">No tienes skins todavía. Gana batallas o compra en el marketplace.</p>
          <p *ngIf="skins().length > 0">Ninguna skin coincide con esos filtros.</p>
          <button *ngIf="skins().length > 0" class="btn btn-ghost" (click)="clearFilters()">Limpiar filtros</button>
        </div>

        <div *ngIf="!loading() && filtered().length > 0" class="grid">
          <app-skin-card
            *ngFor="let skin of filtered(); trackBy: trackById"
            [skin]="skin"
            (onSelect)="select($event)">
          </app-skin-card>
        </div>
      </section>
    </main>
  `,
  styles: [`
    .page {
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .page-head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 32px;
      line-height: 1;
      margin: 0;
      color: var(--text-primary);
    }
    .subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    .head-meta { display: flex; gap: 0.75rem; }
    .meta-cell {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 0.6rem 1rem;
      min-width: 150px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-label {
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .meta-value {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 22px;
      color: var(--text-primary);
      line-height: 1;
    }
    .meta-value small {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 11px;
      color: var(--text-muted);
      margin-left: 2px;
    }
    .meta-cell.gold .meta-value { color: var(--gold); }

    /* Filter bar */
    .filter-bar {
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .filter-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      flex-wrap: wrap;
    }
    .filter-row.right { justify-content: flex-end; }
    .filter-label {
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
    }
    .pills { display: flex; gap: 0.35rem; flex-wrap: wrap; }
    .pill {
      --rarity: var(--text-muted);
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      padding: 0.32rem 0.75rem;
      border-radius: 999px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      transition: var(--transition);
    }
    .pill:hover { color: var(--text-primary); border-color: var(--border-strong); }
    .pill.active {
      color: var(--rarity);
      border-color: var(--rarity);
      background: color-mix(in srgb, var(--rarity) 12%, transparent);
    }

    .control { display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted); font-size: 12px; letter-spacing: 0.05em; text-transform: uppercase; }
    .control select {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      color: var(--text-primary);
      padding: 0.4rem 0.7rem;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-family: 'Inter', sans-serif;
    }
    .control select:focus { outline: none; border-color: var(--accent); }

    /* Grid */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }
    .card-skeleton {
      aspect-ratio: 1 / 1.2;
    }

    .empty-state svg { width: 48px; height: 48px; }
  `],
})
export class InventoryComponent implements OnInit {
  rarities = RARITIES;
  skeletonArr = Array.from({ length: 8 });

  skins = signal<Skin[]>([]);
  loading = signal(true);

  filterRarity = signal<string | null>(null);
  filterWeapon = signal<string | null>(null);
  sortKey = signal<SortKey>('price_desc');

  weapons = computed(() => {
    const set = new Set(this.skins().map((s) => s.weapon));
    return [...set].sort();
  });

  totalValue = computed(() =>
    this.skins().reduce((sum, s) => sum + (s.price || 0), 0),
  );

  filtered = computed(() => {
    const r = this.filterRarity();
    const w = this.filterWeapon();
    let list = this.skins().filter(
      (s) => (!r || s.rarity === r) && (!w || s.weapon === w),
    );
    const k = this.sortKey();
    list = [...list].sort((a, b) => {
      if (k === 'price_asc') return a.price - b.price;
      if (k === 'name_asc') return a.name.localeCompare(b.name);
      return b.price - a.price;
    });
    return list;
  });

  constructor(public auth: AuthService, private skinsService: SkinsService) {}

  ngOnInit() {
    this.skinsService.getInventory().subscribe({
      next: (items) => {
        this.skins.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setRarity(r: string | null) { this.filterRarity.set(r); }
  clearFilters() {
    this.filterRarity.set(null);
    this.filterWeapon.set(null);
    this.sortKey.set('price_desc');
  }

  rarityVar(r: string): string {
    const key = r.toLowerCase().replace(/\s+/g, '');
    const map: Record<string, string> = {
      consumer: '--rarity-consumer',
      industrial: '--rarity-industrial',
      milspec: '--rarity-milspec',
      'mil-spec': '--rarity-milspec',
      restricted: '--rarity-restricted',
      classified: '--rarity-classified',
      covert: '--rarity-covert',
      contraband: '--rarity-contraband',
    };
    return map[key] ? `var(${map[key]})` : 'var(--text-muted)';
  }

  trackById(_: number, s: Skin) { return s.id; }

  select(_skin: Skin) {
    // Hook para abrir modal de venta / apostar (lo cubre marketplace/jackpot directamente).
  }
}
