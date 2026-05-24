import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../../services/translation.service';
import { getWorkCategoryLabel } from '../../../../shared/options/profile-options';

interface CategorySelectorOption {
  value: string;
  label?: string;
  labelKey?: string;
  nativeLabel?: string;
}

@Component({
  selector: 'app-obra-category-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './obra-category-selector.component.html',
  styleUrl: './obra-category-selector.component.css'
})
export class ObraCategorySelectorComponent {
  @Input() categorias: CategorySelectorOption[] = [];
  @Input() selectedCategories: string[] = [];
  @Input() maxCategories = 3;

  @Output() toggleCategory = new EventEmitter<string>();

  constructor(public translationService: TranslationService) {}

  isCategorySelected(value: string): boolean {
    return this.selectedCategories.includes(value);
  }

  getCategoryLabel(value: string): string {
    return getWorkCategoryLabel(
      value,
      (key) => this.translationService.getTranslation(key),
      this.translationService.getTranslation('common.labels.no_category')
    );
  }

  getCategoryOptionLabel(categoria: CategorySelectorOption): string {
    const labelKey = categoria.labelKey || categoria.label;

    if (labelKey) {
      const translated = this.translationService.getTranslation(labelKey);

      if (translated && translated !== labelKey) {
        return translated;
      }
    }

    if (categoria.nativeLabel) {
      return categoria.nativeLabel;
    }

    return this.getCategoryLabel(categoria.value);
  }

  trackByCategoryValue(index: number, categoria: CategorySelectorOption): string {
    return categoria.value;
  }
}
