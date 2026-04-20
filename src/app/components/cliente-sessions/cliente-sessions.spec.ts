import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteSessions } from './cliente-sessions';

describe('ClienteSessions', () => {
  let component: ClienteSessions;
  let fixture: ComponentFixture<ClienteSessions>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClienteSessions]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClienteSessions);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
