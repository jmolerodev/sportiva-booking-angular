import { TestBed } from '@angular/core/testing';

import { SportCentreService } from './sport-centre-service';

describe('SportCentre', () => {
  let service: SportCentreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SportCentreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
