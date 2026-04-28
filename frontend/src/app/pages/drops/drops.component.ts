import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { environment } from '../../../environments/environment';

interface Drop {
  type: string;
  username: string;
  skin?: { name: string; imageUrl: string; price: number; rarity: string; weapon: string } | null;
  amount?: number;
  createdAt: string;
  _new?: boolean;
}

@Component({
  selector: 'app-drops',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">
            <span class="live-dot"></span>
            DROPS EN VIVO
          </h1>
          <span class="online-tag" *ngIf="onlineCount > 0">
            {{ onlineCount }} jugadores online ahora
          </span>
        </div>
      </div>

      <div class="drops-list">
        <div *ngFor="let drop of drops" class="drop-row"
             [class.new]="drop._new"
             [class.covert]="drop.skin?.rarity?.toLowerCase()?.includes('covert')"
             [class.contraband]="drop.skin?.rarity?.toLowerCase()?.includes('contraband')">
          <span class="drop-icon">{{ typeIcon(drop.type) }}</span>
          <img *ngIf="drop.skin?.imageUrl" [src]="drop.skin!.imageUrl" class="skin-img"
               [style.border-color]="rarityColor(drop.skin?.rarity)"/>
          <div class="drop-info">
            <span class="drop-text">
              <strong>{{ drop.username }}</strong>
              {{ typeLabel(drop.type) }}
              <span *ngIf="drop.skin">{{ drop.skin.name }}</span>
            </span>
          </div>
          <span class="drop-price" *ngIf="drop.skin || drop.amount">
            +{{ (drop.skin?.price || drop.amount || 0) | number:'1.0-0' }} coins
          </span>
          <span class="drop-time">{{ timeAgo(drop.createdAt) }}</span>
        </div>

        <div *ngIf="drops.length === 0" class="empty-state">
          <p>Aún no hay drops. ¡Juega para ser el primero!</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 800px; margin: 0 auto; padding: 1.5rem; }

    .page-header { margin-bottom: 1.5rem; }
    .header-left { display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap; }
    .page-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 1.8rem;
      font-weight: 700;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .online-tag { font-size: 13px; color: var(--green); }

    .drops-list { display: flex; flex-direction: column; gap: 6px; }

    .drop-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-left: 3px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 0.625rem 0.875rem;
      height: 60px;
      transition: var(--transition);
    }
    .drop-row.new { animation: slideDown 0.3s ease; }
    .drop-row.covert { border-left-color: #eb4b4b; }
    .drop-row.contraband { border-left-color: #e4ae39; box-shadow: 0 0 12px rgba(228,174,57,0.15); }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .drop-icon { font-size: 20px; flex-shrink: 0; }
    .skin-img {
      width: 40px; height: 40px;
      object-fit: contain;
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      background: var(--bg-elevated);
      flex-shrink: 0;
    }
    .drop-info { flex: 1; min-width: 0; }
    .drop-text { font-size: 13px; color: var(--text-secondary); }
    .drop-text strong { color: var(--text-primary); }

    .drop-price {
      font-family: 'Rajdhani', sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: var(--gold);
      flex-shrink: 0;
    }
    .drop-time { font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
  `],
})
export class DropsComponent implements OnInit, OnDestroy {
  drops: Drop[] = [];
  onlineCount = 0;
  private subs: Subscription[] = [];

  constructor(private http: HttpClient, private socket: SocketService) {}

  ngOnInit() {
    this.http.get<Drop[]>(`${environment.apiUrl}/drops/recent`).subscribe({
      next: (data) => (this.drops = data.slice(0, 50)),
      error: () => {},
    });

    this.http.get<{ count: number }>(`${environment.apiUrl}/stats/online`).subscribe({
      next: (r) => (this.onlineCount = r.count),
      error: () => {},
    });

    this.subs.push(
      this.socket.onUsersOnlineCount().subscribe((n) => (this.onlineCount = n)),
      this.socket.onCaseOpened().subscribe((d) => this.prependDrop({ type: 'case_opening', username: d.username, skin: d.skin, createdAt: new Date().toISOString(), _new: true })),
      this.socket.onBattleResolved().subscribe((ev) => this.prependDrop({ type: 'battle', username: (ev as any).winnerUsername || '', createdAt: new Date().toISOString(), _new: true })),
      this.socket.onJackpotResolved().subscribe((ev) => this.prependDrop({ type: 'jackpot', username: (ev as any).winnerUsername || '', amount: (ev as any).totalValue, createdAt: new Date().toISOString(), _new: true })),
    );
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }

  private prependDrop(drop: Drop) {
    this.drops = [drop, ...this.drops].slice(0, 50);
    setTimeout(() => { drop._new = false; }, 400);
  }

  typeIcon(type: string): string {
    if (type === 'case_opening') return '🎁';
    if (type === 'battle') return '⚔️';
    if (type === 'jackpot') return '🏆';
    return '🎮';
  }

  typeLabel(type: string): string {
    if (type === 'case_opening') return ' abrió ';
    if (type === 'battle') return ' ganó una batalla';
    if (type === 'jackpot') return ' ganó el jackpot';
    return ' consiguió ';
  }

  rarityColor(rarity?: string): string {
    if (!rarity) return 'var(--border-default)';
    const r = rarity.toLowerCase();
    if (r.includes('contraband')) return '#e4ae39';
    if (r.includes('covert')) return '#eb4b4b';
    if (r.includes('classified')) return '#d32ce6';
    if (r.includes('restricted')) return '#8847ff';
    if (r.includes('mil')) return '#4b69ff';
    if (r.includes('industrial')) return '#5e98d9';
    return '#b0c3d9';
  }

  timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'ahora';
    if (diff < 60) return `${diff}m`;
    return `${Math.floor(diff / 60)}h`;
  }
}
