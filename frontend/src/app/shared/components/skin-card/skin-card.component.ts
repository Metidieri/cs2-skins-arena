import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Skin } from '../../../models/skin.model';

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

@Component({
  selector: 'app-skin-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="skin-card"
      [style.border-color]="rarityColor()"
      (click)="select()"
      tabindex="0"
      (keydown.enter)="select()">
      <div class="skin-img" [style.box-shadow]="'inset 0 -3px 0 ' + rarityColor()">
        <img
          *ngIf="skin.imageUrl && !imgFailed"
          [src]="skin.imageUrl"
          [alt]="skin.name"
          (error)="onImgError()" />
        <span *ngIf="!skin.imageUrl || imgFailed" class="fallback">
          {{ skin.weapon || '?' }}
        </span>
      </div>
      <h3 class="name">{{ skin.name }}</h3>
      <p class="weapon">{{ skin.weapon }}</p>
      <p class="price">{{ skin.price | number:'1.0-0' }} coins</p>
      <span class="rarity-badge"
            [style.color]="rarityColor()"
            [style.background]="rarityBg()">
        {{ skin.rarity }}
      </span>
    </div>
  `,
  styles: [`
    .skin-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 10px;
      padding: 1.2rem; text-align: center;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer; outline: none;
    }
    .skin-card:hover, .skin-card:focus {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    .skin-img {
      background: #0a0a0f; border-radius: 8px; padding: 0.5rem;
      margin-bottom: 0.8rem; min-height: 120px;
      display: flex; align-items: center; justify-content: center;
      color: #555; font-size: 0.9rem;
    }
    .skin-img img { max-width: 100%; max-height: 110px; object-fit: contain; }
    .fallback { padding: 1.5rem; font-weight: 600; }
    .name { color: #e0e0e0; font-size: 1rem; margin: 0 0 0.3rem; }
    .weapon { color: #888; font-size: 0.85rem; margin: 0; }
    .price { color: #ffd700; font-weight: 600; margin: 0.5rem 0; }
    .rarity-badge {
      display: inline-block; padding: 0.22rem 0.7rem; border-radius: 4px;
      font-size: 0.75rem; font-weight: 700; letter-spacing: 0.04em;
      text-transform: uppercase;
    }
  `],
})
export class SkinCardComponent {
  @Input() skin!: Skin;
  @Output() onSelect = new EventEmitter<Skin>();

  imgFailed = false;

  rarityColor(): string {
    const key = (this.skin?.rarity || '').toLowerCase().replace(/\s+/g, '');
    return RARITY_COLORS[key] || '#888';
  }

  rarityBg(): string {
    const c = this.rarityColor();
    return c + '33';
  }

  onImgError() {
    this.imgFailed = true;
  }

  select() {
    if (this.skin) this.onSelect.emit(this.skin);
  }
}
