import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { MarketService } from '../../services/market.service';
import { SocketService } from '../../services/socket.service';
import { SkinsService } from '../../services/skins.service';
import { Listing, MarketFilters } from '../../models/market.model';
import { Skin } from '../../models/skin.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ToastService } from '../../shared/services/toast.service';

const RARITIES = [
  'Consumer', 'Industrial', 'Mil-Spec',
  'Restricted', 'Classified', 'Covert',
];
const WEAPONS = [
  'AK-47', 'M4A1-S', 'M4A4', 'AWP',
  'Desert Eagle', 'USP-S', 'Glock-18',
  'Karambit', 'M9 Bayonet',
];
const RARITY_COLORS: Record<string, string> = {
  consumer: '#b0c3d9',
  industrial: '#5e98d9',
  milspec: '#4b69ff',
  'mil-spec': '#4b69ff',
  restricted: '#8847ff',
  classified: '#d32ce6',
  covert: '#eb4b4b',
  contraband: '#e4ae39',
};

type SortBy = 'price_asc' | 'price_desc' | 'newest';

@Component({
  selector: 'app-marketplace',
  standalone: true,
  imports: [CommonModule, FormsModule, NavbarComponent],
  template: `
    <app-navbar></app-navbar>

    <main class="page">
      <header class="hero">
        <div>
          <h1 class="title">MARKETPLACE</h1>
          <p class="subtitle">Compra, vende e intercambia skins.</p>
        </div>
        <button class="cta" (click)="openSellModal()">＋ VENDER SKIN</button>
      </header>

      <!-- FILTROS -->
      <section class="filters">
        <div class="filter-row">
          <span class="filter-label">RAREZA</span>
          <div class="pills">
            <button class="pill" [class.active]="!filters.rarity" (click)="setRarity(undefined)">Todas</button>
            <button
              *ngFor="let r of rarities"
              class="pill"
              [class.active]="filters.rarity === r"
              [style.border-color]="filters.rarity === r ? rarityColor(r) : ''"
              [style.color]="filters.rarity === r ? rarityColor(r) : ''"
              (click)="setRarity(r)">
              {{ r }}
            </button>
          </div>
        </div>

        <div class="filter-row split">
          <div class="control">
            <label>ARMA</label>
            <select [(ngModel)]="filters.weapon" (change)="reload()">
              <option [ngValue]="undefined">Todas</option>
              <option *ngFor="let w of weapons" [ngValue]="w">{{ w }}</option>
            </select>
          </div>

          <div class="control range">
            <label>PRECIO</label>
            <div class="range-inputs">
              <input type="number" [(ngModel)]="filters.minPrice" (change)="reload()" placeholder="Min" min="0" />
              <span>—</span>
              <input type="number" [(ngModel)]="filters.maxPrice" (change)="reload()" placeholder="Max" min="0" />
            </div>
          </div>

          <div class="control">
            <label>ORDENAR</label>
            <select [(ngModel)]="filters.sortBy" (change)="reload()">
              <option ngValue="newest">Más reciente</option>
              <option ngValue="price_asc">Precio menor</option>
              <option ngValue="price_desc">Precio mayor</option>
            </select>
          </div>

          <button class="ghost" (click)="clearFilters()">Limpiar</button>
        </div>
      </section>

      <!-- GRID -->
      <section class="grid-wrap">
        <div *ngIf="loading()" class="grid">
          <div *ngFor="let _ of skeletonArr" class="skeleton"></div>
        </div>

        <div *ngIf="!loading() && listings().length === 0" class="empty">
          <div class="empty-icon">🛒</div>
          <p>No hay listings con esos filtros.</p>
          <button class="ghost" (click)="clearFilters()">Limpiar filtros</button>
        </div>

        <div *ngIf="!loading() && listings().length > 0" class="grid">
          <article
            *ngFor="let l of listings(); trackBy: trackById"
            class="card">
            <div class="card-img"
                 [style.box-shadow]="'inset 0 -3px 0 ' + rarityColor(l.skin.rarity)">
              <img *ngIf="l.skin.imageUrl" [src]="l.skin.imageUrl" [alt]="l.skin.name" />
              <span *ngIf="!l.skin.imageUrl" class="fallback">?</span>
              <span class="rarity-badge"
                    [style.color]="rarityColor(l.skin.rarity)"
                    [style.background]="rarityBg(l.skin.rarity)">
                {{ l.skin.rarity }}
              </span>
              <span *ngIf="isMine(l)" class="mine-badge">TUYO</span>
            </div>
            <h3 class="card-name">{{ l.skin.name }}</h3>
            <p class="card-weapon">{{ l.skin.weapon }}</p>
            <div class="card-seller">
              <span class="seller-avatar">{{ initial(l.seller.username) }}</span>
              <span class="seller-name">{{ l.seller.username }}</span>
            </div>
            <div class="card-foot">
              <span class="card-price">◈ {{ l.price | number:'1.0-0' }}</span>
              <button
                *ngIf="!isMine(l)"
                class="buy-btn"
                [disabled]="!canAfford(l)"
                (click)="askBuy(l)">
                {{ canAfford(l) ? 'COMPRAR' : 'SALDO' }}
              </button>
              <button
                *ngIf="isMine(l)"
                class="cancel-btn"
                (click)="cancel(l)">
                CANCELAR
              </button>
            </div>
          </article>
        </div>

        <div *ngIf="!loading() && totalPages() > 1" class="pagination">
          <button class="ghost" [disabled]="page() <= 1" (click)="goPage(page() - 1)">‹ Anterior</button>
          <span class="page-info">Página {{ page() }} de {{ totalPages() }}</span>
          <button class="ghost" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">Siguiente ›</button>
        </div>
      </section>

      <!-- MIS LISTINGS -->
      <section class="my-section">
        <div class="my-head">
          <h2 class="section-h">Mis listings</h2>
          <button class="ghost" (click)="loadMyListings()">↻ Actualizar</button>
        </div>
        <p *ngIf="myListings().length === 0" class="empty-row">Aún no has puesto skins en venta.</p>
        <div *ngIf="myListings().length > 0" class="my-table-wrap">
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
                    <div class="row-img">
                      <img *ngIf="l.skin.imageUrl" [src]="l.skin.imageUrl" />
                      <span *ngIf="!l.skin.imageUrl" class="fallback">?</span>
                    </div>
                    <div>
                      <div class="row-name">{{ l.skin.name }}</div>
                      <div class="row-weapon">{{ l.skin.weapon }}</div>
                    </div>
                  </div>
                </td>
                <td class="row-price">◈ {{ l.price | number:'1.0-0' }}</td>
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
                  <button *ngIf="l.status === 'active'" class="cancel-btn small" (click)="cancel(l)">CANCELAR</button>
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
          <button class="x" (click)="closeSellModal()">×</button>
        </header>

        <p *ngIf="inventory().length === 0" class="empty-row">No tienes skins disponibles para vender.</p>

        <div class="inv-grid" *ngIf="inventory().length > 0">
          <button
            *ngFor="let s of inventory()"
            class="inv-tile"
            [class.selected]="selectedSkin?.id === s.id"
            (click)="selectSkin(s)">
            <div class="inv-img">
              <img *ngIf="s.imageUrl" [src]="s.imageUrl" />
              <span *ngIf="!s.imageUrl" class="fallback">?</span>
            </div>
            <span class="inv-name">{{ s.name }}</span>
            <span class="inv-price">{{ s.price | number:'1.0-0' }}</span>
          </button>
        </div>

        <div *ngIf="selectedSkin" class="sell-form">
          <label>
            <span>Precio (1 - 999999)</span>
            <input type="number" [(ngModel)]="sellPrice" min="1" max="999999" placeholder="Coins" />
          </label>
          <div class="preview">
            <span>Vendiendo:</span>
            <strong>{{ selectedSkin.name }}</strong>
            <span class="preview-price">por {{ sellPrice | number:'1.0-0' }} coins</span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="ghost" (click)="closeSellModal()">Cancelar</button>
          <button
            class="cta"
            [disabled]="!selectedSkin || !validPrice() || creating"
            (click)="confirmSell()">
            {{ creating ? 'Publicando...' : 'PUBLICAR' }}
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL CONFIRMAR COMPRA -->
    <div *ngIf="buyTarget()" class="modal-backdrop" (click)="cancelBuy()">
      <div class="modal narrow" (click)="$event.stopPropagation()">
        <header class="modal-head">
          <h3>Confirmar compra</h3>
          <button class="x" (click)="cancelBuy()">×</button>
        </header>

        <div class="buy-preview">
          <div class="buy-img"
               [style.box-shadow]="'inset 0 -3px 0 ' + rarityColor(buyTarget()!.skin.rarity)">
            <img *ngIf="buyTarget()!.skin.imageUrl" [src]="buyTarget()!.skin.imageUrl" />
            <span *ngIf="!buyTarget()!.skin.imageUrl" class="fallback">?</span>
          </div>
          <h3>{{ buyTarget()!.skin.name }}</h3>
          <p class="buy-meta">{{ buyTarget()!.skin.weapon }} · {{ buyTarget()!.skin.rarity }}</p>
          <p class="buy-seller">de <strong>{{ buyTarget()!.seller.username }}</strong></p>
          <p class="buy-price">◈ {{ buyTarget()!.price | number:'1.0-0' }} coins</p>
          <p class="buy-balance">Tu saldo: {{ auth.user()?.balance | number:'1.0-0' }} → {{ ((auth.user()?.balance || 0) - buyTarget()!.price) | number:'1.0-0' }}</p>
        </div>

        <div class="modal-actions">
          <button class="ghost" (click)="cancelBuy()">Cancelar</button>
          <button class="cta" [disabled]="buying" (click)="confirmBuy()">
            {{ buying ? 'Comprando...' : 'CONFIRMAR COMPRA' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TOAST -->
    <div *ngIf="toast()" class="toast" [class.error]="toast()?.type === 'error'" [class.success]="toast()?.type === 'success'">
      {{ toast()?.message }}
    </div>
  `,
  styles: [`
    :host { display: block; background: #0a0a0f; min-height: 100vh; color: #e0e0e0; }
    .page { max-width: 1400px; margin: 0 auto; padding: 1.5rem 2rem 3rem; }

    .hero {
      display: flex; align-items: center; justify-content: space-between;
      padding: 1.6rem 1.8rem; margin-bottom: 1.4rem;
      background: linear-gradient(135deg, #16161a 0%, #1f1216 100%);
      border: 1px solid #2a2a35; border-radius: 14px;
      box-shadow: 0 0 40px rgba(255,107,0,0.06);
    }
    .title {
      font-size: 2.4rem; font-weight: 900; letter-spacing: 0.1em; margin: 0;
      background: linear-gradient(90deg, #ff6b00, #ffd700);
      -webkit-background-clip: text; background-clip: text; color: transparent;
    }
    .subtitle { color: #888; margin: 0.3rem 0 0; }
    .cta {
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      border: none; padding: 0.85rem 1.4rem; border-radius: 10px;
      font-weight: 800; letter-spacing: 0.08em; cursor: pointer;
      box-shadow: 0 4px 18px rgba(255,107,0,0.32);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 22px rgba(255,107,0,0.45); }
    .cta:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; transform: none; }
    .ghost {
      background: transparent; color: #aaa; border: 1px solid #2a2a35;
      padding: 0.5rem 0.9rem; border-radius: 8px; cursor: pointer; font-weight: 600;
      transition: color 0.15s, border-color 0.15s;
    }
    .ghost:hover:not(:disabled) { color: #fff; border-color: #444; }
    .ghost:disabled { opacity: 0.4; cursor: not-allowed; }

    /* Filtros */
    .filters {
      position: sticky; top: 70px; z-index: 30;
      background: rgba(10,10,15,0.92);
      backdrop-filter: blur(8px);
      padding: 1rem 1.2rem; margin-bottom: 1.4rem;
      border: 1px solid #2a2a35; border-radius: 12px;
      display: flex; flex-direction: column; gap: 0.9rem;
    }
    .filter-row { display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; }
    .filter-row.split { gap: 1.4rem; }
    .filter-label { color: #666; font-size: 0.74rem; letter-spacing: 0.15em; }
    .pills { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .pill {
      background: #16161a; border: 1px solid #2a2a35; color: #aaa;
      padding: 0.4rem 0.85rem; border-radius: 999px; font-size: 0.82rem;
      font-weight: 600; cursor: pointer; transition: all 0.15s;
    }
    .pill:hover { color: #fff; border-color: #444; }
    .pill.active { background: rgba(255,107,0,0.1); border-color: #ff6b00; color: #ff6b00; }
    .control { display: flex; flex-direction: column; gap: 0.3rem; min-width: 140px; }
    .control label { color: #666; font-size: 0.7rem; letter-spacing: 0.15em; }
    .control select, .control input {
      background: #0a0a0f; border: 1px solid #2a2a35; color: #e0e0e0;
      padding: 0.55rem 0.8rem; border-radius: 8px;
      font-size: 0.92rem;
    }
    .control select:focus, .control input:focus {
      outline: none; border-color: #ff6b00;
    }
    .range-inputs { display: flex; gap: 0.4rem; align-items: center; }
    .range-inputs input { width: 90px; }

    /* Grid */
    .grid-wrap { min-height: 200px; }
    .grid {
      display: grid; gap: 1rem;
      grid-template-columns: repeat(2, 1fr);
    }
    @media (min-width: 640px)  { .grid { grid-template-columns: repeat(3, 1fr); } }
    @media (min-width: 960px)  { .grid { grid-template-columns: repeat(4, 1fr); } }
    @media (min-width: 1280px) { .grid { grid-template-columns: repeat(5, 1fr); } }

    .skeleton {
      background: linear-gradient(90deg, #16161a 0%, #1d1d24 50%, #16161a 100%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 12px; height: 280px;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    .empty {
      text-align: center; padding: 4rem 2rem;
      background: #16161a; border: 1px dashed #2a2a35; border-radius: 14px;
    }
    .empty-icon { font-size: 3rem; margin-bottom: 0.4rem; }
    .empty p { color: #888; margin-bottom: 1rem; }
    .empty-row { color: #666; padding: 0.8rem 0; }

    .card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 12px;
      padding: 0.9rem; display: flex; flex-direction: column;
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .card:hover { transform: translateY(-3px); border-color: #ff6b00; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
    .card-img {
      position: relative; background: #0a0a0f;
      border-radius: 10px; padding: 0.7rem; min-height: 120px;
      display: flex; align-items: center; justify-content: center;
      margin-bottom: 0.6rem;
    }
    .card-img img { max-width: 100%; max-height: 100px; object-fit: contain; }
    .card-img .fallback { color: #444; font-size: 1.8rem; }
    .rarity-badge {
      position: absolute; top: 6px; left: 6px;
      padding: 0.18rem 0.5rem; border-radius: 4px;
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .mine-badge {
      position: absolute; top: 6px; right: 6px;
      padding: 0.18rem 0.5rem; border-radius: 4px;
      font-size: 0.62rem; font-weight: 800; letter-spacing: 0.08em;
      background: rgba(255,215,0,0.18); color: #ffd700;
      border: 1px solid #ffd700;
    }
    .card-name { color: #e0e0e0; font-size: 0.88rem; margin: 0; line-height: 1.2; }
    .card-weapon { color: #888; font-size: 0.72rem; margin: 0.1rem 0; }
    .card-seller {
      display: flex; align-items: center; gap: 0.4rem;
      margin: 0.4rem 0;
    }
    .seller-avatar {
      width: 22px; height: 22px; border-radius: 50%;
      background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.72rem; font-weight: 800;
    }
    .seller-name { color: #aaa; font-size: 0.78rem; }
    .card-foot {
      margin-top: auto; padding-top: 0.5rem;
      display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;
    }
    .card-price { color: #ff6b00; font-weight: 800; font-size: 1rem; white-space: nowrap; }
    .buy-btn, .cancel-btn {
      border: none; padding: 0.5rem 0.85rem; border-radius: 7px;
      font-weight: 800; letter-spacing: 0.06em; cursor: pointer;
      font-size: 0.78rem;
      transition: transform 0.15s;
    }
    .buy-btn { background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff; }
    .buy-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .buy-btn:disabled { background: #2a2a35; color: #666; cursor: not-allowed; }
    .cancel-btn {
      background: transparent; border: 1px solid #ff4444; color: #ff4444;
    }
    .cancel-btn:hover { background: #ff4444; color: #fff; }
    .cancel-btn.small { padding: 0.35rem 0.7rem; font-size: 0.7rem; }

    .pagination {
      display: flex; align-items: center; justify-content: center; gap: 1rem;
      margin-top: 1.4rem;
    }
    .page-info { color: #666; font-size: 0.85rem; }

    /* Mis listings */
    .my-section { margin-top: 2.4rem; }
    .my-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.9rem; }
    .section-h { color: #e0e0e0; margin: 0; font-size: 1.15rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .my-table-wrap {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 12px;
      overflow-x: auto;
    }
    .my-table { width: 100%; border-collapse: collapse; min-width: 720px; }
    .my-table th {
      text-align: left; padding: 0.85rem 1rem;
      color: #666; font-size: 0.72rem; letter-spacing: 0.12em;
      border-bottom: 1px solid #2a2a35; font-weight: 600;
    }
    .my-table td {
      padding: 0.75rem 1rem; border-bottom: 1px solid #1f1f2a;
      color: #ccc; font-size: 0.88rem;
    }
    .my-table tbody tr:last-child td { border-bottom: none; }
    .my-table tbody tr:hover { background: rgba(255,107,0,0.04); }
    .row-skin { display: flex; align-items: center; gap: 0.6rem; }
    .row-img {
      width: 44px; height: 44px; background: #0a0a0f; border-radius: 6px;
      display: flex; align-items: center; justify-content: center; padding: 4px;
    }
    .row-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .row-img .fallback { color: #444; font-size: 1rem; }
    .row-name { color: #e0e0e0; font-weight: 600; }
    .row-weapon { color: #666; font-size: 0.78rem; }
    .row-price { color: #ff6b00; font-weight: 700; }
    .row-date { color: #888; }
    .status-pill {
      padding: 0.22rem 0.7rem; border-radius: 999px;
      font-size: 0.7rem; font-weight: 800; letter-spacing: 0.08em;
      border: 1px solid;
    }
    .status-pill.active { color: #4caf50; border-color: #4caf50; background: rgba(76,175,80,0.1); }
    .status-pill.sold { color: #888; border-color: #444; background: rgba(255,255,255,0.04); }
    .status-pill.cancelled { color: #ff4444; border-color: #ff4444; background: rgba(255,68,68,0.08); }

    /* Modal */
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.78);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; backdrop-filter: blur(4px); padding: 1rem;
      animation: fadein 0.18s ease-out;
    }
    @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
    .modal {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 14px;
      padding: 1.5rem; width: min(640px, 100%); max-height: 90vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,0.6);
    }
    .modal.narrow { width: min(420px, 100%); }
    .modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
    .modal-head h3 { color: #e0e0e0; margin: 0; font-size: 1.25rem; }
    .x { background: transparent; border: none; color: #666; font-size: 1.6rem; cursor: pointer; line-height: 1; }
    .x:hover { color: #fff; }

    .inv-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 0.6rem; margin: 0.8rem 0;
    }
    .inv-tile {
      background: #0a0a0f; border: 1px solid #2a2a35; border-radius: 8px;
      padding: 0.6rem; cursor: pointer; color: #e0e0e0;
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
      transition: transform 0.12s, border-color 0.12s;
    }
    .inv-tile:hover { transform: translateY(-2px); border-color: #ff6b00; }
    .inv-tile.selected { border-color: #ff6b00; background: #1a1410; box-shadow: 0 0 0 2px rgba(255,107,0,0.4); }
    .inv-img { width: 100%; height: 64px; display: flex; align-items: center; justify-content: center; }
    .inv-img img { max-width: 100%; max-height: 64px; object-fit: contain; }
    .inv-img .fallback { color: #444; font-size: 1.4rem; }
    .inv-name { font-size: 0.74rem; line-height: 1.1; text-align: center; }
    .inv-price { color: #ffd700; font-weight: 700; font-size: 0.78rem; }

    .sell-form { display: flex; flex-direction: column; gap: 0.7rem; margin: 0.8rem 0 1rem; }
    .sell-form label { display: flex; flex-direction: column; gap: 0.3rem; color: #888; font-size: 0.8rem; }
    .sell-form input {
      background: #0a0a0f; border: 1px solid #2a2a35; color: #e0e0e0;
      padding: 0.65rem 0.9rem; border-radius: 8px; font-size: 1rem;
    }
    .sell-form input:focus { outline: none; border-color: #ff6b00; }
    .preview {
      display: flex; align-items: center; gap: 0.5rem;
      padding: 0.7rem 0.9rem; background: #0a0a0f;
      border: 1px solid #2a2a35; border-radius: 8px; font-size: 0.9rem;
      color: #888; flex-wrap: wrap;
    }
    .preview strong { color: #ff6b00; }
    .preview-price { color: #ffd700; margin-left: auto; font-weight: 700; }

    .modal-actions { display: flex; justify-content: flex-end; gap: 0.6rem; }

    /* Buy modal */
    .buy-preview { text-align: center; margin-bottom: 1rem; }
    .buy-img {
      width: 220px; height: 160px; margin: 0 auto 0.7rem;
      background: #0a0a0f; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; padding: 1rem;
    }
    .buy-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .buy-meta { color: #888; margin: 0.2rem 0; font-size: 0.85rem; }
    .buy-seller { color: #aaa; margin: 0.2rem 0; font-size: 0.9rem; }
    .buy-seller strong { color: #ff6b00; }
    .buy-price { color: #ff6b00; font-weight: 800; font-size: 1.4rem; margin: 0.6rem 0; }
    .buy-balance { color: #888; font-size: 0.85rem; margin: 0; }

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
    @keyframes toastUp {
      from { transform: translate(-50%, 20px); opacity: 0; }
      to { transform: translate(-50%, 0); opacity: 1; }
    }
  `],
})
export class MarketplaceComponent implements OnInit, OnDestroy {
  rarities = RARITIES;
  weapons = WEAPONS;

