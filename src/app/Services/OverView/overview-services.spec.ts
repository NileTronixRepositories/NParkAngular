import { TestBed } from '@angular/core/testing';

import { OverviewServices } from './overview-services';

describe('OverviewServices', () => {
  let service: OverviewServices;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OverviewServices);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
