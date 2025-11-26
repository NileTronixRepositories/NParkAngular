import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExitGateDevicesBlockComponent } from './exit-gate-devices-block-component';

describe('ExitGateDevicesBlockComponent', () => {
  let component: ExitGateDevicesBlockComponent;
  let fixture: ComponentFixture<ExitGateDevicesBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitGateDevicesBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExitGateDevicesBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
