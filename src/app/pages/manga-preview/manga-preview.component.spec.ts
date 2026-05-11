import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MangaPreviewComponent } from './manga-preview.component';

describe('MangaPreviewComponent', () => {
  let component: MangaPreviewComponent;
  let fixture: ComponentFixture<MangaPreviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MangaPreviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MangaPreviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
