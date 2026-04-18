import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoporteAdmin } from './soporte-admin';

describe('SoporteAdmin', () => {
  let component: SoporteAdmin;
  let fixture: ComponentFixture<SoporteAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoporteAdmin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SoporteAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
