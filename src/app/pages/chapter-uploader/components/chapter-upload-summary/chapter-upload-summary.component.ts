import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { TranslationService } from '../../../../services/translation.service';

@Component({
  selector: 'app-chapter-upload-summary',
  standalone: true,
  templateUrl: './chapter-upload-summary.component.html',
  styleUrl: './chapter-upload-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChapterUploadSummaryComponent {
  @Input() totalVersiones = 0;
  @Input() totalPagesCount = 0;
  @Input() totalPagesSize = 0;
  @Input() isArtworkWork = false;

  constructor(public translationService: TranslationService) {}

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    const kb = bytes / 1024;

    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    }

    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  }
}
