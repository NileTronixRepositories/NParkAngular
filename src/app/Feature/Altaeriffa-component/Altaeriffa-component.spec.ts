import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AltaeriffaComponent } from './Altaeriffa-component';

describe('AltaeriffaComponent', () => {
  let component: AltaeriffaComponent;
  let fixture: ComponentFixture<AltaeriffaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AltaeriffaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AltaeriffaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
