import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ParkingCardSummaryDto } from '../../../Domain/tickets/tickets.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type LprMembershipStatus = 'idle' | 'checking' | 'subscriber' | 'non-subscriber' | 'error';

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
  @Input() lprVehicleNumber: string | null = null;
  @Input() lprMembershipStatus: LprMembershipStatus = 'idle';
  @Input() lprCardNumber: string | null = null;
  @Input() selectedPricingSchemaId = '';
  @Input() pricingSchemas: { id: string; name: string; description?: string | null }[] = [];
  @Input() pricingSchemasLoading = false;
  @Input() hasVehicleImages = false;

  @Input() currentIssuedQr: string | null = null;
  @Input() currentIssuedQrType: 'image' | 'text' | null = null;

  @Input() lastIssuedTicketId: string | number | null = null;
  @Input() lastIssuedTicketInfo: string | null = null;
  @Input() lastIssuedVehicleNumber: string | null = null;
  @Input() lastIssuedPrice: number | null = null;
  @Input() lastIssuedCreatedAt: string | null = null;
  @Input() lastIssuedCollected: boolean = false;
  @Input() cashierConfirming: boolean = false;

  @Output() createTicketClicked = new EventEmitter<void>();
  @Output() confirmCashierClicked = new EventEmitter<void>();
  @Output() clearCardSummaryClicked = new EventEmitter<Event>();
  @Output() selectedPricingSchemaIdChange = new EventEmitter<string>();

  get headerIdentifier(): string {
    return (
      this.lprVehicleNumber?.trim() ||
      this.lprCardNumber?.trim() ||
      this.cardSummary?.cardNumber?.trim() ||
      this.cardNumber?.trim() ||
      ''
    );
  }

  get headerIdentifierLabel(): string {
    if (this.lprVehicleNumber?.trim()) return this.t('vehicle_number');
    return this.t('cardNumber');
  }

  get shouldShowMissingLprVehicleHint(): boolean {
    return false;
  }

  qrDataUrl(text: string): string {
    return `data:text/plain,${encodeURIComponent(text ?? '')}`;
  }

  onCreateTicket(): void {
    if (this.adding) return;
    this.createTicketClicked.emit();
  }

  onConfirmCashier(): void {
    if (!this.lastIssuedTicketId || this.lastIssuedCollected || this.cashierConfirming) return;
    this.confirmCashierClicked.emit();
  }

  onClearCardSummary(event: Event): void {
    this.clearCardSummaryClicked.emit(event);
  }

  onPricingSchemaChange(value: string): void {
    this.selectedPricingSchemaIdChange.emit(value);
  }
}
