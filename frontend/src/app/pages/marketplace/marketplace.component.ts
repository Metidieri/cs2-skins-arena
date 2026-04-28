import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MarketService } from '../../services/market.service';
import { SocketService } from '../../services/socket.service';
import { SkinsService } from '../../services/skins.service';
import { Listing, MarketFilters } from '../../models/market.model';
import { Skin } from '../../models/skin.model';
import { ToastService } from '../../shared/services/toast.service';

const RARITIES = ['Consumer', 'Industrial', 'Mil-Spec', 'Restricted', 'Classified', 'Covert'];
const WEAPONS = ['AK-47', 'M4A1-S', 'M4A4', 'AWP', 'Desert Eagle', 'USP-S', 'Glock-18', 'Karambit', 'M9 Bayonet'];
const RARITY_VARS: Record<string, string> = {
  consumer: '--rarity-consumer',
  industrial: '--rarity-industrial',
  milspec: '--rarity-milspec',
  'mil-spec': '--rarity-milspec',
  restricted: '--rarity-restricted',
  classified: '--rarity-classified',
  covert: '--rarity-covert',
  contraband: '--rarity-contraband',
};

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="page-head">
        <div>
          <h1 class="title">MARKETPLACE</h1>
          <p class="subtitle">Tienda oficial + mercado P2P entre jugadores.</p>
        </div>
        <button class="btn btn-primary" (click)="openSellModal()">+ VENDER SKIN</button>
      </header>

      <!-- FILTROS P2P en barra horizontal -->
      <div class="p2p-label">
        <span class="section-title">👥 Mercado P2P</span>
        <span class="house-sub">Listings de jugadores</span>
      </div>
      <section class="filter-bar">
        <div class="filter-row">
          <span class="filter-label">Rareza</span>
          <div class="pills">
            <button class="pill" [class.active]="!filters.rarity" (click)="setRarity(undefined)">Todas</button>
            <button
              *ngFor="let r of rarities"
              class="pill"
              [class.active]="filters.rarity === r"
              [style.--rarity]="rarityVar(r)"
              (click)="setRarity(r)">
              {{ r }}
            </button>
          </div>
        </div>

        <div class="filter-row split">
          <label class="control">
            <span>Arma</span>
            <select [(ngModel)]="filters.weapon" (change)="reload()">
              <option [ngValue]="undefined">Todas</option>
              <option *ngFor="let w of weapons" [ngValue]="w">{{ w }}</option>
            </select>
          </label>
          <label class="control range">
            <span>Precio</span>
            <div class="range-inputs">
              <input type="number" [(ngModel)]="filters.minPrice" (change)="reload()" placeholder="Min" min="0" />
              <span>—</span>
              <input type="number" [(ngModel)]="filters.maxPrice" (change)="reload()" placeholder="Max" min="0" />
            </div>
          </label>
          <label class="control">
            <span>Ordenar</span>
            <select [(ngModel)]="filters.sortBy" (change)="reload()">
              <option ngValue="newest">Más reciente</option>
              <option ngValue="price_asc">Precio menor</option>
              <option ngValue="price_desc">Precio mayor</option>
            </select>
          </label>
          <button class="btn btn-ghost" (click)="clearFilters()">Limpiar</button>
        </div>
      </section>

      <!-- TIENDA OFICIAL -->
      <section class="house-section">
        <header class="section-header">
          <div class="house-title-group">
            <span class="section-title">🏛 Tienda Oficial</span>
            <span class="house-sub">Skins del sistema · compra directa garantizada</span>
          </div>
          <button class="btn btn-ghost" (click)="loadHouseListings()">↻</button>
        </header>

        <div *ngIf="houseLoading()" class="grid">
          <div *ngFor="let _ of houseSkeletonArr" class="skeleton skeleton-card"></div>
        </div>

        <div *ngIf="!houseLoading() && houseListings().length === 0" class="empty-row">
          La tienda oficial está vacía en este momento.
        </div>

        <div *ngIf="!houseLoading() && houseListings().length > 0" class="grid">
          <article
            *ngFor="let l of houseListings(); trackBy: trackById"
            class="listing house-listing"
            [style.--rarity]="rarityVar(l.skin.rarity)">
            <div class="listing-head">
              <span class="listing-price">{{ l.price | number:'1.0-0' }} <small>coins</small></span>
              <span class="rarity-badge">{{ l.skin.rarity }}</span>
            </div>
            <div class="listing-img">
              <img *ngIf="l.skin.imageUrl" [src]="l.skin.imageUrl" [alt]="l.skin.name" />
              <span *ngIf="!l.skin.imageUrl" class="fallback">?</span>
            </div>
            <div class="listing-body">
              <h3 class="listing-name">{{ l.skin.name }}</h3>
              <p class="listing-meta">{{ l.skin.weapon }}</p>
              <div class="listing-foot">
                <span class="official-badge">OFICIAL</span>
                <span class="base-price">base {{ l.skin.price | number:'1.0-0' }}</span>
              </div>
            </div>
            <div class="listing-overlay">
              <button
                class="btn btn-primary"
                [disabled]="!canAfford(l)"
                (click)="askBuy(l)">
                {{ canAfford(l) ? 'COMPRAR' : 'SIN SALDO' }}
              </button>
            </div>
          </article>
        </div>

        <div *ngIf="houseTotalPages() > 1" class="pagination">
          <button class="btn btn-ghost" [disabled]="housePage() <= 1" (click)="goHousePage(housePage() - 1)">‹</button>
          <span class="page-info">{{ housePage() }} / {{ houseTotalPages() }}</span>
          <button class="btn btn-ghost" [disabled]="housePage() >= houseTotalPages()" (click)="goHousePage(housePage() + 1)">›</button>
        </div>
      </section>

      <!-- GRID P2P -->
      <section class="grid-wrap">
        <div *ngIf="loading()" class="grid">
          <div *ngFor="let _ of skeletonArr" class="skeleton skeleton-card"></div>
        </div>

        <div *ngIf="!loading() && listings().length === 0" class="empty-state card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l1-5h16l1 5"></path>
            <path d="M4 9v11h16V9"></path>
            <path d="M9 13h6"></path>
          </svg>
          <p>No hay listings con esos filtros.</p>
          <button class="btn btn-ghost" (click)="clearFilters()">Limpiar filtros</button>
        </div>

        <div *ngIf="!loading() && listings().length > 0" class="grid">
          <article
            *ngFor="let l of listings(); trackBy: trackById"
            class="listing"
            [class.mine]="isMine(l)"
            [style.--rarity]="rarityVar(l.skin.rarity)">
            <div class="listing-head">
              <span class="listing-price">{{ l.price | number:'1.0-0' }} <small>coins</small></span>
              <span class="rarity-badge">{{ l.skin.rarity }}</span>
            </div>

            <div class="listing-img">
              <img *ngIf="l.skin.imageUrl" [src]="l.skin.imageUrl" [alt]="l.skin.name" />
              <span *ngIf="!l.skin.imageUrl" class="fallback">?</span>
            </div>

            <div class="listing-body">
              <h3 class="listing-name">{{ l.skin.name }}</h3>
              <p class="listing-meta">{{ l.skin.weapon }}</p>
              <div class="listing-foot">
                <div class="seller">
                  <span class="seller-avatar">{{ initial(l.seller.username) }}</span>
                  <span class="seller-name">{{ l.seller.username }}</span>
                </div>
                <span class="base-price">base {{ l.skin.price | number:'1.0-0' }}</span>
              </div>
            </div>

            <span *ngIf="isMine(l)" class="mine-badge">TUYO</span>

            <!-- Hover overlay con botón -->
            <div class="listing-overlay">
              <button
                *ngIf="!isMine(l)"
                class="btn btn-primary"
                [disabled]="!canAfford(l)"
                (click)="askBuy(l)">
                {{ canAfford(l) ? 'COMPRAR' : 'SIN SALDO' }}
              </button>
              <button
                *ngIf="isMine(l)"
                class="btn btn-danger"
                (click)="cancel(l)">CANCELAR</button>
            </div>
          </article>
        </div>

        <div *ngIf="!loading() && totalPages() > 1" class="pagination">
          <button class="btn btn-ghost" [disabled]="page() <= 1" (click)="goPage(page() - 1)">‹ Anterior</button>
          <span class="page-info">Página {{ page() }} de {{ totalPages() }}</span>
          <button class="btn btn-ghost" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">Siguiente ›</button>
        </div>
      </section>

      <!-- MIS LISTINGS -->
      <section class="my-section">
        <header class="section-header">
          <span class="section-title">Mis listings</span>
          <button class="btn btn-ghost" (click)="loadMyListings()">↻ Actualizar</button>
        </header>
        <p *ngIf="myListings().length === 0" class="empty-row">Aún no has puesto skins en venta.</p>
        <div *ngIf="myListings().length > 0" class="my-table-wrap card">
          <table class="my-table">
            <thead>
              <tr>
                <th>Skin</th>
                <th>Precio</th>
                <th>Status</th>
                <th>Fecha</th>
                <th>Comprador</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let l of myListings()">
                <td>
                  <div class="row-skin">
                    <div class="row-img" [style.--rarity]="rarityVar(l.skin.rarity)">
                      <img *ngIf="l.skin.imageUrl" [src]="l.skin.imageUrl" />
                    </div>
                    <div>
                      <div class="row-name">{{ l.skin.name }}</div>
                      <div class="row-weapon">{{ l.skin.weapon }}</div>
                    </div>
                  </div>
                </td>
                <td class="row-price">{{ l.price | number:'1.0-0' }}</td>
                <td>
                  <span class="status-pill" [class.active]="l.status === 'active'"
                        [class.sold]="l.status === 'sold'"
                        [class.cancelled]="l.status === 'cancelled'">
                    {{ l.status.toUpperCase() }}
                  </span>
                </td>
                <td class="row-date">{{ l.createdAt | date:'short' }}</td>
                <td>{{ l.buyer?.username || '—' }}</td>
                <td>
                  <button *ngIf="l.status === 'active'" class="btn btn-danger" (click)="cancel(l)">CANCELAR</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <!-- MODAL VENDER -->
    <div *ngIf="showSellModal" class="modal-backdrop" (click)="closeSellModal()">
      <div class="modal" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h3>Vender skin</h3>
          <button class="modal-x" (click)="closeSellModal()">×</button>
        </header>
        <div class="modal-body">
          <p *ngIf="inventory().length === 0" class="empty-row">No tienes skins disponibles para vender.</p>

          <div class="sell-grid" *ngIf="inventory().length > 0">
            <button
              *ngFor="let s of inventory()"
              class="sell-tile"
              [class.selected]="selectedSkin?.id === s.id"
              (click)="selectSkin(s)">
              <div class="sell-img">
                <img *ngIf="s.imageUrl" [src]="s.imageUrl" />
              </div>
              <span class="sell-name">{{ s.name }}</span>
              <span class="sell-price">{{ s.price | number:'1.0-0' }}</span>
            </button>
          </div>

          <div *ngIf="selectedSkin" class="sell-form">
            <label>
              <span>Precio (1 - 999999)</span>
              <input type="number" [(ngModel)]="sellPrice" min="1" max="999999" placeholder="Coins" />
            </label>
            <div class="preview-row">
              <span>Vendiendo:</span>
              <strong>{{ selectedSkin.name }}</strong>
              <span class="preview-price">por {{ sellPrice | number:'1.0-0' }} coins</span>
            </div>
          </div>
        </div>
        <footer class="modal-foot">
          <button class="btn btn-ghost" (click)="closeSellModal()">Cancelar</button>
          <button class="btn btn-primary" [disabled]="!selectedSkin || !validPrice() || creating" (click)="confirmSell()">
            {{ creating ? 'Publicando...' : 'PUBLICAR' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- MODAL CONFIRMAR COMPRA -->
    <div *ngIf="buyTarget()" class="modal-backdrop" (click)="cancelBuy()">
      <div class="modal narrow" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h3>Confirmar compra</h3>
          <button class="modal-x" (click)="cancelBuy()">×</button>
        </header>
        <div class="modal-body buy-preview">
          <div class="buy-img" [style.--rarity]="rarityVar(buyTarget()!.skin.rarity)">
            <img *ngIf="buyTarget()!.skin.imageUrl" [src]="buyTarget()!.skin.imageUrl" />
          </div>
          <h3>{{ buyTarget()!.skin.name }}</h3>
          <p class="buy-meta">{{ buyTarget()!.skin.weapon }} · {{ buyTarget()!.skin.rarity }}</p>
          <p class="buy-seller">de <strong>{{ buyTarget()!.seller.username }}</strong></p>
          <p class="buy-price">{{ buyTarget()!.price | number:'1.0-0' }} coins</p>
          <p class="buy-balance">Tu saldo: {{ auth.user()?.balance | number:'1.0-0' }} → {{ ((auth.user()?.balance || 0) - buyTarget()!.price) | number:'1.0-0' }}</p>
        </div>
        <footer class="modal-foot">
          <button class="btn btn-ghost" (click)="cancelBuy()">Cancelar</button>
          <button class="btn btn-primary" [disabled]="buying" (click)="confirmBuy()">
            {{ buying ? 'Comprando...' : 'CONFIRMAR' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1400px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }

    .page-head {
      display: flex; align-items: flex-end; justify-content: space-between;
      gap: 1.5rem; flex-wrap: wrap;
    }
    .title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 40px;
      letter-spacing: 0.06em; line-height: 1; margin: 0;
      color: var(--text-primary);
    }
    .subtitle { color: var(--text-secondary); margin: 4px 0 0; font-size: 14px; }

    /* Filtros */
    .filter-bar {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      display: flex; flex-direction: column; gap: 0.7rem;
      position: sticky; top: 0;
      z-index: 30;
      backdrop-filter: blur(6px);
    }
    .filter-row { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; }
    .filter-row.split { gap: 1.2rem; }
    .filter-label {
      font-size: 11px; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--text-muted);
      font-weight: 600;
    }
    .pills { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .pill {
      --rarity: var(--text-muted);
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      color: var(--text-secondary);
      padding: 0.35rem 0.85rem;
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
    .control { display: flex; align-items: center; gap: 0.4rem; color: var(--text-muted); font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
    .control select, .control input {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      color: var(--text-primary);
      padding: 0.4rem 0.7rem;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-family: 'Inter', sans-serif;
    }
    .control select:focus, .control input:focus { outline: none; border-color: var(--accent); }
    .range-inputs { display: flex; gap: 0.3rem; align-items: center; color: var(--text-muted); }
    .range-inputs input { width: 90px; }

    /* GRID */
    .grid {
      display: grid; gap: 12px;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    }
    .skeleton-card { aspect-ratio: 1 / 1.35; }

    .empty-state { padding: 4rem 2rem; }
    .empty-state svg { width: 48px; height: 48px; }

    .listing {
      --rarity: var(--text-muted);
      position: relative;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex; flex-direction: column;
      transition: var(--transition);
    }
    .listing::after {
      content: '';
      position: absolute; left: 0; right: 0; bottom: 0;
      height: 3px; background: var(--rarity);
    }
    .listing:hover {
      transform: translateY(-3px);
      border-color: rgba(255,107,0,0.35);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--rarity) 22%, transparent);
    }
    .listing.mine::before {
      content: '';
      position: absolute; inset: 0;
      border: 2px solid var(--gold);
      border-radius: var(--radius-md);
      pointer-events: none;
    }

    .listing-head {
      display: flex; justify-content: space-between; align-items: center;
      padding: 0.55rem 0.7rem 0.3rem;
    }
    .listing-price {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 18px;
      color: var(--accent);
      line-height: 1;
    }
    .listing-price small {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 10px;
      color: var(--text-muted);
      margin-left: 2px;
    }
    .rarity-badge {
      padding: 2px 6px; border-radius: 4px;
      font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--rarity);
      background: color-mix(in srgb, var(--rarity) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--rarity) 30%, transparent);
    }

    .listing-img {
      flex: 0 0 110px;
      padding: 8px;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle, color-mix(in srgb, var(--rarity) 8%, transparent), transparent 75%);
    }
    .listing-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .listing-img .fallback { color: var(--text-muted); opacity: 0.4; font-size: 22px; }

    .listing-body {
      padding: 0.4rem 0.75rem 0.85rem;
      display: flex; flex-direction: column; gap: 2px;
    }
    .listing-name {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 14px;
      color: var(--text-primary);
      margin: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .listing-meta { color: var(--text-muted); font-size: 11px; margin: 0; }
    .listing-foot {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 6px; gap: 0.4rem;
    }
    .seller { display: flex; align-items: center; gap: 4px; min-width: 0; }
    .seller-avatar {
      width: 18px; height: 18px; border-radius: 5px;
      background: linear-gradient(135deg, var(--accent), #ff3d00);
      color: #fff; font-weight: 700; font-size: 10px;
      display: flex; align-items: center; justify-content: center;
    }
    .seller-name { color: var(--text-secondary); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .base-price { color: var(--text-muted); font-size: 10px; }

    .mine-badge {
      position: absolute; top: 6px; right: 6px;
      padding: 2px 6px; border-radius: 4px;
      font-size: 9px; font-weight: 800; letter-spacing: 0.08em;
      background: var(--gold-muted); color: var(--gold);
      border: 1px solid var(--gold);
      z-index: 2;
    }

    /* Hover overlay con botón */
    .listing-overlay {
      position: absolute; inset: 0;
      background: rgba(8, 8, 14, 0.78);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.18s ease;
      backdrop-filter: blur(2px);
    }
    .listing:hover .listing-overlay,
    .listing:focus-within .listing-overlay {
      opacity: 1; pointer-events: auto;
    }
    .listing-overlay .btn { padding: 0.65rem 1.2rem; font-size: 13px; letter-spacing: 0.08em; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.4rem; }
    .page-info { color: var(--text-muted); font-size: 12px; }

    /* Tienda oficial */
    .house-section { display: flex; flex-direction: column; gap: 0.75rem; }
    .house-title-group { display: flex; flex-direction: column; gap: 2px; }
    .house-sub { font-size: 11px; color: var(--text-muted); font-weight: 400; }
    .official-badge {
      padding: 2px 6px; border-radius: 4px;
      font-size: 9px; font-weight: 800; letter-spacing: 0.08em;
      background: rgba(16,185,129,0.1); color: #10b981;
      border: 1px solid rgba(16,185,129,0.25);
    }
    .house-listing { border-color: rgba(16,185,129,0.15); }
    .house-listing::after { background: rgba(16,185,129,0.5); }

    .p2p-label { display: flex; align-items: baseline; gap: 0.75rem; margin-top: 0.5rem; }

    /* Mis listings */
    .my-section { margin-top: 1.5rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; }
    .section-title {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 18px; color: var(--text-primary);
    }
    .empty-row { color: var(--text-muted); font-size: 13px; padding: 0.5rem 0; }

    .my-table-wrap { overflow-x: auto; padding: 0; }
    .my-table { width: 100%; border-collapse: collapse; min-width: 720px; }
    .my-table th {
      text-align: left; padding: 0.85rem 1rem;
      color: var(--text-muted); font-size: 10px;
      letter-spacing: 0.12em; text-transform: uppercase; font-weight: 600;
      border-bottom: 1px solid var(--border-subtle);
    }
    .my-table td {
      padding: 0.7rem 1rem;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-size: 13px;
    }
    .my-table tbody tr:last-child td { border-bottom: none; }
    .my-table tbody tr:hover { background: var(--bg-hover); }
    .row-skin { display: flex; align-items: center; gap: 0.6rem; }
    .row-img {
      --rarity: var(--text-muted);
      width: 44px; height: 44px;
      background: radial-gradient(circle, color-mix(in srgb, var(--rarity) 12%, transparent), transparent);
      border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      padding: 4px;
    }
    .row-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .row-name { color: var(--text-primary); font-weight: 600; }
    .row-weapon { color: var(--text-muted); font-size: 11px; }
    .row-price { color: var(--gold); font-family: 'Rajdhani', sans-serif; font-weight: 700; }
    .row-date { color: var(--text-muted); }
    .status-pill {
      padding: 2px 8px; border-radius: 999px;
      font-size: 10px; font-weight: 800; letter-spacing: 0.08em;
      border: 1px solid;
    }
    .status-pill.active { color: var(--green); border-color: var(--green); background: var(--green-muted); }
    .status-pill.sold { color: var(--text-muted); border-color: var(--border-default); background: var(--bg-elevated); }
    .status-pill.cancelled { color: var(--red); border-color: var(--red); background: var(--red-muted); }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(5,5,10,0.65);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 200; padding: 1rem;
      animation: backdrop-in 0.18s ease-out;
    }
    @keyframes backdrop-in { from { opacity: 0; } to { opacity: 1; } }
    .modal {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      width: min(640px, 100%);
      max-height: 88vh;
      display: flex; flex-direction: column;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
    }
    .modal.narrow { width: min(420px, 100%); }
    .modal-head {
      padding: 1.1rem 1.4rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex; align-items: center; justify-content: space-between;
    }
    .modal-head h3 { font-family: 'Rajdhani', sans-serif; font-size: 22px; color: var(--text-primary); margin: 0; }
    .modal-x {
      background: transparent; border: none; color: var(--text-muted);
      font-size: 1.6rem; line-height: 1; cursor: pointer;
    }
    .modal-x:hover { color: var(--text-primary); }
    .modal-body { padding: 1.4rem; overflow-y: auto; flex: 1; }
    .modal-foot { padding: 1rem 1.4rem; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; gap: 0.6rem; }

    .sell-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 8px; margin-bottom: 0.9rem;
    }
    .sell-tile {
      background: var(--bg-surface); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm); padding: 0.5rem;
      cursor: pointer; color: var(--text-primary);
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      transition: var(--transition);
    }
    .sell-tile:hover { border-color: var(--accent); transform: translateY(-2px); }
    .sell-tile.selected { border-color: var(--accent); background: var(--accent-muted); box-shadow: 0 0 0 1px var(--accent); }
    .sell-img { width: 100%; height: 56px; display: flex; align-items: center; justify-content: center; }
    .sell-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .sell-name { font-size: 11px; line-height: 1.1; text-align: center; color: var(--text-secondary); }
    .sell-price { color: var(--gold); font-weight: 700; font-size: 12px; }

    .sell-form { display: flex; flex-direction: column; gap: 0.7rem; }
    .sell-form label { display: flex; flex-direction: column; gap: 0.3rem; color: var(--text-muted); font-size: 12px; }
    .sell-form input {
      background: var(--bg-surface); border: 1px solid var(--border-default);
      color: var(--text-primary); padding: 0.65rem 0.85rem;
      border-radius: var(--radius-sm); font-size: 14px;
    }
    .sell-form input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-muted); }
    .preview-row {
      display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;
      padding: 0.7rem 0.85rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      font-size: 13px;
    }
    .preview-row strong { color: var(--accent); }
    .preview-price { color: var(--gold); margin-left: auto; font-weight: 700; }

    /* Buy modal */
    .buy-preview { text-align: center; }
    .buy-img {
      --rarity: var(--text-muted);
      width: 220px; height: 160px; margin: 0 auto 0.7rem;
      background: radial-gradient(circle, color-mix(in srgb, var(--rarity) 12%, transparent), transparent 75%);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .buy-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .buy-meta { color: var(--text-muted); margin: 0.2rem 0; font-size: 13px; }
    .buy-seller { color: var(--text-secondary); margin: 0.2rem 0; font-size: 13px; }
    .buy-seller strong { color: var(--accent); }
    .buy-price {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700; font-size: 28px;
      color: var(--gold);
      margin: 0.6rem 0;
    }
    .buy-balance { color: var(--text-muted); font-size: 12px; margin: 0; }
  `],
})
export class MarketplaceComponent implements OnInit, OnDestroy {
  rarities = RARITIES;
  weapons = WEAPONS;

  filters: MarketFilters = { sortBy: 'newest', page: 1, limit: 24 };
  listings = signal<Listing[]>([]);
  myListings = signal<Listing[]>([]);
  inventory = signal<Skin[]>([]);
  loading = signal(true);
  page = signal(1);
  totalPages = signal(1);

  showSellModal = false;
  selectedSkin?: Skin;
  sellPrice = 0;
  creating = false;

  buyTarget = signal<Listing | null>(null);
  buying = false;

  skeletonArr = Array.from({ length: 12 });
  houseListings = signal<Listing[]>([]);
  houseLoading = signal(true);
  housePage = signal(1);
  houseTotalPages = signal(1);
  houseSkeletonArr = Array.from({ length: 6 });

  private subs: Subscription[] = [];

  constructor(
    public auth: AuthService,
    private market: MarketService,
    private socket: SocketService,
    private skins: SkinsService,
    private toastSvc: ToastService,
  ) {}

  ngOnInit() {
    this.reload();
    this.loadMyListings();
    this.loadHouseListings();
    this.socket.joinMarketplace();

    this.subs.push(
      this.socket.onMarketListed().subscribe((l) => {
        if (this.matchesFilters(l) && this.page() === 1) {
          this.listings.update((arr) => [l, ...arr.filter((x) => x.id !== l.id)].slice(0, this.filters.limit || 24));
        }
      }),
      this.socket.onMarketSold().subscribe((l) => {
        this.listings.update((arr) => arr.filter((x) => x.id !== l.id));
      }),
      this.socket.onMarketCancelled().subscribe((l) => {
        this.listings.update((arr) => arr.filter((x) => x.id !== l.id));
      }),
    );
  }

  ngOnDestroy() {
    this.socket.leaveMarketplace();
    this.subs.forEach((s) => s.unsubscribe());
  }

  reload(resetPage = true) {
    if (resetPage) this.filters.page = 1;
    this.loading.set(true);
    this.market.getListings(this.normalizeFilters()).subscribe({
      next: (res) => {
        this.listings.set(this.normalizeListings(res.items));
        this.page.set(res.page);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => {
        this.listings.set([]);
        this.loading.set(false);
        this.toastSvc.error('Error al cargar listings');
      },
    });
  }

  loadMyListings() {
    this.market.getMyListings().subscribe((items) => this.myListings.set(this.normalizeListings(items)));
  }

  loadInventory() {
    this.skins.getInventory().subscribe((s) => this.inventory.set(s));
  }

  loadHouseListings() {
    this.houseLoading.set(true);
    this.market.getHouseListings(this.housePage(), 12).subscribe({
      next: (res) => {
        this.houseListings.set(this.normalizeListings(res.items));
        this.housePage.set(res.page);
        this.houseTotalPages.set(res.totalPages);
        this.houseLoading.set(false);
      },
      error: () => { this.houseLoading.set(false); },
    });
  }

  goHousePage(p: number) {
    this.housePage.set(p);
    this.loadHouseListings();
  }

  setRarity(r?: string) {
    this.filters.rarity = r;
    this.reload();
  }

  clearFilters() {
    this.filters = { sortBy: 'newest', page: 1, limit: 24 };
    this.reload();
  }

  goPage(p: number) {
    this.filters.page = p;
    this.loading.set(true);
    this.market.getListings(this.normalizeFilters()).subscribe({
      next: (res) => {
        this.listings.set(this.normalizeListings(res.items));
        this.page.set(res.page);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /* Sell */
  openSellModal() {
    this.loadInventory();
    this.selectedSkin = undefined;
    this.sellPrice = 0;
    this.showSellModal = true;
  }
  closeSellModal() { this.showSellModal = false; this.selectedSkin = undefined; }
  selectSkin(s: Skin) {
    this.selectedSkin = s;
    if (!this.sellPrice) this.sellPrice = Math.round(s.price);
  }
  validPrice() { return this.sellPrice >= 1 && this.sellPrice <= 999999; }
  confirmSell() {
    if (!this.selectedSkin || !this.validPrice() || this.creating) return;
    this.creating = true;
    this.market.createListing(String(this.selectedSkin.id), this.sellPrice).subscribe({
      next: () => {
        this.creating = false;
        this.showSellModal = false;
        this.selectedSkin = undefined;
        this.toastSvc.success('Listing publicado');
        this.loadMyListings();
        this.reload(false);
      },
      error: (err) => {
        this.creating = false;
        this.toastSvc.error(err?.error?.error || 'Error al publicar');
      },
    });
  }

  /* Buy */
  askBuy(l: Listing) {
    if (this.isMine(l) || !this.canAfford(l)) return;
    this.buyTarget.set(l);
  }
  cancelBuy() { this.buyTarget.set(null); }
  confirmBuy() {
    const target = this.buyTarget();
    if (!target || this.buying) return;
    this.buying = true;
    this.market.buyListing(target.id).subscribe({
      next: (sold) => {
        this.buying = false;
        this.buyTarget.set(null);
        this.listings.update((arr) => arr.filter((x) => x.id !== target.id));
        this.toastSvc.success(`Has comprado ${sold.skin.name}`);
        this.loadMyListings();
      },
      error: (err) => {
        this.buying = false;
        this.toastSvc.error(err?.error?.error || 'Error al comprar');
      },
    });
  }

  cancel(l: Listing) {
    if (l.status !== 'active') return;
    this.market.cancelListing(l.id).subscribe({
      next: () => {
        this.listings.update((arr) => arr.filter((x) => x.id !== l.id));
        this.loadMyListings();
        this.toastSvc.success('Listing cancelado');
      },
      error: (err) => this.toastSvc.error(err?.error?.error || 'Error al cancelar'),
    });
  }

  /* Helpers */
  isMine(l: Listing) {
    const me = this.auth.user();
    return !!me && String(me.id) === String(l.sellerId);
  }
  canAfford(l: Listing) { return (this.auth.user()?.balance || 0) >= l.price; }
  initial(name?: string) { return (name?.charAt(0) || '?').toUpperCase(); }
  rarityVar(r?: string): string {
    if (!r) return 'var(--text-muted)';
    const key = r.toLowerCase().replace(/\s+/g, '');
    return RARITY_VARS[key] ? `var(${RARITY_VARS[key]})` : 'var(--text-muted)';
  }
  trackById(_: number, l: Listing) { return l.id; }

  private matchesFilters(l: Listing): boolean {
    if (l.status !== 'active') return false;
    if (this.filters.rarity && l.skin.rarity !== this.filters.rarity) return false;
    if (this.filters.weapon && l.skin.weapon !== this.filters.weapon) return false;
    if (this.filters.minPrice != null && l.price < this.filters.minPrice) return false;
    if (this.filters.maxPrice != null && l.price > this.filters.maxPrice) return false;
    return true;
  }

  private normalizeFilters(): MarketFilters {
    const f: MarketFilters = { ...this.filters };
    if (f.minPrice == null || (f.minPrice as any) === '') delete f.minPrice;
    if (f.maxPrice == null || (f.maxPrice as any) === '') delete f.maxPrice;
    return f;
  }

  private normalizeListings(items: Listing[]): Listing[] {
    return items.map((l) => ({
      ...l,
      sellerId: String(l.sellerId),
      buyerId: l.buyerId != null ? String(l.buyerId) : undefined,
      skinId: String(l.skinId),
      seller: l.seller ? { ...l.seller, id: String(l.seller.id) } : l.seller,
      buyer: l.buyer ? { ...l.buyer, id: String(l.buyer.id) } : l.buyer,
      skin: l.skin ? { ...l.skin, id: String(l.skin.id) } : l.skin,
    }));
  }
}
