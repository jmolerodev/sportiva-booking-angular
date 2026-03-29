import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSportCentre } from './add-sport-centre';

describe('AddSportCentre', () => {
  let component: AddSportCentre;
  let fixture: ComponentFixture<AddSportCentre>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSportCentre]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddSportCentre);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
