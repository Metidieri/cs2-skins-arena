import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `<div class="skeleton" [style.width]="width" [style.height]="height" [style.border-radius]="borderRadius"></div>`,
  styles: [`
    :host { display: block; }
  `],
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '20px';
  @Input() borderRadius = '6px';
}
