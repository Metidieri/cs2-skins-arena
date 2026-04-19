import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>CS2 Skins Arena</h1>
        <h2>Crear Cuenta</h2>
        <form (ngSubmit)="onSubmit()">
          <input type="text" [(ngModel)]="username" name="username" placeholder="Username" required />
          <input type="email" [(ngModel)]="email" name="email" placeholder="Email" required />
          <input type="password" [(ngModel)]="password" name="password" placeholder="Password" required />
          <p class="error" *ngIf="error">{{ error }}</p>
          <button type="submit" [disabled]="loading">
            {{ loading ? 'Creando...' : 'Crear Cuenta' }}
          </button>
        </form>
        <p class="link">Ya tienes cuenta? <a routerLink="/login">Inicia Sesion</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex; justify-content: center; align-items: center;
      min-height: 100vh; background: #0a0a0f;
    }
    .auth-card {
      background: #16161a; border: 1px solid #2a2a35; border-radius: 12px;
      padding: 2.5rem; width: 100%; max-width: 400px;
    }
    h1 { color: #ff6b00; text-align: center; font-size: 1.5rem; margin-bottom: 0.5rem; }
    h2 { color: #e0e0e0; text-align: center; font-size: 1.1rem; margin-bottom: 1.5rem; font-weight: 400; }
    input {
      width: 100%; padding: 0.75rem; margin-bottom: 1rem; background: #0a0a0f;
      border: 1px solid #2a2a35; border-radius: 8px; color: #e0e0e0;
      font-size: 0.95rem; box-sizing: border-box;
    }
    input:focus { outline: none; border-color: #ff6b00; }
    button {
      width: 100%; padding: 0.75rem; background: #ff6b00; color: #fff;
      border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;
      font-weight: 600; transition: background 0.2s;
    }
    button:hover { background: #e55d00; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    .error { color: #ff4444; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .link { text-align: center; color: #888; margin-top: 1rem; }
    .link a { color: #ff6b00; text-decoration: none; }
  `],
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  error = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  onSubmit() {
    this.loading = true;
    this.error = '';
    this.auth.register({ email: this.email, username: this.username, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = err.error?.error || 'Error al registrar';
        this.loading = false;
      },
    });
  }
}
