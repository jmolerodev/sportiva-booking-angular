import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminUserManagement } from './admin-user-management';

describe('AdminUserManagement', () => {
  let component: AdminUserManagement;
  let fixture: ComponentFixture<AdminUserManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminUserManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminUserManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
