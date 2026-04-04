import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddProfesionalToCenter } from './add-profesional-to-center';

describe('AddProfesionalToCenter', () => {
  let component: AddProfesionalToCenter;
  let fixture: ComponentFixture<AddProfesionalToCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddProfesionalToCenter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddProfesionalToCenter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
