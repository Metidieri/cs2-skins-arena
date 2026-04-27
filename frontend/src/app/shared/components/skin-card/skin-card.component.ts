import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Skin } from '../../../models/skin.model';

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
  selector: 'app-skin-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skin-card"
      [class.selected]="selected"
      [style.--rarity]="rarityVar()"
      (click)="select()"
      tabindex="0"
      (keydown.enter)="select()">
      <div class="skin-img">
        <img
          *ngIf="skin.imageUrl && !imgFailed"
          [src]="skin.imageUrl"
          [alt]="skin.name"
          (error)="onImgError()" />
        <span *ngIf="!skin.imageUrl || imgFailed" class="fallback">
          {{ skin.weapon || '?' }}
        </span>
      </div>

      <div class="skin-info">
        <h3 class="name">{{ skin.name }}</h3>
        <p class="weapon">{{ skin.weapon }}</p>
        <div class="meta-row">
          <span class="price">{{ skin.price | number:'1.0-0' }} <small>coins</small></span>
          <span class="rarity-badge">{{ rarityShort() }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .skin-card {
      --rarity: var(--text-muted);
      position: relative;
      aspect-ratio: 1 / 1.2;
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
      cursor: pointer;
      outline: none;
      display: flex;
      flex-direction: column;
      transition: var(--transition);
    }
    .skin-card::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 3px;
      background: var(--rarity);
    }
    .skin-card:hover, .skin-card:focus-visible {
      transform: translateY(-4px);
      border-color: rgba(255,107,0,0.4);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--rarity) 22%, transparent);
    }
    .skin-card.selected {
      border: 2px solid var(--accent);
      box-shadow: 0 0 0 1px var(--accent), var(--accent-glow);
      transform: scale(1.02);
    }

    /* Imagen 60% del alto */
    .skin-img {
      flex: 0 0 60%;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(
        circle at center,
        color-mix(in srgb, var(--rarity) 8%, transparent) 0%,
        transparent 75%
      );
    }
    .skin-img img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .skin-img .fallback {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 18px;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      opacity: 0.3;
      text-align: center;
    }

    /* Info 40% restante */
    .skin-info {
      flex: 1;
      padding: 8px 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-height: 0;
    }
    .name {
      font-family: 'Rajdhani', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: 0.01em;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .weapon {
      font-size: 11px;
      color: var(--text-muted);
      line-height: 1.2;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .meta-row {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
    }
    .price {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 15px;
      color: var(--gold);
      line-height: 1;
    }
    .price small {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 10px;
      color: var(--text-muted);
      margin-left: 2px;
    }
    .rarity-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--rarity);
      background: color-mix(in srgb, var(--rarity) 15%, transparent);
      border: 1px solid color-mix(in srgb, var(--rarity) 35%, transparent);
    }
  `],
})
export class SkinCardComponent {
  @Input() skin!: Skin;
  @Input() selected = false;
  @Output() onSelect = new EventEmitter<Skin>();

  imgFailed = false;

  rarityKey(): string {
    return (this.skin?.rarity || '').toLowerCase().replace(/\s+/g, '');
  }

  rarityVar(): string {
    const key = this.rarityKey();
    const cssVar = RARITY_VARS[key];
    return cssVar ? `var(${cssVar})` : 'var(--text-muted)';
  }

  rarityShort(): string {
    const r = this.skin?.rarity || '';
    if (r.length <= 4) return r.toUpperCase();
    // Abreviaciones tipo CS2: Mil-Spec → MS, Restricted → RES, Classified → CLS, Covert → COV...
    const map: Record<string, string> = {
      consumer: 'CONS',
      industrial: 'IND',
      'mil-spec': 'MS',
      milspec: 'MS',
      restricted: 'RES',
      classified: 'CLS',
      covert: 'COV',
      contraband: 'CONT',
    };
    return map[r.toLowerCase().replace(/\s+/g, '')] || r.slice(0, 4).toUpperCase();
  }

  onImgError() {
    this.imgFailed = true;
  }

  select() {
    if (this.skin) this.onSelect.emit(this.skin);
  }
}
