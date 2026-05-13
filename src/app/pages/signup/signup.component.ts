import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { TranslationService } from '../../services/translation.service';
import { AuthService } from '../../services/auth.service';

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
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  nacionalidad = '';

  /*
    Honeypot anti-bot.
    No necesitas mostrarlo en el HTML.
    Se manda vacío al backend.
  */
  website = '';

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

    this.cargando = true;

    /*
      1. Pedimos CSRF.
      2. Guardamos CSRF temporalmente.
      3. Enviamos register.php con cookie + header X-CSRF-Token.
      4. Guardamos sesión local para que header/perfil funcionen.
         La seguridad real viene de la cookie HttpOnly creada por PHP.
    */
    this.authService.fetchCsrfToken().subscribe({
      next: (csrfRes) => {
        if (!csrfRes.success || !csrfRes.csrfToken) {
          this.cargando = false;
          this.error = this.translationService.getTranslation('No se pudo preparar el registro');
          return;
        }

        this.authService.saveCsrfToken(csrfRes.csrfToken);

        this.authService.register({
          username,
          email,
          password,
          nacionalidad,
          website: this.website
        }).subscribe({
          next: (res) => {
            this.cargando = false;

            if (!res.success || !res.authenticated || !res.user) {
              this.error = res.error || this.translationService.getTranslation('No fue posible hacer el registro');
              return;
            }

            this.authService.saveSession(res.user, res.csrfToken);

            this.mensaje = res.mensaje || this.translationService.getTranslation('Registro correcto');

            this.router.navigate(['/perfil', res.user.id]);
          },
          error: (err) => {
            this.cargando = false;
            this.error = err.error?.error || this.translationService.getTranslation('Error al registrar usuario');
            console.error(err);
          }
        });
      },
      error: (err) => {
        this.cargando = false;
        this.error = this.translationService.getTranslation('No se pudo preparar el registro');
        console.error(err);
      }
    });
  }
}