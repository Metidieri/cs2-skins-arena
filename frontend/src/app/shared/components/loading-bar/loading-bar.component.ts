import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-bar" [class.active]="loading.isLoading()">
      <div class="bar"></div>
    </div>
  `,
  styles: [`
    .loading-bar {
      position: fixed; top: 0; left: 0; right: 0;
      height: 3px; pointer-events: none;
      z-index: 9998; background: transparent;
      opacity: 0; transition: opacity 0.2s ease;
    }
    .loading-bar.active { opacity: 1; }
    .bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--gold));
      background-size: 250% 100%;
      animation: slide 1.4s linear infinite;
      box-shadow: 0 0 10px rgba(255,107,0,0.6);
    }
    @keyframes slide {
      0%   { background-position: 250% 0; }
      100% { background-position: -150% 0; }
    }
  `],
})
export class LoadingBarComponent {
  constructor(public loading: LoadingService) {}
}
