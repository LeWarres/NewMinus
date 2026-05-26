import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-manga-preview-cover',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manga-preview-cover.component.html',
  styleUrl: './manga-preview-cover.component.css'
})
export class MangaPreviewCoverComponent {
  @Input({ required: true }) coverUrl = '';
  @Input({ required: true }) title = '';
}
