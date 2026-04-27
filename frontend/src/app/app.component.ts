import { Component, OnDestroy, OnInit, effect } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';
import { SocketService } from './services/socket.service';
import { ToastService } from './shared/services/toast.service';
import { UsersService } from './services/users.service';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoadingBarComponent } from './shared/components/loading-bar/loading-bar.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoadingBarComponent, SidebarComponent],
  template: `
    <app-loading-bar />
    <div class="app-layout">
      <app-sidebar />
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
    <app-toast />
  `,
})
export class AppComponent implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  private currentSocketUserId: number | null = null;

  constructor(
    private auth: AuthService,
    private socket: SocketService,
    private toast: ToastService,
    private users: UsersService,
  ) {
    // Identifica el socket cada vez que cambia el usuario logueado.
    effect(() => {
      const u = this.auth.user();
      if (u && u.id !== this.currentSocketUserId) {
        if (this.currentSocketUserId != null) this.socket.unidentify(this.currentSocketUserId);
        this.currentSocketUserId = u.id;
        this.socket.identify(u.id);
      } else if (!u && this.currentSocketUserId != null) {
        this.socket.unidentify(this.currentSocketUserId);
        this.currentSocketUserId = null;
      }
    });
  }

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.users.getProfile().subscribe((p) => this.auth.applyProfileSnapshot(p));
    }

    this.subs.push(
      this.socket.onLeveledUp().subscribe((ev) => {
        this.toast.success(`¡Subiste al nivel ${ev.level}! 🎉`, 6000);
        this.users.getProfile().subscribe((p) => this.auth.applyProfileSnapshot(p));
      }),
    );
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
  }
}
