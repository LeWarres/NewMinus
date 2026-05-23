import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

import { AuthService, CurrentUser } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

interface SuscripcionResponse {
  success: boolean;
  suscrito?: boolean;
  mensaje?: string;
  error?: string;
}

export interface SubscriptionChange {
  isSubscribed: boolean;
  totalSubscribers: number;
  message?: string;
}

@Component({
  selector: 'app-subscribe-button',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './subscribe-button.component.html',
  styleUrl: './subscribe-button.component.css'
})
export class SubscribeButtonComponent implements OnInit, OnChanges {
  @Input() targetUserId: number | null = null;
  @Input() currentUserId: number | null = null;
  @Input() isSubscribed = false;
  @Input() totalSubscribers = 0;
  @Input() showCount = false;
  @Input() hideWhenOwner = true;
  @Input() buttonClass = '';

  @Output() subscriptionChange = new EventEmitter<SubscriptionChange>();

  private suscripcionUrl = 'https://minuscreators.com/api/suscripcion.php';

  currentUser: CurrentUser | null = null;

  localSubscribed = false;
  localTotalSubscribers = 0;

  loading = false;
  message = '';
  error = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService,
    public translationService: TranslationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.syncLocalState();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['isSubscribed'] ||
      changes['totalSubscribers']
    ) {
      this.syncLocalState();
    }
  }

  get shouldShow(): boolean {
    if (!this.targetUserId) {
      return false;
    }

    if (!this.hideWhenOwner) {
      return true;
    }

    const viewerId = this.currentUserId || this.currentUser?.id || null;

    if (!viewerId) {
      return true;
    }

    return viewerId !== this.targetUserId;
  }

  toggleSubscription(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.error = '';
    this.message = '';

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    if (!this.targetUserId) {
      return;
    }

    if (this.currentUser.id === this.targetUserId) {
      return;
    }

    this.loading = true;

    this.ensureCsrfAndRun(() => {
      const wasSubscribed = this.localSubscribed;

      this.http.post<SuscripcionResponse>(
        this.suscripcionUrl,
        {
          seguido_id: this.targetUserId
        },
        {
          withCredentials: true,
          headers: this.authService.csrfHeaders()
        }
      ).subscribe({
        next: (res) => {
          this.loading = false;

          if (!res.success) {
            this.error =
              res.error ||
              this.translationService.getTranslation('subscribeButton.update_error');
            return;
          }

          this.localSubscribed = !!res.suscrito;

          if (this.localSubscribed && !wasSubscribed) {
            this.localTotalSubscribers += 1;
          }

          if (!this.localSubscribed && wasSubscribed) {
            this.localTotalSubscribers = Math.max(this.localTotalSubscribers - 1, 0);
          }

          this.message = res.mensaje || '';

          this.subscriptionChange.emit({
            isSubscribed: this.localSubscribed,
            totalSubscribers: this.localTotalSubscribers,
            message: this.message
          });
        },
        error: (err) => {
          this.loading = false;

          if (err.status === 401) {
            this.authService.clearSession();
            this.router.navigate(['/login']);
            return;
          }

          this.error =
            err.error?.error ||
            this.translationService.getTranslation('subscribeButton.update_error_generic');

          console.error(err);
        }
      });
    }, () => {
      this.loading = false;
      this.error = this.translationService.getTranslation('common.error.prepare_action_failed');
    });
  }

  private syncLocalState(): void {
    this.localSubscribed = !!this.isSubscribed;
    this.localTotalSubscribers = Number(this.totalSubscribers || 0);
  }

  private ensureCsrfAndRun(action: () => void, onFail?: () => void): void {
    if (this.authService.getCsrfToken()) {
      action();
      return;
    }

    this.authService.fetchCsrfToken().subscribe({
      next: (res) => {
        if (!res.success || !res.csrfToken) {
          onFail?.();
          return;
        }

        this.authService.saveCsrfToken(res.csrfToken);
        action();
      },
      error: (err) => {
        onFail?.();
        console.error(err);
      }
    });
  }
}