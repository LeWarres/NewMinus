import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { TranslationService } from '../../services/translation.service';
import { AuthService, CurrentUser } from '../../services/auth.service';
import {
  ContentLanguageOption,
  ContentMetadataService
} from '../../services/content-metadata.service';

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
  languageMenuOpen = false;

  searchQuery = '';
  currentLanguage = 'en';
  currentLanguageCode = 'EN';

  availableLanguages: ContentLanguageOption[] = [];

  currentUser: CurrentUser | null = null;

  private languageSubscription?: Subscription;
  private routerSubscription?: Subscription;

  constructor(
    public translationService: TranslationService,
    public metadataService: ContentMetadataService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.availableLanguages = this.metadataService.getAvailableLanguages(false);

    this.currentLanguage = this.translationService.getCurrentLanguage();
    this.currentLanguageCode = this.toContentLanguageCode(this.currentLanguage);

    this.loadCurrentUser();
    this.checkServerSession();

    this.languageSubscription = this.translationService.currentLanguage$
      .subscribe((language) => {
        this.currentLanguage = language;
        this.currentLanguageCode = this.toContentLanguageCode(language);
        this.availableLanguages = this.metadataService.getAvailableLanguages(false);
      });

    this.routerSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.loadCurrentUser();
        this.userMenuOpen = false;
        this.languageMenuOpen = false;
        this.menuOpen = false;
      });
  }

  ngOnDestroy(): void {
    this.languageSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }

  @HostListener('document:click', ['$event'])
  closeMenusOnOutsideClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.user-menu-container')) {
      this.userMenuOpen = false;
    }

    if (!target.closest('.language-menu-container')) {
      this.languageMenuOpen = false;
    }
  }

  get selectedLanguage(): ContentLanguageOption {
    return (
      this.availableLanguages.find(language => language.value === this.currentLanguageCode) ||
      this.availableLanguages.find(language => language.value === 'EN') ||
      {
        value: 'EN',
        label: 'English',
        nativeLabel: 'English',
        shortLabel: 'EN',
        flagUrl: 'flags/us.svg'
      }
    );
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

    if (this.menuOpen) {
      this.userMenuOpen = false;
      this.languageMenuOpen = false;
    }
  }

  toggleUserMenu(event?: MouseEvent): void {
    event?.stopPropagation();

    this.userMenuOpen = !this.userMenuOpen;

    if (this.userMenuOpen) {
      this.languageMenuOpen = false;
    }
  }

  toggleLanguageMenu(event?: MouseEvent): void {
    event?.stopPropagation();

    this.languageMenuOpen = !this.languageMenuOpen;

    if (this.languageMenuOpen) {
      this.userMenuOpen = false;
    }
  }

  changeLanguage(language: ContentLanguageOption, event?: MouseEvent): void {
    event?.stopPropagation();

    const appLanguage = language.value.toLowerCase();

    this.translationService.setLanguage(appLanguage);

    this.currentLanguage = appLanguage;
    this.currentLanguageCode = language.value;
    this.languageMenuOpen = false;
    this.menuOpen = false;
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
    this.menuOpen = false;
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
    this.menuOpen = false;
  }

  navigateToSignup(): void {
    this.router.navigate(['/signup']);
    this.menuOpen = false;
  }

  goToProfile(): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/perfil', this.currentUser.id]);
    this.userMenuOpen = false;
    this.menuOpen = false;
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

  private finishLogout(): void {
    this.authService.clearSession();

    this.currentUser = null;
    this.userMenuOpen = false;
    this.languageMenuOpen = false;
    this.menuOpen = false;

    this.router.navigate(['/login']);
  }

  private toContentLanguageCode(language: string): string {
    const normalized = String(language || '').trim().toUpperCase();
    const exists = this.availableLanguages.some(item => item.value === normalized);

    return exists ? normalized : 'EN';
  }
}