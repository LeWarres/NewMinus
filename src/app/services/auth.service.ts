import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

export interface CurrentUser {
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

interface MeResponse {
  success: boolean;
  authenticated: boolean;
  user: CurrentUser | null;
  csrfToken?: string;
  error?: string;
}

interface CsrfResponse {
  success: boolean;
  csrfToken?: string;
  error?: string;
}

interface LogoutResponse {
  success: boolean;
  mensaje?: string;
  error?: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  nacionalidad?: string;
  website?: string;
  turnstileToken?: string;
}

export interface RegisterResponse {
  success: boolean;
  authenticated?: boolean;
  csrfToken?: string;
  mensaje?: string;
  error?: string;
  user?: CurrentUser;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private meUrl = 'https://minuscreators.com/api/me.php';
  private csrfUrl = 'https://minuscreators.com/api/csrf.php';
  private logoutUrl = 'https://minuscreators.com/api/logout.php';
  private registerUrl = 'https://minuscreators.com/api/register.php';
  private resendVerificationUrl = 'https://minuscreators.com/api/reenviar_verificacion.php';
private requestPasswordResetUrl = 'https://minuscreators.com/api/solicitar_reset_password.php';
private resetPasswordUrl = 'https://minuscreators.com/api/reset_password.php';

  constructor(
    private http: HttpClient
  ) {}

  getCurrentUser(): CurrentUser | null {
    const userRaw = localStorage.getItem('user');

    if (!userRaw) {
      return null;
    }

    try {
      return JSON.parse(userRaw) as CurrentUser;
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  }

  getCsrfToken(): string {
    return localStorage.getItem('csrfToken') || '';
  }

  saveCsrfToken(csrfToken?: string): void {
    if (csrfToken) {
      localStorage.setItem('csrfToken', csrfToken);
    }
  }

  csrfHeaders(): HttpHeaders {
    return new HttpHeaders({
      'X-CSRF-Token': this.getCsrfToken()
    });
  }

  checkSession() {
    return this.http.get<MeResponse>(this.meUrl, {
      withCredentials: true
    });
  }

  fetchCsrfToken() {
    return this.http.get<CsrfResponse>(this.csrfUrl, {
      withCredentials: true
    });
  }

register(payload: RegisterPayload) {
  return this.http.post<RegisterResponse>(
    this.registerUrl,
    {
      username: payload.username,
      email: payload.email,
      password: payload.password,
      nacionalidad: payload.nacionalidad || '',
      website: payload.website || '',
      turnstileToken: payload.turnstileToken || ''
    },
    {
      withCredentials: true,
      headers: this.csrfHeaders()
    }
  );
}

  logout() {
    return this.http.post<LogoutResponse>(
      this.logoutUrl,
      {},
      {
        withCredentials: true,
        headers: this.csrfHeaders()
      }
    );
  }

  saveSession(user: CurrentUser, csrfToken?: string): void {
    localStorage.setItem('user', JSON.stringify(user));
    this.saveCsrfToken(csrfToken);
  }

  clearSession(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('csrfToken');
  }

resendVerification(email: string, turnstileToken: string) {
  return this.http.post<{ success: boolean; mensaje?: string; error?: string }>(
    this.resendVerificationUrl,
    {
      email,
      turnstileToken
    },
    {
      withCredentials: true,
      headers: this.csrfHeaders()
    }
  );
}

requestPasswordReset(email: string, turnstileToken: string) {
  return this.http.post<{ success: boolean; mensaje?: string; error?: string }>(
    this.requestPasswordResetUrl,
    {
      email,
      turnstileToken
    },
    {
      withCredentials: true,
      headers: this.csrfHeaders()
    }
  );
}

resetPassword(token: string, password: string) {
  return this.http.post<{ success: boolean; mensaje?: string; error?: string }>(
    this.resetPasswordUrl,
    {
      token,
      password
    },
    {
      withCredentials: true,
      headers: this.csrfHeaders()
    }
  );
}


}