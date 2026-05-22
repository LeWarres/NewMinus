import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReportarContenidoComponent } from './reportar-contenido.component';

describe('ReportarContenidoComponent', () => {
  let component: ReportarContenidoComponent;
  let fixture: ComponentFixture<ReportarContenidoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportarContenidoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReportarContenidoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
