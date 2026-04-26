import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private active = signal(0);
  isLoading = computed(() => this.active() > 0);

  start() {
    this.active.update((n) => n + 1);
  }

  stop() {
    this.active.update((n) => Math.max(0, n - 1));
  }

  reset() {
    this.active.set(0);
  }
}
