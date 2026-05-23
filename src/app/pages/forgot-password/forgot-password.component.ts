import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { TurnstileWidgetComponent } from '../../components/turnstile-widget/turnstile-widget.component';
import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    TurnstileWidgetComponent
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent implements OnInit {
  @ViewChild(TurnstileWidgetComponent) turnstileWidget?: TurnstileWidgetComponent;

  email = '';
  turnstileToken = '';

  cargando = false;
  error = '';
  mensaje = '';

  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
  }

  resetTurnstile(): void {
    this.turnstileToken = '';
    this.turnstileWidget?.reset();
  }

  enviar(): void {
    this.error = '';
    this.mensaje = '';

    const email = this.email.trim().toLowerCase();

    if (!email) {
      this.error = this.translationService.getTranslation('common.validation.email_required');
      return;
    }

    if (!this.turnstileToken) {
      this.error = this.translationService.getTranslation('common.validation.turnstile_required');
      return;
    }

    this.cargando = true;

    this.authService.fetchCsrfToken().subscribe({
      next: (csrfRes) => {
        if (!csrfRes.success || !csrfRes.csrfToken) {
          this.cargando = false;
          this.error = this.translationService.getTranslation('common.error.prepare_action_failed');
          this.resetTurnstile();
          return;
        }

        this.authService.saveCsrfToken(csrfRes.csrfToken);

        this.authService.requestPasswordReset(email, this.turnstileToken).subscribe({
          next: (res) => {
            this.cargando = false;

            if (!res.success) {
              this.error = res.error || this.translationService.getTranslation('forgotPassword.error.request_failed');
              this.resetTurnstile();
              return;
            }

            this.mensaje = res.mensaje || this.translationService.getTranslation('forgotPassword.success.request_sent');
            this.resetTurnstile();
          },
          error: (err) => {
            this.cargando = false;
            this.error = err.error?.error || this.translationService.getTranslation('forgotPassword.error.request_failed');
            this.resetTurnstile();
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.cargando = false;
        this.error = this.translationService.getTranslation('common.error.prepare_action_failed');
        this.resetTurnstile();
        console.error(err);
      }
    });
  }
}