import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExitTicketsTableBlockComponent } from './exit-tickets-table-block-component';

describe('ExitTicketsTableBlockComponent', () => {
  let component: ExitTicketsTableBlockComponent;
  let fixture: ComponentFixture<ExitTicketsTableBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExitTicketsTableBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExitTicketsTableBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
