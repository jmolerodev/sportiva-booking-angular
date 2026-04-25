import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoporteCliente } from './soporte-cliente';

describe('SoporteCliente', () => {
  let component: SoporteCliente;
  let fixture: ComponentFixture<SoporteCliente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoporteCliente]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SoporteCliente);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
