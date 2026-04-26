import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warn';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  createdAt: number;
}

const DEFAULT_TIMEOUT = 4000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();

  success(message: string, timeout = DEFAULT_TIMEOUT) {
    return this.push('success', message, timeout);
  }
  error(message: string, timeout = DEFAULT_TIMEOUT) {
    return this.push('error', message, timeout);
  }
  info(message: string, timeout = DEFAULT_TIMEOUT) {
    return this.push('info', message, timeout);
  }
  warn(message: string, timeout = DEFAULT_TIMEOUT) {
    return this.push('warn', message, timeout);
  }

  dismiss(id: number) {
    this._toasts.update((arr) => arr.filter((t) => t.id !== id));
  }

  clear() {
    this._toasts.set([]);
  }

  private push(type: ToastType, message: string, timeout: number) {
    const id = this.nextId++;
    const toast: Toast = { id, type, message, createdAt: Date.now() };
    this._toasts.update((arr) => [...arr, toast]);
    if (timeout > 0) {
      setTimeout(() => this.dismiss(id), timeout);
    }
    return id;
  }
}
