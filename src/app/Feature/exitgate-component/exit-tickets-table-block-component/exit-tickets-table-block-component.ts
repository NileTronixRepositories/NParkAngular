import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TicketDto, CollectDailyTicketsResponse } from '../../../Domain/tickets/tickets.model';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exit-tickets-table-block-component',
  imports: [TranslatePipePipe, CommonModule, FormsModule],
  templateUrl: './exit-tickets-table-block-component.html',
  styleUrl: './exit-tickets-table-block-component.css',
})
export class ExitTicketsTableBlockComponent {
  @Input() tickets: TicketDto[] = [];
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() loading = false;

  @Input() totalPriceToday = 0;

  @Input() collectSummary: CollectDailyTicketsResponse | null = null;
  @Input() collectLoading = false;
  @Input() supervisorCollectLoading = false;
  @Input() supervisorCollectError: string | null = null;

  @Input() showSupervisorCollectModal = false;
  @Input() supervisorUsername: string = '';
  @Input() supervisorPassword: string = '';

  @Output() pageChange = new EventEmitter<number>();
  @Output() collectClick = new EventEmitter<void>();
  @Output() collectSummaryClose = new EventEmitter<void>();

  @Output() supervisorUsernameChange = new EventEmitter<string>();
  @Output() supervisorPasswordChange = new EventEmitter<string>();
  @Output() submitSupervisorCollect = new EventEmitter<void>();
  @Output() closeSupervisorCollectModal = new EventEmitter<void>();
  @Output() finishSupervisorCollect = new EventEmitter<void>();

  Math = Math;

  get currentDate(): Date {
    return new Date();
  }

  pageItems() {
    const start = (this.page - 1) * this.pageSize;
    return this.tickets.slice(start, start + this.pageSize);
  }

  pagesCount() {
    return Math.max(1, Math.ceil(this.tickets.length / this.pageSize));
  }

  onPrev() {
    if (this.page > 1) {
      this.pageChange.emit(this.page - 1);
    }
  }

  onNext() {
    if (this.page < this.pagesCount()) {
      this.pageChange.emit(this.page + 1);
    }
  }

  onCollectClick() {
    this.collectClick.emit();
  }

  onCollectSummaryClose() {
    this.collectSummaryClose.emit();
  }

  onSupervisorUsernameChange(value: string) {
    this.supervisorUsernameChange.emit(value);
  }

  onSupervisorPasswordChange(value: string) {
    this.supervisorPasswordChange.emit(value);
  }

  onSubmitSupervisorCollect() {
    this.submitSupervisorCollect.emit();
  }

  onCloseSupervisorCollectModal() {
    this.closeSupervisorCollectModal.emit();
  }

  onFinishSupervisorCollect() {
    this.finishSupervisorCollect.emit();
  }
}
