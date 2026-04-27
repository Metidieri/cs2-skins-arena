import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Tier {
  min: number;
  max: number;
  cssVar: string;
  label: string;
}

const TIERS: Tier[] = [
  { min: 1, max: 5, cssVar: '--text-muted', label: 'Novato' },
  { min: 6, max: 15, cssVar: '--rarity-milspec', label: 'Competidor' },
  { min: 16, max: 30, cssVar: '--rarity-restricted', label: 'Veterano' },
  { min: 31, max: 50, cssVar: '--rarity-classified', label: 'Elite' },
  { min: 51, max: Infinity, cssVar: '--rarity-contraband', label: 'Leyenda' },
];

@Component({
  selector: 'app-level-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="level-badge"
         [class.sm]="size === 'sm'"
         [class.md]="size === 'md'"
         [class.lg]="size === 'lg'"
         [style.--tone]="'var(' + tier.cssVar + ')'"
         [attr.title]="tooltip">
      <div class="badge-row">
        <span class="badge-label">LVL</span>
        <span class="badge-num">{{ level }}</span>
        <span class="badge-tier" *ngIf="size !== 'sm'">{{ tier.label }}</span>
      </div>
      <div class="progress" *ngIf="size !== 'sm'">
        <div class="progress-fill" [style.width.%]="clampedProgress"></div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .level-badge {
      --tone: var(--text-muted);
      display: inline-flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 8px;
      border: 1px solid color-mix(in srgb, var(--tone) 45%, transparent);
      background: color-mix(in srgb, var(--tone) 12%, transparent);
      border-radius: var(--radius-sm);
      color: var(--tone);
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 1;
    }
    .level-badge.sm { padding: 2px 6px; }
    .level-badge.lg { padding: 6px 10px; gap: 6px; }

    .badge-row { display: inline-flex; align-items: center; gap: 4px; }
    .badge-label { font-size: 9px; letter-spacing: 0.15em; opacity: 0.8; }
    .badge-num { font-size: 14px; }
    .level-badge.sm .badge-num { font-size: 12px; }
    .level-badge.lg .badge-num { font-size: 16px; }
    .badge-tier {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-left: 4px;
      opacity: 0.85;
    }

    .progress {
      width: 100%;
      min-width: 80px;
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 999px;
      overflow: hidden;
    }
    .level-badge.lg .progress { height: 6px; }
    .progress-fill {
      height: 100%;
      background: var(--tone);
      border-radius: 999px;
      transition: width 0.4s ease;
    }
  `],
})
export class LevelBadgeComponent {
  @Input() level = 1;
  @Input() progress = 0;
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() currentXp?: number;
  @Input() xpNeeded?: number;

  get tier(): Tier {
    return TIERS.find((t) => this.level >= t.min && this.level <= t.max) || TIERS[0];
  }

  get clampedProgress(): number {
    return Math.min(100, Math.max(0, this.progress || 0));
  }

  get tooltip(): string {
    if (this.currentXp != null && this.xpNeeded != null) {
      return `${this.currentXp} / ${this.xpNeeded} XP — ${this.tier.label}`;
    }
    return `${this.tier.label} (Nivel ${this.level})`;
  }
}
