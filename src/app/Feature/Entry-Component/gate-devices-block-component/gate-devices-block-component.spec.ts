import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GateDevicesBlockComponent } from './gate-devices-block-component';

describe('GateDevicesBlockComponent', () => {
  let component: GateDevicesBlockComponent;
  let fixture: ComponentFixture<GateDevicesBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GateDevicesBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GateDevicesBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
