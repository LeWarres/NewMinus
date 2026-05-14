import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    __turnstileScriptLoading?: Promise<void>;
  }
}

@Component({
  selector: 'app-turnstile-widget',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './turnstile-widget.component.html',
  styleUrl: './turnstile-widget.component.css'
})
export class TurnstileWidgetComponent implements AfterViewInit, OnDestroy {
  @ViewChild('turnstileContainer') turnstileContainer!: ElementRef<HTMLDivElement>;

  @Output() tokenChange = new EventEmitter<string>();
  @Output() expired = new EventEmitter<void>();
  @Output() failed = new EventEmitter<void>();

  /*
    PEGA AQUÍ TU SITE KEY.
    Esta sí puede estar en Angular.
    NO pongas aquí la secret key.
  */
  private siteKey = '0x4AAAAAADOyxaMDPr75z8St';

  private widgetId = '';

  ngAfterViewInit(): void {
    this.loadTurnstileScript()
      .then(() => this.renderWidget())
      .catch(() => {
        this.failed.emit();
      });
  }

  ngOnDestroy(): void {
    this.remove();
  }

  reset(): void {
    this.tokenChange.emit('');

    if (window.turnstile && this.widgetId) {
      window.turnstile.reset(this.widgetId);
    }
  }

  private remove(): void {
    if (window.turnstile && this.widgetId) {
      window.turnstile.remove(this.widgetId);
      this.widgetId = '';
    }
  }

  private renderWidget(): void {
    if (!window.turnstile || !this.turnstileContainer?.nativeElement) {
      this.failed.emit();
      return;
    }

    this.widgetId = window.turnstile.render(
      this.turnstileContainer.nativeElement,
      {
        sitekey: this.siteKey,
        theme: 'dark',
        size: 'normal',
        callback: (token: string) => {
          this.tokenChange.emit(token);
        },
        'expired-callback': () => {
          this.tokenChange.emit('');
          this.expired.emit();
        },
        'error-callback': () => {
          this.tokenChange.emit('');
          this.failed.emit();
        }
      }
    );
  }

  private loadTurnstileScript(): Promise<void> {
    if (window.turnstile) {
      return Promise.resolve();
    }

    if (window.__turnstileScriptLoading) {
      return window.__turnstileScriptLoading;
    }

    window.__turnstileScriptLoading = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[src*="challenges.cloudflare.com/turnstile"]'
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject());
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = () => reject();

      document.head.appendChild(script);
    });

    return window.__turnstileScriptLoading;
  }
}