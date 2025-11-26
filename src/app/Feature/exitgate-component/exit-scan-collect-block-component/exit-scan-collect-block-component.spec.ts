import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExitScanCollectBlockComponent } from './exit-scan-collect-block-component';

describe('ExitScanCollectBlockComponent', () => {
  let component: ExitScanCollectBlockComponent;
  let fixture: ComponentFixture<ExitScanCollectBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitScanCollectBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExitScanCollectBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
