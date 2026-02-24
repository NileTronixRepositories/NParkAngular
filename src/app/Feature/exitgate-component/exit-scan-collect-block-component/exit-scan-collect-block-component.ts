import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { TicketDetailsDto, CalculateSalaryResponse } from '../../../Domain/tickets/tickets.model';
import { SanctionDto } from '../../../Domain/Sanction/sanction.models';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exit-scan-collect-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './exit-scan-collect-block-component.html',
  styleUrl: './exit-scan-collect-block-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExitScanCollectBlockComponent {
  // ========== State flags ==========
  @Input() scanningQR = false;
  @Input() scanning = false;
  @Input() readingCard = false;
  @Input() searchingManual = false;

  // ========== Scan buffer (QR) ==========
  @Input() scanBuffer = '';
  @Output() scanBufferChange = new EventEmitter<string>();

  // ========== Manual input (QR / card) ==========
  @Input() manualInput = '';
  @Output() manualInputChange = new EventEmitter<string>();

  // ========== Ticket & salary ==========
  @Input() scannedTicket: TicketDetailsDto | null = null;
  @Input() salarySummary: CalculateSalaryResponse | null = null;

  // ========== Exit ticket actions ==========
  @Input() addingExitTicket = false;
  @Input() exitTicketAdded = false;

  @Input() collecting = false;
  @Input() exitProcessing = false;
  @Input() collectingCashier = false;
  @Input() cashierConfirming = false;

  // ========== Sanctions ==========
  @Input() allSanctions: SanctionDto[] = [];
  @Input() selectedSanctionIds: string[] = [];
  @Output() toggleSanction = new EventEmitter<string>();

  // ========== Outputs: actions ==========
  @Output() scanQrClick = new EventEmitter<void>();
  @Output() readCardClick = new EventEmitter<void>();
  @Output() submitQrClick = new EventEmitter<void>();
  @Output() manualSearchClick = new EventEmitter<void>();
  @Output() addExitTicketClick = new EventEmitter<TicketDetailsDto>();
  @Output() confirmExitClick = new EventEmitter<void>();
  @Output() printSummaryClick = new EventEmitter<void>();
  @Output() allowExitWithoutCollectClick = new EventEmitter<void>();

  // (موجودة عشان تفضل الـ API متوافق مع الـ parent حتى لو مش مستخدمة في الـ template)
  @Output() collectCashierClick = new EventEmitter<void>();
  @Output() confirmCashierClicked = new EventEmitter<void>();

  @ViewChild('scanBox') scanBox?: ElementRef<HTMLInputElement>;

  // ========== Getters مريحة للـ Template ==========
  get canSubmitQr(): boolean {
    const value = this.scanBuffer?.trim();
    return !!value && !this.scanning && !this.searchingManual;
  }

  get canSearchManual(): boolean {
    const value = this.manualInput?.trim();
    return !!value && !this.searchingManual;
  }

  get hasSummary(): boolean {
    return !!this.salarySummary;
  }

  get hasScannedTicket(): boolean {
    return !!this.scannedTicket;
  }

  get showEmptyState(): boolean {
    return !this.hasScannedTicket && !this.scanning && !this.hasSummary;
  }

  get disableConfirmAndCollect(): boolean {
    return (
      this.collecting ||
      !this.salarySummary ||
      !this.salarySummary.isExitValid ||
      this.salarySummary.isCollectByCashier
    );
  }

  get disableCashierConfirm(): boolean {
    return this.cashierConfirming || !this.salarySummary || this.salarySummary.isCollectByCashier;
  }

  get displayTotal(): number {
    if (!this.salarySummary) return 0;
    const base = this.salarySummary.totalSalary || 0;
    const sanctionsSum = this.allSanctions
      .filter((s) => this.isSanctionSelected(s.id))
      .reduce((sum, s) => sum + s.amount, 0);
    return base + sanctionsSum;
  }

  // ========== Handlers ==========
  onScanQrClick(): void {
    this.scanQrClick.emit();

    // بعد ما الـ parent يجهّز الـ scan، نركّز في الـ input
    setTimeout(() => {
      const el = this.scanBox?.nativeElement;
      if (el) {
        el.focus();
        this.selectAll(el);
      }
    }, 0);
  }

  onReadCardClick(): void {
    this.readCardClick.emit();
  }

  onSubmitQrClick(): void {
    if (!this.canSubmitQr) return;
    this.submitQrClick.emit();
  }

  onManualSearchClick(): void {
    if (!this.canSearchManual) return;
    this.manualSearchClick.emit();
  }

  onAddExitTicketClick(t: TicketDetailsDto): void {
    this.addExitTicketClick.emit(t);
  }

  onConfirmExitClick(): void {
    this.confirmExitClick.emit();
  }

  onPrintSummaryClick(): void {
    this.printSummaryClick.emit();
  }

  onAllowExitWithoutCollectClick(): void {
    this.allowExitWithoutCollectClick.emit();
  }

  onCollectCashierClick(): void {
    this.collectCashierClick.emit();
  }

  onConfirmCashier(): void {
    this.confirmCashierClicked.emit();
  }

  // ========== Sanction helpers ==========
  isSanctionSelected(id: string): boolean {
    return this.selectedSanctionIds.includes(id);
  }

  onToggleSanction(id: string): void {
    this.toggleSanction.emit(id);
  }

  // ========== ngModel bridges ==========
  onScanBufferChange(value: string): void {
    this.scanBufferChange.emit(value);
  }

  onManualInputChange(value: string): void {
    this.manualInputChange.emit(value);
  }

  onScanEnter(): void {
    if (!this.canSubmitQr) return;
    this.submitQrClick.emit();
  }

  selectAll(el: HTMLInputElement): void {
    setTimeout(() => el.select(), 0);
  }
}
