import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ParkingCardSummaryDto } from '../../../Domain/tickets/tickets.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-issue-ticket-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue-ticket-block-component.html',
  // ✅ لازم تبقى styleUrls مش styleUrl
  styleUrls: ['./issue-ticket-block-component.css'],
})
export class IssueTicketBlockComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() isRTL = false;

  @Input() cardNumber: string = '';
  @Input() cardSummary: ParkingCardSummaryDto | null = null;
  @Input() adding = false;
  @Input() readingCard = false;

  @Input() currentIssuedQr: string | null = null;
  @Input() currentIssuedQrType: 'image' | 'text' | null = null;

  @Input() lastIssuedTicketId: string | number | null = null;
  @Input() lastIssuedTicketInfo: string | null = null;
  @Input() lastIssuedVehicleNumber: string | null = null;
  @Input() lastIssuedPrice: number | null = null;
  @Input() lastIssuedCreatedAt: string | null = null;
  @Input() lastIssuedCollected: boolean = false;
  @Input() cashierConfirming: boolean = false;

  @Output() cardNumberChange = new EventEmitter<string>();
  @Output() readCardClicked = new EventEmitter<void>();
  @Output() createTicketClicked = new EventEmitter<void>();
  @Output() createSubscriberTicketClicked = new EventEmitter<void>();
  @Output() confirmCashierClicked = new EventEmitter<void>();
  @Output() clearCardSummaryClicked = new EventEmitter<Event>();

  get card(): string {
    return this.cardNumber;
  }

  set card(value: string) {
    this.cardNumberChange.emit(value);
  }

  qrDataUrl(text: string): string {
    return `data:text/plain,${encodeURIComponent(text ?? '')}`;
  }

  onReadCard(): void {
    if (this.readingCard || this.adding) return;
    this.readCardClicked.emit();
  }

  onCreateTicket(): void {
    if (this.adding || this.readingCard) return;
    this.createTicketClicked.emit();
  }

  onCreateSubscriberTicket(): void {
    if (this.adding || this.readingCard) return;
    this.createSubscriberTicketClicked.emit();
  }

  onConfirmCashier(): void {
    if (!this.lastIssuedTicketId || this.lastIssuedCollected || this.cashierConfirming) return;
    this.confirmCashierClicked.emit();
  }

  onClearCardSummary(event: Event): void {
    this.clearCardSummaryClicked.emit(event);
  }

  onCardNumberChange(value: string): void {
    this.cardNumberChange.emit(value);
  }
}
