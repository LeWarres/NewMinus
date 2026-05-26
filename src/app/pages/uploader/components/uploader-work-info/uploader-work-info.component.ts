import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TranslationService } from '../../../../services/translation.service';
import { SelectOption } from '../../uploader.models';

@Component({
  selector: 'app-uploader-work-info',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './uploader-work-info.component.html',
  styleUrl: './uploader-work-info.component.css'
})
export class UploaderWorkInfoComponent {
  @Input({ required: true }) formulario!: FormGroup;
  @Input() categorias: SelectOption[] = [];
  @Input() selectedCategories: string[] = [];
  @Input() maxCategories = 3;
  @Input() tipoObraOptions: SelectOption[] = [];

  @Output() toggleCategory = new EventEmitter<string>();
  @Output() tipoEntregaChange = new EventEmitter<string>();

  constructor(public translationService: TranslationService) {}

  isCategorySelected(value: string): boolean {
    return this.selectedCategories.includes(value);
  }

  getOptionLabel(option?: SelectOption): string {
    if (!option) {
      return '';
    }

    const translated = this.translationService.getTranslation(option.labelKey);

    if (!translated || translated === option.labelKey) {
      return option.nativeLabel || option.value;
    }

    if (option.nativeLabel && translated === option.nativeLabel) {
      return translated;
    }

    if (option.nativeLabel && option.nativeLabel !== translated) {
      return `${translated} / ${option.nativeLabel}`;
    }

    return translated;
  }

  getCategoryLabel(value: string): string {
    const option = this.categorias.find(categoria => categoria.value === value);
    return this.getOptionLabel(option) || value;
  }

  trackByCategoriaValue(index: number, categoria: SelectOption): string {
    return categoria.value;
  }

  trackBySelectedCategoria(index: number, categoria: string): string {
    return categoria;
  }

  trackByTipoObraValue(index: number, tipo: SelectOption): string {
    return tipo.value;
  }
}
