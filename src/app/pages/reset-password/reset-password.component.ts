import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';

  mostrarPassword = false;
  mostrarConfirmPassword = false;

  cargando = false;
  error = '';
  mensaje = '';
  completado = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.error = this.translationService.getTranslation('resetPassword.error.invalid_or_expired_link');
    }
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleConfirmPassword(): void {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }

  cambiarPassword(): void {
    this.error = '';
    this.mensaje = '';

    if (!this.token) {
      this.error = this.translationService.getTranslation('resetPassword.error.invalid_or_expired_link');
      return;
    }

    if (this.password.length < 8) {
      this.error = this.translationService.getTranslation('common.validation.password_min_length');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = this.translationService.getTranslation('common.validation.passwords_mismatch');
      return;
    }

    this.cargando = true;

    this.authService.fetchCsrfToken().subscribe({
      next: (csrfRes) => {
        if (!csrfRes.success || !csrfRes.csrfToken) {
          this.cargando = false;
          this.error = this.translationService.getTranslation('common.error.prepare_action_failed');
          return;
        }

        this.authService.saveCsrfToken(csrfRes.csrfToken);

        this.authService.resetPassword(this.token, this.password).subscribe({
          next: (res) => {
            this.cargando = false;

            if (!res.success) {
              this.error = res.error || this.translationService.getTranslation('resetPassword.error.reset_failed');
              return;
            }

            this.completado = true;
            this.mensaje = res.mensaje || this.translationService.getTranslation('resetPassword.success.password_updated');
          },
          error: (err) => {
            this.cargando = false;
            this.error = err.error?.error || this.translationService.getTranslation('resetPassword.error.reset_failed');
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.cargando = false;
        this.error = this.translationService.getTranslation('common.error.prepare_action_failed');
        console.error(err);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}