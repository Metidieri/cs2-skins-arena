import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { SkinsService } from '../../services/skins.service';
import { Skin } from '../../models/skin.model';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SkinCardComponent } from '../../shared/components/skin-card/skin-card.component';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SkinCardComponent],
  template: `
    <app-navbar></app-navbar>
    <main class="content">
      <h2>Mi Inventario</h2>
      <p class="empty" *ngIf="skins.length === 0">No tienes skins todavia.</p>
      <div class="skins-grid">
        <app-skin-card
          *ngFor="let skin of skins"
          [skin]="skin"
          (onSelect)="select($event)">
        </app-skin-card>
      </div>
    </main>
  `,
  styles: [`
    .content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
    h2 { color: #e0e0e0; margin-bottom: 1.5rem; }
    .empty { color: #888; text-align: center; padding: 3rem; }
    .skins-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.2rem;
    }
  `],
})
export class InventoryComponent implements OnInit {
  skins: Skin[] = [];

  constructor(public auth: AuthService, private skinsService: SkinsService) {}

  ngOnInit() {
    this.skinsService.getInventory().subscribe((skins) => (this.skins = skins));
  }

  select(_skin: Skin) {
    // Acción de selección por implementar (apostar / vender desde el inventario).
  }
}
