import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfesionalList } from './profesional-list';

describe('ProfesionalList', () => {
  let component: ProfesionalList;
  let fixture: ComponentFixture<ProfesionalList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfesionalList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfesionalList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
