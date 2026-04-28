import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { TicketDto, CollectDailyTicketsResponse } from '../../../Domain/tickets/tickets.model';
import { CollectExceedTransactionsResponse } from '../../../Domain/TicketExceedTransaction/ticket-exceed-transaction.models';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exit-tickets-table-block-component',
  standalone: true,
  imports: [TranslatePipePipe, CommonModule, FormsModule],
  templateUrl: './exit-tickets-table-block-component.html',
  styleUrl: './exit-tickets-table-block-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExitTicketsTableBlockComponent {
  // ========== Inputs ==========
  @Input() tickets: TicketDto[] = [];
  @Input() page = 1;
  @Input() pageSize = 10;
  @Input() loading = false;

  @Input() totalPriceToday = 0;

  @Input() collectSummary: CollectDailyTicketsResponse | null = null;
  @Input() exceedCollectSummary: CollectExceedTransactionsResponse | null = null;
  @Input() collectLoading = false;
  @Input() supervisorCollectLoading = false;
  @Input() supervisorCollectError: string | null = null;

  @Input() showSupervisorCollectModal = false;
  @Input() supervisorUsername = '';
  @Input() supervisorPassword = '';

  // ========== Outputs ==========
  @Output() pageChange = new EventEmitter<number>();
  @Output() collectClick = new EventEmitter<void>();
  @Output() collectSummaryClose = new EventEmitter<void>();

  @Output() supervisorUsernameChange = new EventEmitter<string>();
  @Output() supervisorPasswordChange = new EventEmitter<string>();
  @Output() submitSupervisorCollect = new EventEmitter<void>();
  @Output() closeSupervisorCollectModal = new EventEmitter<void>();
  @Output() finishSupervisorCollect = new EventEmitter<void>();
  @Output() ticketSelected = new EventEmitter<TicketDto>();

  Math = Math;

  // ========== Getters ==========
  get currentDate(): Date {
    return new Date();
  }

  get hasTickets(): boolean {
    return (this.tickets?.length ?? 0) > 0;
  }

  get pageItems(): TicketDto[] {
    if (!this.tickets?.length) return [];
    const start = (this.page - 1) * this.pageSize;
    return this.tickets.slice(start, start + this.pageSize);
  }

  get pagesCount(): number {
    const total = this.tickets?.length ?? 0;
    return Math.max(1, Math.ceil(total / this.pageSize || 1));
  }

  get hasCollectSummary(): boolean {
    return !!this.collectSummary || !!this.exceedCollectSummary;
  }

  get canGoPrev(): boolean {
    return this.page > 1;
  }

  get canGoNext(): boolean {
    return this.page < this.pagesCount;
  }

  get rangeStart(): number {
    return this.hasTickets ? (this.page - 1) * this.pageSize + 1 : 0;
    // 👆 كده مش هنشوف 1–0 لما مفيش تذاكر
  }

  get rangeEnd(): number {
    return this.hasTickets ? Math.min(this.page * this.pageSize, this.tickets.length) : 0;
  }

  // ========== Pagination actions ==========
  onPrev(): void {
    if (!this.canGoPrev) return;
    this.pageChange.emit(this.page - 1);
  }

  onNext(): void {
    if (!this.canGoNext) return;
    this.pageChange.emit(this.page + 1);
  }

  // ========== Collect today & summary ==========
  onCollectClick(): void {
    this.collectClick.emit();
  }

  onCollectSummaryClose(): void {
    this.collectSummaryClose.emit();
  }

  // ========== Supervisor modal bindings ==========
  onSupervisorUsernameChange(value: string): void {
    this.supervisorUsernameChange.emit(value);
  }

  onSupervisorPasswordChange(value: string): void {
    this.supervisorPasswordChange.emit(value);
  }

  onSubmitSupervisorCollect(): void {
    this.submitSupervisorCollect.emit();
  }

  onCloseSupervisorCollectModal(): void {
    this.closeSupervisorCollectModal.emit();
  }

  onFinishSupervisorCollect(): void {
    this.finishSupervisorCollect.emit();
  }

  onTicketRowClick(ticket: TicketDto): void {
    this.ticketSelected.emit(ticket);
  }
}
