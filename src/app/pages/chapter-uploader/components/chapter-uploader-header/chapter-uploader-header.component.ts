import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-chapter-uploader-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chapter-uploader-header.component.html',
  styleUrl: './chapter-uploader-header.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChapterUploaderHeaderComponent {
  @Input() cargando = false;
  @Input() canAddLanguageVersion = false;
  @Input() isArtworkWork = false;
  @Input() loadingWorkType = false;
  @Input() totalVersiones = 0;

  @Output() addLanguageVersion = new EventEmitter<void>();

  constructor(public translationService: TranslationService) {}
}
