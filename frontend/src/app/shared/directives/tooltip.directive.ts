import { Directive, ElementRef, HostListener, Input, OnDestroy, Renderer2 } from '@angular/core';

@Directive({ selector: '[appTooltip]', standalone: true })
export class TooltipDirective implements OnDestroy {
  @Input() appTooltip = '';
  private tooltip: HTMLElement | null = null;

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mouseenter') onEnter() {
    if (!this.appTooltip) return;
    this.tooltip = this.renderer.createElement('div');
    this.renderer.setStyle(this.tooltip, 'position', 'fixed');
    this.renderer.setStyle(this.tooltip, 'background', 'rgba(0,0,0,0.85)');
    this.renderer.setStyle(this.tooltip, 'color', '#fff');
    this.renderer.setStyle(this.tooltip, 'padding', '4px 10px');
    this.renderer.setStyle(this.tooltip, 'borderRadius', '6px');
    this.renderer.setStyle(this.tooltip, 'fontSize', '12px');
    this.renderer.setStyle(this.tooltip, 'zIndex', '1000');
    this.renderer.setStyle(this.tooltip, 'pointerEvents', 'none');
    this.renderer.setStyle(this.tooltip, 'whiteSpace', 'nowrap');
    this.renderer.setStyle(this.tooltip, 'animation', 'fadeIn 0.15s ease');
    this.renderer.setProperty(this.tooltip, 'textContent', this.appTooltip);

    const rect = this.el.nativeElement.getBoundingClientRect();
    const top = rect.top - 32;
    const left = rect.left + rect.width / 2;
    this.renderer.setStyle(this.tooltip, 'top', `${top}px`);
    this.renderer.setStyle(this.tooltip, 'left', `${left}px`);
    this.renderer.setStyle(this.tooltip, 'transform', 'translateX(-50%)');

    this.renderer.appendChild(document.body, this.tooltip);
  }

  @HostListener('mouseleave') onLeave() {
    if (this.tooltip) {
      this.renderer.removeChild(document.body, this.tooltip);
      this.tooltip = null;
    }
  }

  ngOnDestroy() { this.onLeave(); }
}
