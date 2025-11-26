import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IssueTicketBlockComponent } from './issue-ticket-block-component';

describe('IssueTicketBlockComponent', () => {
  let component: IssueTicketBlockComponent;
  let fixture: ComponentFixture<IssueTicketBlockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueTicketBlockComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IssueTicketBlockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
