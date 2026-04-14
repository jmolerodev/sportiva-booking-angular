import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfesionalSessions } from './profesional-sessions';

describe('ProfesionalSessions', () => {
  let component: ProfesionalSessions;
  let fixture: ComponentFixture<ProfesionalSessions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfesionalSessions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfesionalSessions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
