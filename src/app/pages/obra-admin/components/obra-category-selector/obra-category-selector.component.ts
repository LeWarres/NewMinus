import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { TranslationService } from '../../../../services/translation.service';
import { SelectOption } from '../../obra-admin.models';

@Component({
  selector: 'app-obra-category-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './obra-category-selector.component.html',
  styleUrl: './obra-category-selector.component.css'
})
export class ObraCategorySelectorComponent {
  @Input() categorias: SelectOption[] = [];
  @Input() selectedCategories: string[] = [];
  @Input() maxCategories = 3;

  @Output() toggleCategory = new EventEmitter<string>();

  constructor(public translationService: TranslationService) {}

  isCategorySelected(value: string): boolean {
    return this.selectedCategories.includes(value);
  }

  getCategoryLabel(value: string): string {
    return this.categorias.find(categoria => categoria.value === value)?.label || value;
  }
}
