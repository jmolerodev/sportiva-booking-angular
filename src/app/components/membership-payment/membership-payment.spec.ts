import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MembershipPayment } from './membership-payment';

describe('MembershipPayment', () => {
  let component: MembershipPayment;
  let fixture: ComponentFixture<MembershipPayment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MembershipPayment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MembershipPayment);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
