import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-uploader-authorship',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './uploader-authorship.component.html',
  styleUrl: './uploader-authorship.component.css'
})
export class UploaderAuthorshipComponent {
  @Input({ required: true }) formulario!: FormGroup;

  constructor(public translationService: TranslationService) {}
}
