import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagementClients } from './management-clients';

describe('ManagementClients', () => {
  let component: ManagementClients;
  let fixture: ComponentFixture<ManagementClients>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementClients]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManagementClients);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
