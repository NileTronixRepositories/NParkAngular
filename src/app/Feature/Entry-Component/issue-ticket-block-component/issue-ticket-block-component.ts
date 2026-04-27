import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ParkingCardSummaryDto } from '../../../Domain/tickets/tickets.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type LprMembershipStatus = 'idle' | 'checking' | 'subscriber' | 'non-subscriber' | 'error';
type CardMembershipStatus = 'idle' | 'checking' | 'member' | 'not-member' | 'error';

@Component({
  selector: 'app-issue-ticket-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './issue-ticket-block-component.html',
  styleUrls: ['./issue-ticket-block-component.css'],
})
export class IssueTicketBlockComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() isRTL = false;

  @Input() cardNumber: string = '';
  @Input() cardSummary: ParkingCardSummaryDto | null = null;
  @Input() adding = false;
  @Input() readingCard = false;
  @Input() lprVehicleNumber: string | null = null;
  @Input() lprMembershipStatus: LprMembershipStatus = 'idle';
  @Input() lprCardNumber: string | null = null;
  @Input() selectedPricingSchemaId = '';
  @Input() pricingSchemas: { id: string; name: string; description?: string | null }[] = [];
  @Input() pricingSchemasLoading = false;
  @Input() hasVehicleImages = false;
  @Input() cardMembershipStatus: CardMembershipStatus = 'idle';

  @Input() currentIssuedQr: string | null = null;
  @Input() currentIssuedQrType: 'image' | 'text' | null = null;
  @Input() printQrEnabled = true;
  @Input() printReceiptEnabled = true;

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
  @Output() selectedPricingSchemaIdChange = new EventEmitter<string>();
  @Output() printQrEnabledChange = new EventEmitter<boolean>();
  @Output() printReceiptEnabledChange = new EventEmitter<boolean>();

  private lastCardKeyAt = 0;

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

  onCardKeydown(event: KeyboardEvent): void {
    if (this.adding || this.readingCard) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;

    const input = event.target as HTMLInputElement | null;
    if (this.shouldReplaceExistingCard(input)) {
      this.cardNumber = '';
      if (input) {
        input.value = '';
      }
      this.cardNumberChange.emit('');
    }

    this.lastCardKeyAt = Date.now();
  }

  onCardFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement | null;
    setTimeout(() => input?.select(), 0);
  }

  onPricingSchemaChange(value: string): void {
    this.selectedPricingSchemaIdChange.emit(value);
  }

  onPrintQrChange(value: boolean): void {
    this.printQrEnabledChange.emit(value);
  }

  onPrintReceiptChange(value: boolean): void {
    this.printReceiptEnabledChange.emit(value);
  }

  private shouldReplaceExistingCard(input: HTMLInputElement | null): boolean {
    const hasValue = !!this.cardNumber?.trim();
    if (!input || !hasValue) return false;

    const allSelected = input.selectionStart === 0 && input.selectionEnd === input.value.length;

    return !allSelected && Date.now() - this.lastCardKeyAt > 700;
  }
}
