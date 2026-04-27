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
    <div class="auth-page">
      <!-- Columna izquierda: formulario -->
      <section class="form-pane">
        <div class="form-inner">
          <a routerLink="/" class="logo">
            <span>CS2</span><span class="accent">ARENA</span>
          </a>

          <header class="header">
            <h1>Bienvenido de nuevo</h1>
            <p>Inicia sesión para entrar al lobby.</p>
          </header>

          <form (ngSubmit)="onSubmit()" novalidate>
            <label class="field">
              <span class="label">Email</span>
              <input
                type="email"
                [(ngModel)]="email"
                name="email"
                placeholder="tu@email.com"
                autocomplete="email"
                [class.has-error]="emailError()"
                required />
              <span class="field-error" *ngIf="emailError()">{{ emailError() }}</span>
            </label>

            <label class="field">
              <span class="label">Password</span>
              <div class="password-wrap">
                <input
                  [type]="showPassword() ? 'text' : 'password'"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                  [class.has-error]="passwordError()"
                  required />
                <button type="button" class="eye" (click)="togglePassword()"
                        [attr.aria-label]="showPassword() ? 'Ocultar' : 'Mostrar'">
                  {{ showPassword() ? '🙈' : '👁' }}
                </button>
              </div>
              <span class="field-error" *ngIf="passwordError()">{{ passwordError() }}</span>
            </label>

            <p class="form-error" *ngIf="formError()">{{ formError() }}</p>

            <button type="submit" class="submit-btn" [disabled]="loading()">
              <span *ngIf="loading()" class="spinner"></span>
              <span>{{ loading() ? 'Entrando...' : 'Entrar' }}</span>
            </button>
          </form>

          <p class="switch">
            ¿No tienes cuenta? <a routerLink="/register">Regístrate</a>
          </p>
        </div>
      </section>

      <!-- Columna derecha: marketing -->
      <aside class="marketing-pane">
        <div class="bg-pattern"></div>
        <div class="marketing-inner">
          <div class="brand-big">
            <span>CS2</span><span class="accent">ARENA</span>
          </div>
          <p class="tagline">Apuesta tus skins. Llévate las del rival.</p>

          <div class="mk-stats">
            <div class="mk-stat">
              <span class="num">2</span><span class="lbl">Modos</span>
            </div>
            <div class="mk-stat">
              <span class="num">⚡</span><span class="lbl">Tiempo real</span>
            </div>
            <div class="mk-stat">
              <span class="num">∞</span><span class="lbl">Skins en juego</span>
            </div>
          </div>

          <blockquote>
            <p>"El que más apuesta, más probabilidad tiene de ganarlo todo."</p>
            <footer>— Reglas del jackpot</footer>
          </blockquote>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .auth-page {
      position: fixed;
      inset: 0;
      z-index: 999;
      display: grid;
      grid-template-columns: 1fr 1fr;
      background: var(--bg-base);
      overflow: auto;
    }
    @media (max-width: 880px) {
      .auth-page { grid-template-columns: 1fr; }
      .marketing-pane { display: none; }
    }

    /* Form pane */
    .form-pane {
      background: var(--bg-surface);
      padding: 3rem 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .form-inner {
      width: 100%;
      max-width: 380px;
      display: flex;
      flex-direction: column;
      gap: 1.4rem;
    }
    .logo {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 22px;
      letter-spacing: 0.05em;
      color: var(--text-primary);
      align-self: flex-start;
      text-decoration: none;
    }
    .logo .accent { color: var(--accent); margin-left: 4px; }
    .header h1 {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 28px;
      color: var(--text-primary);
      margin: 0;
    }
    .header p { color: var(--text-secondary); margin: 6px 0 0; font-size: 14px; }

    form { display: flex; flex-direction: column; gap: 1rem; }

    .field { display: flex; flex-direction: column; gap: 0.4rem; }
    .label {
      font-size: 11px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
      font-weight: 600;
    }
    input {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      padding: 0.75rem 1rem;
      color: var(--text-primary);
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      transition: var(--transition);
      width: 100%;
      box-sizing: border-box;
    }
    input::placeholder { color: var(--text-muted); }
    input:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-muted);
    }
    input.has-error { border-color: var(--red); }
    input.has-error:focus { box-shadow: 0 0 0 3px var(--red-muted); }
    .field-error { color: var(--red); font-size: 12px; }
    .form-error {
      color: var(--red);
      background: var(--red-muted);
      border: 1px solid rgba(248,113,113,0.25);
      border-radius: var(--radius-sm);
      padding: 0.6rem 0.8rem;
      font-size: 13px;
      margin: 0;
    }

    .password-wrap { position: relative; }
    .password-wrap input { padding-right: 44px; }
    .eye {
      position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
      background: transparent; border: none; cursor: pointer;
      color: var(--text-muted); font-size: 1.05rem; padding: 0.4rem;
    }
    .eye:hover { color: var(--accent); }

    .submit-btn {
      height: 44px;
      background: var(--accent);
      color: #fff;
      border: none;
      border-radius: var(--radius-sm);
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.06em;
      cursor: pointer;
      transition: var(--transition);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .submit-btn:hover:not(:disabled) {
      background: var(--accent-hover);
      box-shadow: var(--accent-glow);
    }
    .submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    .spinner {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .switch { color: var(--text-muted); font-size: 13px; text-align: center; }
    .switch a { color: var(--accent); font-weight: 600; }
    .switch a:hover { text-decoration: underline; }

    /* Marketing pane */
    .marketing-pane {
      position: relative;
      background: radial-gradient(
        ellipse at center,
        rgba(255,107,0,0.05) 0%,
        var(--bg-base) 70%
      );
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      overflow: hidden;
    }
    .bg-pattern {
      position: absolute; inset: 0;
      background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 22px 22px;
      mask-image: radial-gradient(ellipse at center, #000 30%, transparent 80%);
      pointer-events: none;
    }
    .marketing-inner {
      position: relative;
      max-width: 420px;
      display: flex; flex-direction: column; gap: 1.6rem;
    }
    .brand-big {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 56px;
      letter-spacing: 0.06em;
      color: var(--text-primary);
      line-height: 1;
    }
    .brand-big .accent { color: var(--accent); margin-left: 8px; }
    .tagline { color: var(--text-secondary); font-size: 16px; margin: 0; }

    .mk-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; }
    .mk-stat {
      background: var(--bg-elevated);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      padding: 0.85rem 0.6rem;
      text-align: center;
      display: flex; flex-direction: column; gap: 4px;
    }
    .mk-stat .num {
      font-family: 'Rajdhani', sans-serif;
      font-weight: 700;
      font-size: 22px;
      color: var(--accent);
    }
    .mk-stat .lbl {
      font-size: 10px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    blockquote {
      border-left: 3px solid var(--accent);
      padding: 0.6rem 1rem;
      color: var(--text-secondary);
      margin: 0;
    }
    blockquote p { margin: 0; font-style: italic; }
    blockquote footer {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 6px;
    }
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

  togglePassword() { this.showPassword.update((v) => !v); }

  validate(): boolean {
    let ok = true;
    if (!this.email || !/^\S+@\S+\.\S+$/.test(this.email)) {
      this.emailError.set('Email inválido'); ok = false;
    } else this.emailError.set('');
    if (!this.password) {
      this.passwordError.set('Password requerido'); ok = false;
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
        if (err?.status === 401) this.passwordError.set('Credenciales inválidas');
        this.toast.error(msg);
      },
    });
  }
}
