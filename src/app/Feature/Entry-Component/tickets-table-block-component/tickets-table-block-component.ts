import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TicketDto } from '../../../Domain/tickets/tickets.model';

@Component({
  selector: 'app-tickets-table-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets-table-block-component.html',
  styleUrl: './tickets-table-block-component.css',
})
export class TicketsTableBlockComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() isRTL = false;
  @Input() tickets: TicketDto[] = [];
  @Input() totalPriceToday = 0;
  @Input() loading = false;
  @Input() collectingTicketId: string | null = null;

  @Output() collectTicket = new EventEmitter<string>();

  page = 1;
  pageSize = 10;
  today = new Date();

  // Expose Math to template
  protected readonly Math = Math;

  get pageItems(): TicketDto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.tickets.slice(start, start + this.pageSize);
  }

  get pagesCount(): number {
    return Math.max(1, Math.ceil(this.tickets.length / this.pageSize));
  }

  prevPage(): void {
    if (this.page > 1) this.page--;
  }

  nextPage(): void {
    if (this.page < this.pagesCount) this.page++;
  }

  onCollectClick(ticketId: string | number): void {
    this.collectTicket.emit(String(ticketId));
  }

  trackByTicket(index: number, item: TicketDto): string | number {
    return item.id ?? index;
  }

  isCollecting(ticketId: string | number): boolean {
    return this.collectingTicketId === String(ticketId);
  }
}
