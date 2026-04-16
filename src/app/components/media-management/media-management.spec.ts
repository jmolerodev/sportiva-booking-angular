import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MediaManagement } from './media-management';

describe('MediaManagement', () => {
  let component: MediaManagement;
  let fixture: ComponentFixture<MediaManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MediaManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MediaManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
