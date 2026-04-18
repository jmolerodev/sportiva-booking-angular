import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sportcentredetail } from './sportcentredetail';

describe('Sportcentredetail', () => {
  let component: Sportcentredetail;
  let fixture: ComponentFixture<Sportcentredetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sportcentredetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sportcentredetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
