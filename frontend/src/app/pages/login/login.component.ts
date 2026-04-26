import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>CS2 Skins Arena</h1>
        <h2>Iniciar Sesión</h2>
        <form (ngSubmit)="onSubmit()" #f="ngForm" novalidate>
          <label class="field">
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              placeholder="Email"
              required
              [attr.aria-invalid]="emailError() ? true : null" />
            <span class="field-error" *ngIf="emailError()">{{ emailError() }}</span>
          </label>

          <label class="field password-field">
            <div class="password-wrap">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                placeholder="Password"
                required
                [attr.aria-invalid]="passwordError() ? true : null" />
              <button type="button" class="eye" (click)="togglePassword()"
                      [attr.aria-label]="showPassword() ? 'Ocultar password' : 'Mostrar password'">
                {{ showPassword() ? '🙈' : '👁' }}
              </button>
            </div>
            <span class="field-error" *ngIf="passwordError()">{{ passwordError() }}</span>
          </label>

          <p class="error" *ngIf="formError()">{{ formError() }}</p>

          <button type="submit" class="submit" [disabled]="loading()">
            <span *ngIf="loading()" class="spinner"></span>
            {{ loading() ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>
        <p class="link">¿No tienes cuenta? <a routerLink="/register">Regístrate</a></p>
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
    h1 { color: #ff6b00; text-align: center; font-size: 1.5rem; margin-bottom: 0.5rem; letter-spacing: 0.1em; }
    h2 { color: #e0e0e0; text-align: center; font-size: 1.1rem; margin-bottom: 1.5rem; font-weight: 400; }

    .field { display: block; margin-bottom: 0.85rem; }
    input {
      width: 100%; padding: 0.75rem; background: #0a0a0f;
      border: 1px solid #2a2a35; border-radius: 8px; color: #e0e0e0;
      font-size: 0.95rem; box-sizing: border-box;
    }
    input:focus { outline: none; border-color: #ff6b00; }
    input[aria-invalid="true"] { border-color: #ff4444; }
    .field-error { color: #ff6b6b; font-size: 0.78rem; margin-top: 0.3rem; display: block; }

    .password-wrap { position: relative; }
    .password-wrap input { padding-right: 44px; }
    .eye {
      position: absolute; top: 50%; right: 4px; transform: translateY(-50%);
      background: transparent; border: none; cursor: pointer; padding: 0.4rem;
      color: #aaa; font-size: 1.05rem; line-height: 1;
    }
    .eye:hover { color: #ff6b00; }

    .submit {
      width: 100%; padding: 0.85rem; background: linear-gradient(135deg, #ff6b00, #ff3d00); color: #fff;
      border: none; border-radius: 8px; font-size: 1rem; cursor: pointer;
      font-weight: 700; letter-spacing: 0.04em;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 18px rgba(255,107,0,0.3);
      display: inline-flex; align-items: center; justify-content: center; gap: 0.55rem;
    }
    .submit:hover:not(:disabled) { transform: translateY(-2px); }
    .submit:disabled { opacity: 0.65; cursor: not-allowed; box-shadow: none; transform: none; }

    .spinner {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .error { color: #ff6b6b; font-size: 0.85rem; margin: 0.4rem 0; }
    .link { text-align: center; color: #888; margin-top: 1rem; }
    .link a { color: #ff6b00; text-decoration: none; }
    .link a:hover { text-decoration: underline; }
  `],
})
export class LoginComponent {
  email = '';
  password = '';
  formError = signal('');
  emailError = signal('');
  passwordError = signal('');
  loading = signal(false);
  showPassword = signal(false);

  constructor(private auth: AuthService, private router: Router, private toast: ToastService) {}

  togglePassword() {
    this.showPassword.update((v) => !v);
  }

  validate(): boolean {
    let ok = true;
    if (!this.email || !/^\S+@\S+\.\S+$/.test(this.email)) {
      this.emailError.set('Email inválido');
      ok = false;
    } else this.emailError.set('');

    if (!this.password) {
      this.passwordError.set('Password requerido');
      ok = false;
    } else this.passwordError.set('');

    return ok;
  }

  onSubmit() {
    this.formError.set('');
    if (!this.validate()) return;
    this.loading.set(true);
    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.success('Sesión iniciada');
        this.router.navigate(['/coinflip']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.error || 'Error al iniciar sesión';
        this.formError.set(msg);
        if (err?.status === 401) {
          this.passwordError.set('Credenciales inválidas');
        }
        this.toast.error(msg);
      },
    });
  }
}
