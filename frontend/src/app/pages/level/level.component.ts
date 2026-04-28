import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Progression {
  currentLevel: number;
  currentXp: number;
  xpNeeded: number;
  progress: number;
  totalLost: number;
  levelHistory: { date: string; coinsLost: number; xpGained: number }[];
  nextRewards: { level: number; boxAvgValue: number; description: string }[];
  tierInfo: { name: string; color: string; minLevel: number; maxLevel: number; perksDescription: string };
}

const TIERS = [
  { name: 'Novato', color: '#6b7280', minLevel: 1, maxLevel: 5 },
  { name: 'Competidor', color: '#3b82f6', minLevel: 6, maxLevel: 15 },
  { name: 'Veterano', color: '#8b5cf6', minLevel: 16, maxLevel: 30 },
  { name: 'Elite', color: '#ff6b00', minLevel: 31, maxLevel: 50 },
  { name: 'Leyenda', color: '#ffd700', minLevel: 51, maxLevel: 9999 },
];

@Component({
  selector: 'app-level',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page" *ngIf="data; else loading">

      <!-- Hero -->
      <div class="hero">
        <div class="level-circle">
          <svg class="ring-svg" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none" stroke="var(--bg-elevated)" stroke-width="12"/>
            <circle cx="100" cy="100" r="88" fill="none"
              [attr.stroke]="data.tierInfo.color"
              stroke-width="12"
              stroke-linecap="round"
              stroke-dasharray="553"
              [attr.stroke-dashoffset]="553 - (553 * data.progress / 100)"
              transform="rotate(-90 100 100)"
              style="transition: stroke-dashoffset 1s ease"/>
          </svg>
          <div class="circle-inner">
            <span class="level-label">LVL</span>
            <span class="level-number">{{ data.currentLevel }}</span>
          </div>
        </div>

        <div class="hero-info">
          <h2 class="tier-name" [style.color]="data.tierInfo.color">{{ data.tierInfo.name }}</h2>
          <p class="xp-text">{{ data.currentXp }} / {{ data.xpNeeded }} XP para nivel {{ data.currentLevel + 1 }}</p>
          <div class="progress-bar">
            <div class="progress-fill" [style.width.%]="data.progress" [style.background]="data.tierInfo.color"></div>
          </div>
          <p class="total-lost">Total perdido: {{ data.totalLost | number:'1.0-0' }} coins</p>
        </div>
      </div>

      <!-- Next rewards -->
      <section class="section">
        <h3 class="section-title">Próximas recompensas</h3>
        <div class="timeline">
          <div *ngFor="let r of data.nextRewards; let i = index" class="timeline-node"
               [class.milestone]="r.level % 5 === 0">
            <div class="node-dot" [class.first]="i === 0">
              <span *ngIf="r.level % 5 === 0">⭐</span>
              <span *ngIf="r.level % 5 !== 0">{{ r.level }}</span>
            </div>
            <div class="node-info">
              <span class="node-level">Nivel {{ r.level }}</span>
              <span class="node-desc">{{ r.description }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- XP History -->
      <section class="section">
        <h3 class="section-title">Historial de XP</h3>
        <div class="history-list">
          <div *ngFor="let h of data.levelHistory.slice(0,15)" class="history-row">
            <div class="history-info">
              <span class="history-date">{{ h.date | date:'dd/MM HH:mm' }}</span>
              <span class="history-desc">Perdiste {{ h.coinsLost | number:'1.0-0' }} coins</span>
            </div>
            <span class="xp-gain">+{{ h.xpGained }} XP</span>
          </div>
          <div *ngIf="data.levelHistory.length === 0" class="empty-state">
            <p>Aún no has ganado XP. ¡Empieza a jugar!</p>
          </div>
        </div>
      </section>

      <!-- Tiers -->
      <section class="section">
        <h3 class="section-title">Rangos</h3>
        <div class="tiers-grid">
          <div *ngFor="let t of tiers" class="tier-card"
               [class.current]="data.tierInfo.name === t.name"
               [style.border-color]="data.tierInfo.name === t.name ? t.color : 'var(--border-subtle)'">
            <span class="tier-badge" [style.color]="t.color">{{ t.name }}</span>
            <span class="tier-range">Nivel {{ t.minLevel }}{{ t.maxLevel < 9999 ? ' - ' + t.maxLevel : '+' }}</span>
          </div>
        </div>
      </section>
    </div>

    <ng-template #loading>
      <div class="page"><div class="skeleton" style="height:200px; border-radius:12px"></div></div>
    </ng-template>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 1.5rem; }

    .hero {
      display: flex;
      align-items: center;
      gap: 2rem;
      margin-bottom: 2.5rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      padding: 2rem;
    }

    .level-circle {
      position: relative;
      width: 200px;
      height: 200px;
      flex-shrink: 0;
    }
    .ring-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
    .circle-inner {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .level-label { font-size: 14px; color: var(--text-muted); font-weight: 600; }
    .level-number {
      font-family: 'Rajdhani', sans-serif;
      font-size: 64px;
      font-weight: 700;
      line-height: 1;
      color: var(--text-primary);
    }

    .hero-info { flex: 1; }
    .tier-name {
      font-family: 'Rajdhani', sans-serif;
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 0.5rem;
    }
    .xp-text { font-size: 14px; color: var(--text-secondary); margin: 0 0 0.75rem; }
    .progress-bar {
      height: 10px;
      background: var(--bg-elevated);
      border-radius: 5px;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }
    .progress-fill { height: 100%; border-radius: 5px; transition: width 1s ease; }
    .total-lost { font-size: 12px; color: var(--text-muted); margin: 0; }

    .section { margin-bottom: 2rem; }
    .section-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      text-transform: uppercase;
      margin: 0 0 1rem;
    }

    .timeline { display: flex; gap: 1rem; }
    .timeline-node {
      flex: 1;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.75rem;
      text-align: center;
    }
    .timeline-node.milestone { border-color: var(--gold); }
    .node-dot {
      width: 36px; height: 36px;
      background: var(--bg-elevated);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      margin: 0 auto 0.5rem;
      color: var(--text-muted);
    }
    .node-dot.first { background: var(--accent-muted); color: var(--accent); }
    .node-level { display: block; font-size: 12px; font-weight: 700; color: var(--text-primary); }
    .node-desc { display: block; font-size: 10px; color: var(--text-muted); margin-top: 4px; }

    .history-list { display: flex; flex-direction: column; gap: 6px; }
    .history-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 0.5rem 0.875rem;
    }
    .history-info { display: flex; flex-direction: column; }
    .history-date { font-size: 11px; color: var(--text-muted); }
    .history-desc { font-size: 13px; color: var(--text-secondary); }
    .xp-gain { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; color: var(--green); }

    .tiers-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem; }
    .tier-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.875rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .tier-card.current { background: var(--bg-elevated); }
    .tier-badge { font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; }
    .tier-range { font-size: 11px; color: var(--text-muted); }
  `],
})
export class LevelComponent implements OnInit {
  data: Progression | null = null;
  tiers = TIERS;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<Progression>(`${environment.apiUrl}/users/progression`).subscribe({
      next: (d) => (this.data = d),
      error: () => {},
    });
  }
}
