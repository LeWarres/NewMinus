import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChapterUploaderComponent } from './chapter-uploader.component';

describe('ChapterUploaderComponent', () => {
  let component: ChapterUploaderComponent;
  let fixture: ComponentFixture<ChapterUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChapterUploaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChapterUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
