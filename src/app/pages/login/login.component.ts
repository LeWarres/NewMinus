import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

interface LoginUser {
  id: number;
  username: string;
  email: string;
  role: string;
  nacionalidad?: string;
  imgPerfil?: string;
  imgBanner?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

interface LoginResponse {
  success: boolean;
  authenticated?: boolean;
  mensaje?: string;
  error?: string;
  csrfToken?: string;
  user?: LoginUser;
  requiresVerification?: boolean;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  apiUrl = 'https://minuscreators.com/api/login.php';

  email = '';
  password = '';

  cargando = false;
  error = '';
  mensaje = '';

  mostrarPassword = false;
  mostrarReenviarVerificacion = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const registered = params.get('registered');
      const verified = params.get('verified');
      const reason = params.get('reason');

      if (registered === '1') {
        this.mensaje = this.translationService.getTranslation(
          'login.notice.account_created'
        );
      }

      if (verified === '1') {
        this.mensaje = this.translationService.getTranslation(
          'login.notice.email_verified'
        );
      }

      if (verified === '0') {
        if (reason === 'invalid') {
          this.error = this.translationService.getTranslation(
            'login.error.verification_link_invalid'
          );
          return;
        }

        this.error = this.translationService.getTranslation(
          'login.error.verification_failed'
        );
      }
    });
  }

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  login(): void {
    const email = this.email.trim().toLowerCase();
    const password = this.password;

    if (!email || !password) {
      this.error = this.translationService.getTranslation('login.error.email_password_required');
      this.mensaje = '';
      return;
    }

    this.cargando = true;
    this.error = '';
    this.mensaje = '';
    this.mostrarReenviarVerificacion = false;

    this.http.post<LoginResponse>(
      this.apiUrl,
      {
        email,
        password
      },
      {
        withCredentials: true
      }
    ).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success || !res.authenticated || !res.user) {
          this.error = res.error || this.translationService.getTranslation('login.error.login_failed');
          return;
        }

        this.authService.saveSession(res.user, res.csrfToken);

        this.router.navigate(['/perfil', res.user.id]);
      },
      error: (err) => {
        this.cargando = false;

        const serverError = err.error?.error || '';

        if (err.status === 403 && err.error?.requiresVerification) {
          this.error = serverError || this.translationService.getTranslation(
            'login.error.email_verification_required'
          );
          this.mostrarReenviarVerificacion = true;
          return;
        }

        this.error = serverError || this.translationService.getTranslation('login.error.login_error');
        console.error(err);
      }
    });
  }

  goToForgotPassword(): void {
    this.router.navigate(['/forgot-password'], {
      queryParams: {
        email: this.email.trim().toLowerCase() || null
      }
    });
  }

  goToResendVerification(): void {
    this.router.navigate(['/reenviar-verificacion'], {
      queryParams: {
        email: this.email.trim().toLowerCase() || null
      }
    });
  }
}