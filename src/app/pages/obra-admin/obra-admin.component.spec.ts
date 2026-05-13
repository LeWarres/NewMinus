import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObraAdminComponent } from './obra-admin.component';

describe('ObraAdminComponent', () => {
  let component: ObraAdminComponent;
  let fixture: ComponentFixture<ObraAdminComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObraAdminComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObraAdminComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
