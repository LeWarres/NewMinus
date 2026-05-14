import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {
  siteUrl = 'https://minuscreators.com';

  menuOpen = false;
  userMenuOpen = false;

  searchQuery = '';
  currentLanguage = 'en';

  currentUser: CurrentUser | null = null;

  private languageSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    public translationService: TranslationService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.translationService.getCurrentLanguage();

    this.loadCurrentUser();
    this.checkServerSession();

    this.languageSubscription = this.translationService.currentLanguage$
      .subscribe((language) => {
        this.currentLanguage = language;
      });

    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadCurrentUser();
        this.userMenuOpen = false;
        this.menuOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.languageSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  closeMenuOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.user-menu-container')) {
      this.userMenuOpen = false;
    }
  }

  loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  checkServerSession(): void {
    this.authService.checkSession().subscribe({
      next: (res) => {
        if (!res.success || !res.authenticated || !res.user) {
          this.authService.clearSession();
          this.currentUser = null;
          return;
        }

        this.authService.saveSession(res.user, res.csrfToken);
        this.currentUser = res.user;
      },
      error: () => {
        this.authService.clearSession();
        this.currentUser = null;
      }
    });
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }

  changeLanguage(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.translationService.setLanguage(select.value);
  }

  search(): void {
    const query = this.searchQuery.trim();

    if (!query) {
      return;
    }

    this.router.navigate(['/categorias'], {
      queryParams: {
        buscar: query
      }
    });

    this.menuOpen = false;
  }

  navigateToUploader(): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/uploader']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToSignup(): void {
    this.router.navigate(['/signup']);
  }

  goToProfile(): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/perfil', this.currentUser.id]);
    this.userMenuOpen = false;
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.finishLogout();
      },
      error: (err) => {
        console.error(err);
        this.finishLogout();
      }
    });
  }

  private finishLogout(): void {
    this.authService.clearSession();

    this.currentUser = null;
    this.userMenuOpen = false;
    this.menuOpen = false;

    this.router.navigate(['/login']);
  }

  imageUrl(path?: string | null, fallback: string = '/obras/paleta/tres.png'): string {
    const finalPath = path || fallback;

    if (finalPath.startsWith('http')) {
      return finalPath;
    }

    if (finalPath.startsWith('/')) {
      return finalPath;
    }

    return `${this.siteUrl}/${finalPath}`;
  }
}