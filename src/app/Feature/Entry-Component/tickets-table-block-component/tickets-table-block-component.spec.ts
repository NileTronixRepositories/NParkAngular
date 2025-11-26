import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketsTableBlockComponent } from './tickets-table-block-component';

describe('TicketsTableBlockComponent', () => {
  let component: TicketsTableBlockComponent;
  let fixture: ComponentFixture<TicketsTableBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketsTableBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketsTableBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