  filters: MarketFilters = { sortBy: 'newest', page: 1, limit: 20 };
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

  toast = signal<{ type: 'success' | 'error'; message: string } | null>(null);

  skeletonArr = Array.from({ length: 10 });

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
    this.socket.joinMarketplace();

    this.subs.push(
      this.socket.onMarketListed().subscribe((l) => {
        if (this.matchesFilters(l) && this.page() === 1) {
          this.listings.update((arr) => [l, ...arr.filter((x) => x.id !== l.id)].slice(0, this.filters.limit || 20));
        }
      }),
      this.socket.onMarketSold().subscribe((l) => {
        this.listings.update((arr) => arr.filter((x) => x.id !== l.id));
        this.refreshUserBits(l);
      }),
      this.socket.onMarketCancelled().subscribe((l) => {
        this.listings.update((arr) => arr.filter((x) => x.id !== l.id));
        this.refreshUserBits(l);
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
        this.showToast('error', 'Error al cargar listings');
      },
    });
  }

  loadMyListings() {
    this.market.getMyListings().subscribe((items) => this.myListings.set(this.normalizeListings(items)));
  }

  loadInventory() {
    this.skins.getInventory().subscribe((s) => this.inventory.set(s));
  }

  setRarity(r?: string) {
    this.filters.rarity = r;
    this.reload();
  }

  clearFilters() {
    this.filters = { sortBy: 'newest', page: 1, limit: 20 };
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

  /* Sell flow */
  openSellModal() {
    this.loadInventory();
    this.selectedSkin = undefined;
    this.sellPrice = 0;
    this.showSellModal = true;
  }

  closeSellModal() {
    this.showSellModal = false;
    this.selectedSkin = undefined;
  }

  selectSkin(s: Skin) {
    this.selectedSkin = s;
    if (!this.sellPrice) this.sellPrice = Math.round(s.price);
  }

  validPrice() {
    return this.sellPrice >= 1 && this.sellPrice <= 999999;
  }

  confirmSell() {
    if (!this.selectedSkin || !this.validPrice() || this.creating) return;
    this.creating = true;
    this.market.createListing(String(this.selectedSkin.id), this.sellPrice).subscribe({
      next: () => {
        this.creating = false;
        this.showSellModal = false;
        this.selectedSkin = undefined;
        this.showToast('success', 'Listing publicado');
        this.loadMyListings();
        this.reload(false);
      },
      error: (err) => {
        this.creating = false;
        this.showToast('error', err?.error?.error || 'Error al publicar');
      },
    });
  }

  /* Buy flow */
  askBuy(l: Listing) {
    if (this.isMine(l) || !this.canAfford(l)) return;
    this.buyTarget.set(l);
  }

  cancelBuy() {
    this.buyTarget.set(null);
  }

  confirmBuy() {
    const target = this.buyTarget();
    if (!target || this.buying) return;
    this.buying = true;
    this.market.buyListing(target.id).subscribe({
      next: (sold) => {
        this.buying = false;
        this.buyTarget.set(null);
        this.listings.update((arr) => arr.filter((x) => x.id !== target.id));
        this.showToast('success', `Has comprado ${sold.skin.name}`);
        this.loadMyListings();
      },
      error: (err) => {
        this.buying = false;
        this.showToast('error', err?.error?.error || 'Error al comprar');
      },
    });
  }

  cancel(l: Listing) {
    if (l.status !== 'active') return;
    this.market.cancelListing(l.id).subscribe({
      next: () => {
        this.listings.update((arr) => arr.filter((x) => x.id !== l.id));
        this.loadMyListings();
        this.showToast('success', 'Listing cancelado');
      },
      error: (err) => this.showToast('error', err?.error?.error || 'Error al cancelar'),
    });
  }

  /* Helpers */
  isMine(l: Listing) {
    const me = this.auth.user();
    return !!me && String(me.id) === String(l.sellerId);
  }
  canAfford(l: Listing) {
    return (this.auth.user()?.balance || 0) >= l.price;
  }
  initial(name?: string) {
    return (name?.charAt(0) || '?').toUpperCase();
  }
  rarityColor(r?: string) {
    if (!r) return '#888';
    return RARITY_COLORS[r.toLowerCase().replace(/\s+/g, '')] || '#888';
  }
  rarityBg(r?: string) {
    return this.rarityColor(r) + '33';
  }
  trackById(_: number, l: Listing) {
    return l.id;
  }
  showToast(type: 'success' | 'error', message: string) {
    this.toast.set({ type, message });
    setTimeout(() => this.toast.set(null), 3200);
    if (type === 'error') this.toastSvc.error(message);
    else this.toastSvc.success(message);
  }

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

  private refreshUserBits(_l: Listing) {
    // placeholder if we want to refresh stats / balance after socket events from others
  }
}
