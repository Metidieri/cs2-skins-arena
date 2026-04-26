import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { LoadingBarComponent } from './shared/components/loading-bar/loading-bar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, LoadingBarComponent],
  template: `
    <app-loading-bar></app-loading-bar>
    <router-outlet />
    <app-toast></app-toast>
  `,
})
export class AppComponent {}
