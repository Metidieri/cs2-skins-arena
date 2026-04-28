import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../../services/notification.service';
import { Notification } from '../../../models/notification.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notif-panel" (click)="$event.stopPropagation()">
      <div class="notif-header">
        <span class="notif-title">Notificaciones</span>
        <button class="mark-all" (click)="markAll()" *ngIf="unread > 0">Marcar leídas</button>
      </div>

      <div class="notif-list">
        <div *ngFor="let n of notifications" class="notif-row"
             [class.unread]="!n.read"
             (click)="onClickNotif(n)">
          <span class="notif-icon" [style.color]="iconColor(n.type)">{{ icon(n.type) }}</span>
          <div class="notif-body">
            <div class="notif-notif-title">{{ n.title }}</div>
            <div class="notif-message">{{ n.message }}</div>
            <div class="notif-time">{{ timeAgo(n.createdAt) }}</div>
          </div>
          <span class="unread-dot" *ngIf="!n.read"></span>
        </div>
        <div *ngIf="notifications.length === 0" class="notif-empty">Sin notificaciones</div>
      </div>
    </div>
  `,
  styles: [`
    .notif-panel {
      position: absolute;
      left: calc(var(--sidebar-w) + 8px);
      top: 0;
      width: 360px;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-lg);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      z-index: 200;
      animation: slideInLeft 0.2s ease;
      overflow: hidden;
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border-subtle);
    }
    .notif-title { font-family: 'Rajdhani', sans-serif; font-size: 14px; font-weight: 700; }
    .mark-all { background: none; border: none; color: var(--accent); font-size: 12px; cursor: pointer; }
    .mark-all:hover { text-decoration: underline; }

    .notif-list { max-height: 400px; overflow-y: auto; }

    .notif-row {
      display: flex;
      align-items: flex-start;
      gap: 0.625rem;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-subtle);
      cursor: pointer;
      position: relative;
      transition: background 0.15s;
    }
    .notif-row.unread { background: var(--bg-elevated); }
    .notif-row:hover { background: var(--bg-hover); }

    .notif-icon { font-size: 18px; flex-shrink: 0; margin-top: 2px; }
    .notif-body { flex: 1; min-width: 0; }
    .notif-notif-title { font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .notif-message { font-size: 12px; color: var(--text-secondary); margin: 2px 0; }
    .notif-time { font-size: 11px; color: var(--text-muted); }
    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); flex-shrink: 0; margin-top: 4px; }

    .notif-empty { padding: 2rem; text-align: center; font-size: 13px; color: var(--text-muted); }
  `],
})
export class NotificationsComponent implements OnChanges {
  @Input() notifications: Notification[] = [];
  @Output() updated = new EventEmitter<Notification[]>();

  get unread(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  constructor(
    private notifService: NotificationService,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnChanges() {}

  markAll() {
    this.notifService.markAllRead().subscribe(() => {
      this.updated.emit(this.notifications.map((n) => ({ ...n, read: true })));
    });
  }

  onClickNotif(n: Notification) {
    if (!n.read) {
      this.notifService.markRead(n.id).subscribe(() => {
        this.updated.emit(this.notifications.map((x) => x.id === n.id ? { ...x, read: true } : x));
      });
    }
    if (n.data) {
      const data = typeof n.data === 'string' ? JSON.parse(n.data) : n.data;
      if (data.battleId) this.router.navigate(['/coinflip', data.battleId]);
      else if (data.jackpotId) this.router.navigate(['/jackpot']);
      else if (data.listingId) this.router.navigate(['/marketplace']);
    }
  }

  icon(type: string): string {
    const map: Record<string, string> = {
      battle_won: '⚔️', battle_lost: '💀', battle_joined: '👥',
      jackpot_won: '🏆', marketplace_sold: '🛒', level_up: '⬆️', daily_box: '🎁',
    };
    return map[type] || '🔔';
  }

  iconColor(type: string): string {
    const map: Record<string, string> = {
      battle_won: 'var(--green)', battle_lost: 'var(--red)', battle_joined: '#3b82f6',
      jackpot_won: 'var(--gold)', marketplace_sold: '#3b82f6', level_up: 'var(--accent)',
    };
    return map[type] || 'var(--text-muted)';
  }

  timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'ahora';
    if (diff < 60) return `hace ${diff}m`;
    return `hace ${Math.floor(diff / 60)}h`;
  }
}
