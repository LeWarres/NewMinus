import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { TranslationService } from '../../services/translation.service';

interface CurrentUser {
  id: number;
  username: string;
  email?: string;
  role?: string;
  nacionalidad?: string;
  imgPerfil?: string;
  imgBanner?: string;
  twitter?: string;
  facebook?: string;
  instagram?: string;
}

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentLanguage = this.translationService.getCurrentLanguage();
    this.loadCurrentUser();

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
    const userRaw = localStorage.getItem('user');

    if (!userRaw) {
      this.currentUser = null;
      return;
    }

    try {
      this.currentUser = JSON.parse(userRaw);
    } catch {
      this.currentUser = null;
      localStorage.removeItem('user');
    }
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
    this.router.navigate(['/uploader']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  goToProfile(): void {
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.router.navigate(['/perfil', this.currentUser.id]);
    this.userMenuOpen = false;
  }

  navigateToSignup(): void {
  this.router.navigate(['/signup']);
}

  logout(): void {
    localStorage.removeItem('user');
    this.currentUser = null;
    this.userMenuOpen = false;
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