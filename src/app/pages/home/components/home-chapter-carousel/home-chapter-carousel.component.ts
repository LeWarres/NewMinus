import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslationService } from '../../../../services/translation.service';
import {
  CapituloCardComponent,
  CapituloCardItem
} from '../../../../components/cards/capitulo-card/capitulo-card.component';

@Component({
  selector: 'app-home-chapter-carousel',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CapituloCardComponent
  ],
  templateUrl: './home-chapter-carousel.component.html',
  styleUrl: './home-chapter-carousel.component.css'
})
export class HomeChapterCarouselComponent {
  @Input() sectionClass = '';
  @Input() titleKey = '';
  @Input() descriptionKey = '';
  @Input() loadingKey = '';
  @Input() emptyKey = '';
  @Input() carouselId = '';
  @Input() items: CapituloCardItem[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Input() showDescription = true;
  @Input() viewMoreRoute = '/categorias';

  @Output() openCapitulo = new EventEmitter<CapituloCardItem>();
  @Output() openAutor = new EventEmitter<CapituloCardItem>();

  constructor(public translationService: TranslationService) {}

  trackByCapitulo(index: number, item: CapituloCardItem): number | string {
    return item.capituloVersionId || item.capituloId || `${item.obraId}-${item.numeroCapitulo}-${item.idioma || 'GLOBAL'}-${index}`;
  }

  get loadingText(): string {
    return this.translationService.getTranslation(this.loadingKey || 'home.newChapters.loading');
  }

  prevCarousel(): void {
    this.scrollCarousel(-1);
  }

  nextCarousel(): void {
    this.scrollCarousel(1);
  }

  private scrollCarousel(direction: 1 | -1): void {
    const carousel = document.getElementById(this.carouselId);

    if (!carousel) {
      return;
    }

    carousel.scrollBy({
      left: direction * 320,
      behavior: 'smooth'
    });
  }
}
