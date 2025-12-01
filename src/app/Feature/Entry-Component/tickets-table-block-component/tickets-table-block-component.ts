import { Component, Input, Output, EventEmitter } from '@angular/core';
import { TicketDto } from '../../../Domain/tickets/tickets.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tickets-table-block-component',
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets-table-block-component.html',
  styleUrl: './tickets-table-block-component.css',
})
export class TicketsTableBlockComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() isRTL = false;
  @Input() tickets: TicketDto[] = [];
  @Input() totalPriceToday: number = 0;
  @Input() loading: boolean = false;
  @Input() collectingTicketId: string | null = null;

  @Output() collectTicket = new EventEmitter<string>();

  page = 1;
  pageSize = 10;
  Math = Math;
  today = new Date();

  get pageItems(): TicketDto[] {
    const start = (this.page - 1) * this.pageSize;
    return this.tickets.slice(start, start + this.pageSize);
  }

  get pagesCount(): number {
    return Math.max(1, Math.ceil(this.tickets.length / this.pageSize));
  }

  prevPage() {
    if (this.page > 1) this.page--;
  }

  nextPage() {
    if (this.page < this.pagesCount) this.page++;
  }

  onCollectClick(ticketId: string | number) {
    this.collectTicket.emit(String(ticketId));
  }
}
