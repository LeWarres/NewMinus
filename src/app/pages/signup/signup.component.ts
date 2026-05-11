import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';

interface RegisterResponse {
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
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  apiUrl = 'https://minuscreators.com/api/register.php';

  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  nacionalidad = '';

  mostrarPassword = false;
  mostrarConfirmPassword = false;

  cargando = false;
  error = '';
  mensaje = '';

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
    private http: HttpClient,
    private router: Router,
    public translationService: TranslationService
  ) {}

  togglePassword(): void {
    this.mostrarPassword = !this.mostrarPassword;
  }

  toggleConfirmPassword(): void {
    this.mostrarConfirmPassword = !this.mostrarConfirmPassword;
  }

  register(): void {
    this.error = '';
    this.mensaje = '';

    if (!this.username.trim() || !this.email.trim() || !this.password.trim()) {
      this.error = 'Completa usuario, email y contraseña';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener mínimo 6 caracteres';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.cargando = true;

    this.http.post<RegisterResponse>(this.apiUrl, {
      username: this.username,
      email: this.email,
      password: this.password,
      nacionalidad: this.nacionalidad
    }).subscribe({
      next: (res) => {
        this.cargando = false;

        if (!res.success || !res.user) {
          this.error = res.error || 'No fue posible hacer el registro';
          return;
        }

        localStorage.setItem('user', JSON.stringify(res.user));

        this.mensaje = res.mensaje || 'Registro correcto';

        this.router.navigate(['/perfil', res.user.id]);
      },
      error: (err) => {
        this.cargando = false;
        this.error = err.error?.error || 'Error al registrar usuario';
        console.error(err);
      }
    });
  }
}