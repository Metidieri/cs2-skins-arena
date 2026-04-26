import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack" aria-live="polite" aria-atomic="true">
      <div
        *ngFor="let t of toasts()"
        class="toast"
        [class.success]="t.type === 'success'"
        [class.error]="t.type === 'error'"
        [class.info]="t.type === 'info'"
        [class.warn]="t.type === 'warn'"
        role="status">
        <span class="icon">{{ icon(t.type) }}</span>
        <span class="msg">{{ t.message }}</span>
        <button class="dismiss" (click)="svc.dismiss(t.id)" aria-label="Cerrar">×</button>
      </div>
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed; bottom: 1.5rem; right: 1.5rem;
      display: flex; flex-direction: column; gap: 0.6rem;
      z-index: 9999; pointer-events: none;
      max-width: min(360px, 92vw);
    }
    .toast {
      pointer-events: auto;
      display: grid; grid-template-columns: auto 1fr auto;
      gap: 0.7rem; align-items: center;
      padding: 0.85rem 1rem;
      border-radius: 10px; border: 1px solid;
      background: #16161a; color: #e0e0e0;
      box-shadow: 0 12px 28px rgba(0,0,0,0.55);
      animation: toast-in 0.22s cubic-bezier(0.18, 0.85, 0.18, 1);
      font-size: 0.92rem;
    }
    .toast.success { border-color: #4caf50; background: #14241c; color: #b8f5c8; }
    .toast.error   { border-color: #ff4444; background: #2b1414; color: #ffb6b6; }
    .toast.info    { border-color: #ff6b00; background: #1a1410; color: #ffd2a6; }
    .toast.warn    { border-color: #ffd700; background: #241f10; color: #ffe999; }

    .icon { font-weight: 800; font-size: 1rem; line-height: 1; }
    .msg { line-height: 1.3; word-break: break-word; }
    .dismiss {
      background: transparent; border: none; color: inherit;
      font-size: 1.3rem; line-height: 1; cursor: pointer;
      opacity: 0.55; padding: 0 0.25rem;
    }
    .dismiss:hover { opacity: 1; }

    @keyframes toast-in {
      from { opacity: 0; transform: translateX(20px) scale(0.96); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }
  `],
})
export class ToastComponent {
  toasts;

  constructor(public svc: ToastService) {
    this.toasts = svc.toasts;
  }

  icon(type: string): string {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warn': return '!';
      default: return 'i';
    }
  }
}
