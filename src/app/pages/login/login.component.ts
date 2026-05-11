import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface LoginResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
  user?: {
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
  };
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
    public translationService: TranslationService
  ) {}

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  login(): void {
    if (!this.email.trim() || !this.password.trim()) {
      this.error = 'Completa email y contraseña';
      return;
    }

    this.cargando = true;
    this.error = '';

    this.http.post<LoginResponse>(this.apiUrl, {
      email: this.email,
      password: this.password
    }).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success || !res.user) {
          this.error = res.error || 'No fue posible iniciar sesión';
          return;
        }

        localStorage.setItem('user', JSON.stringify(res.user));

        this.router.navigate(['/perfil', res.user.id]);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error || 'Error al iniciar sesión';
        console.error(err);
      }
    });
  }
}