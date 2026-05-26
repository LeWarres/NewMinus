import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Params, RouterModule } from '@angular/router';

import { TranslationService } from '../../../../services/translation.service';
import {
  ObraCardComponent,
  ObraCardItem
} from '../../../../components/cards/obra-card/obra-card.component';

@Component({
  selector: 'app-home-work-carousel',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ObraCardComponent
  ],
  templateUrl: './home-work-carousel.component.html',
  styleUrl: './home-work-carousel.component.css'
})
export class HomeWorkCarouselComponent {
  @Input() sectionClass = '';
  @Input() titleKey = '';
  @Input() descriptionKey = '';
  @Input() cardLabelKey = '';
  @Input() emptyKey = '';
  @Input() carouselId = '';
  @Input() items: ObraCardItem[] = [];
  @Input() loading = false;
  @Input() error = '';
  @Input() viewMoreRoute = '/categorias';
  @Input() viewMoreQueryParams: Params | null = null;

  @Output() openObra = new EventEmitter<{ id: number; idioma?: string }>();
  @Output() openAutor = new EventEmitter<{ usuarioId: number | null }>();

  constructor(public translationService: TranslationService) {}

  trackByObra(index: number, obra: ObraCardItem): number | string {
    return obra.id || index;
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
