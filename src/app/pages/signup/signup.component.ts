import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { TurnstileWidgetComponent } from '../../components/turnstile-widget/turnstile-widget.component';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TurnstileWidgetComponent
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  @ViewChild(TurnstileWidgetComponent) turnstileWidget?: TurnstileWidgetComponent;

  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  nacionalidad = '';

  website = '';
  turnstileToken = '';

  mostrarPassword = false;
  mostrarConfirmPassword = false;

  cargando = false;
  error = '';
  mensaje = '';
  registroCompletado = false;

  countries = [
    { name: 'México' },
    { name: 'Argentina' },
    { name: 'Colombia' },
    { name: 'Chile' },
    { name: 'Perú' },
    { name: 'España' },
    { name: 'Estados Unidos' },
    { name: 'Otro' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleConfirmPassword(): void {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/login'], {
      queryParams: {
        registered: '1'
      }
    });
  }

  resetTurnstile(): void {
    this.turnstileToken = '';
    this.turnstileWidget?.reset();
  }

  register(): void {
    this.error = '';
    this.mensaje = '';

    const username = this.username.trim();
    const email = this.email.trim().toLowerCase();
    const password = this.password;
    const confirmPassword = this.confirmPassword;
    const nacionalidad = this.nacionalidad.trim();

    if (!username || !email || !password) {
      this.error = this.translationService.getTranslation('Completa usuario, email y contraseña');
      return;
    }

    if (!/^[A-Za-z0-9_]{3,30}$/.test(username)) {
      this.error = this.translationService.getTranslation('Usuario inválido');
      return;
    }

    if (password.length < 8) {
      this.error = this.translationService.getTranslation('La contraseña debe tener mínimo 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      this.error = this.translationService.getTranslation('Las contraseñas no coinciden');
      return;
    }

    if (!this.turnstileToken) {
      this.error = this.translationService.getTranslation('Completa la verificación anti-bot');
      return;
    }

    this.cargando = true;

    this.authService.fetchCsrfToken().subscribe({
      next: (csrfRes) => {
        if (!csrfRes.success || !csrfRes.csrfToken) {
          this.cargando = false;
          this.error = this.translationService.getTranslation('No se pudo preparar el registro');
          this.resetTurnstile();
          return;
        }

        this.authService.saveCsrfToken(csrfRes.csrfToken);

        this.authService.register({
          username,
          email,
          password,
          nacionalidad,
          website: this.website,
          turnstileToken: this.turnstileToken
        }).subscribe({
          next: (res) => {
            this.cargando = false;

            if (!res.success) {
              this.error =
                res.error ||
                this.translationService.getTranslation('No fue posible hacer el registro');

              this.resetTurnstile();
              return;
            }

            this.authService.clearSession();

            this.registroCompletado = true;
            this.mensaje =
              res.mensaje ||
              this.translationService.getTranslation(
                'Cuenta creada. Revisa tu correo para verificarla antes de iniciar sesión.'
              );

            this.username = '';
            this.email = '';
            this.password = '';
            this.confirmPassword = '';
            this.nacionalidad = '';
            this.turnstileToken = '';
          },
          error: (err) => {
            this.cargando = false;
            this.error =
              err.error?.error ||
              this.translationService.getTranslation('Error al registrar usuario');

            this.resetTurnstile();
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.cargando = false;
        this.error = this.translationService.getTranslation('No se pudo preparar el registro');
        this.resetTurnstile();
        console.error(err);
      }
    });
  }
}