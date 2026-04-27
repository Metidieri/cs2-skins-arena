import {
  AfterViewChecked,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ChatService } from '../../../services/chat.service';
import { ChatMessage } from '../../../models/chat.model';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="chat-panel">
      <div class="chat-header">
        <span class="chat-title">CHAT</span>
        <span class="chat-online">
          <span class="live-dot"></span> en vivo
        </span>
      </div>

      <div class="chat-messages" #messagesEl (scroll)="onScroll()">
        <div
          *ngFor="let msg of messages"
          class="chat-msg"
          [class.own]="msg.user.id === currentUserId"
        >
          <div
            class="msg-avatar"
            [style.background]="avatarColor(msg.user.level)"
            [title]="msg.user.username"
          >
            {{ msg.user.username.charAt(0).toUpperCase() }}
          </div>
          <div class="msg-body">
            <div class="msg-meta">
              <span class="msg-user">{{ msg.user.username }}</span>
              <span class="msg-lvl">{{ msg.user.level }}</span>
              <span class="msg-time">{{ timeAgo(msg.createdAt) }}</span>
            </div>
            <div class="msg-content">{{ msg.content }}</div>
          </div>
        </div>
        <div *ngIf="messages.length === 0" class="chat-empty">
          Sin mensajes aún. ¡Sé el primero!
        </div>
      </div>

      <div class="new-badge" *ngIf="newCount > 0" (click)="scrollToBottom(true)">
        {{ newCount }} mensajes nuevos ↓
      </div>

      <div class="chat-input-row">
        <textarea
          #inputEl
          class="chat-input"
          [(ngModel)]="draft"
          [placeholder]="auth.isLoggedIn() ? 'Escribe un mensaje...' : 'Inicia sesión para chatear'"
          [disabled]="!auth.isLoggedIn()"
          maxlength="200"
          rows="1"
          (keydown)="onKeydown($event)"
        ></textarea>
        <button
          class="chat-send"
          [disabled]="!auth.isLoggedIn() || !draft.trim()"
          (click)="send()"
          title="Enviar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round" width="14" height="14">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .chat-panel {
      display: flex;
      flex-direction: column;
      height: 280px;
      border-top: 1px solid var(--border-subtle);
      border-bottom: 1px solid var(--border-subtle);
      position: relative;
      background: var(--bg-base);
    }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--border-subtle);
    }
    .chat-title {
      font-family: 'Rajdhani', sans-serif;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    .chat-online {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 10px;
      color: var(--text-muted);
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 6px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      scrollbar-width: thin;
      scrollbar-color: var(--border-default) transparent;
    }
    .chat-messages::-webkit-scrollbar { width: 3px; }
    .chat-messages::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }

    .chat-msg {
      display: flex;
      gap: 6px;
      align-items: flex-start;
      padding: 4px 6px;
      border-radius: var(--radius-sm);
      transition: background 0.15s;
    }
    .chat-msg.own { background: var(--accent-muted); }
    .chat-msg:not(.own):hover { background: var(--bg-hover); }

    .msg-avatar {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .msg-body { flex: 1; min-width: 0; }
    .msg-meta {
      display: flex;
      align-items: baseline;
      gap: 4px;
      margin-bottom: 1px;
    }
    .msg-user {
      font-size: 11px;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 80px;
    }
    .msg-lvl {
      font-size: 9px;
      font-weight: 700;
      background: var(--bg-elevated);
      color: var(--text-muted);
      padding: 0 3px;
      border-radius: 3px;
      flex-shrink: 0;
    }
    .msg-time {
      font-size: 10px;
      color: var(--text-muted);
      flex-shrink: 0;
      margin-left: auto;
    }
    .msg-content {
      font-size: 12px;
      color: var(--text-secondary);
      word-break: break-word;
      line-height: 1.35;
    }
    .chat-msg.own .msg-content { color: var(--text-primary); }

    .chat-empty {
      font-size: 11px;
      color: var(--text-muted);
      text-align: center;
      padding: 1rem 0;
    }

    .new-badge {
      position: absolute;
      bottom: 42px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--accent);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;
      cursor: pointer;
      white-space: nowrap;
      z-index: 2;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    }

    .chat-input-row {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 5px 8px;
      border-top: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }
    .chat-input {
      flex: 1;
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 12px;
      padding: 5px 8px;
      resize: none;
      line-height: 1.3;
      max-height: 60px;
      overflow-y: auto;
      font-family: 'Inter', sans-serif;
      transition: border-color 0.15s;
    }
    .chat-input:focus { outline: none; border-color: var(--accent); }
    .chat-input:disabled { opacity: 0.4; cursor: not-allowed; }
    .chat-input::placeholder { color: var(--text-muted); }

    .chat-send {
      width: 28px;
      height: 28px;
      background: var(--accent);
      border: none;
      border-radius: var(--radius-sm);
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: var(--transition);
    }
    .chat-send:hover:not(:disabled) { background: var(--accent-hover); }
    .chat-send:disabled { opacity: 0.35; cursor: not-allowed; }
  `],
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messagesEl') messagesEl!: ElementRef<HTMLDivElement>;

  messages: ChatMessage[] = [];
  draft = '';
  newCount = 0;
  private atBottom = true;
  private sub: Subscription | null = null;
  private shouldScrollOnCheck = false;

  get currentUserId(): number | null {
    return this.auth.user()?.id ?? null;
  }

  constructor(public auth: AuthService, private chat: ChatService) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.chat.joinChat();
      this.chat.getHistory().subscribe((msgs) => {
        this.messages = msgs;
        this.shouldScrollOnCheck = true;
      });
    }

    this.sub = this.chat.onMessage().subscribe((msg) => {
      this.messages.push(msg);
      if (this.atBottom) {
        this.shouldScrollOnCheck = true;
        this.newCount = 0;
      } else {
        this.newCount++;
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollOnCheck) {
      this.scrollToBottom(false);
      this.shouldScrollOnCheck = false;
    }
  }

  onScroll() {
    const el = this.messagesEl?.nativeElement;
    if (!el) return;
    const threshold = 40;
    this.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    if (this.atBottom) this.newCount = 0;
  }

  scrollToBottom(force: boolean) {
    const el = this.messagesEl?.nativeElement;
    if (!el) return;
    if (force || this.atBottom) {
      el.scrollTop = el.scrollHeight;
      this.atBottom = true;
      this.newCount = 0;
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send() {
    const content = this.draft.trim();
    if (!content || !this.auth.isLoggedIn()) return;
    const token = localStorage.getItem('token') ?? '';
    this.chat.sendMessage(content, token);
    this.draft = '';
  }

  avatarColor(level: number): string {
    if (level >= 31) return '#ff6b00';
    if (level >= 16) return '#8b5cf6';
    if (level >= 6)  return '#3b82f6';
    return '#6b7280';
  }

  timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (diff < 1) return 'ahora';
    if (diff < 60) return `${diff}m`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  }
}
