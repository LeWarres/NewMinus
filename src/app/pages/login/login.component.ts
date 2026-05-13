import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

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
export class LoginComponent {
  apiUrl = 'https://minuscreators.com/api/login.php';

  email = '';
  password = '';

  cargando = false;
  error = '';
  mostrarPassword = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  login(): void {
    const email = this.email.trim();
    const password = this.password.trim();

    if (!email || !password) {
      this.error = this.translationService.getTranslation('Completa email y contraseña');
      return;
    }

    this.cargando = true;
    this.error = '';

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
          this.error = res.error || this.translationService.getTranslation('No fue posible iniciar sesión');
          return;
        }

        this.authService.saveSession(res.user, res.csrfToken);

        this.router.navigate(['/perfil', res.user.id]);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error || this.translationService.getTranslation('Error al iniciar sesión');
        console.error(err);
      }
    });
  }
}