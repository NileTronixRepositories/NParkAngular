import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ScanTicketResponse, CalculateSalaryResponse } from '../../../Domain/tickets/tickets.model';
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
export class ExitScanCollectBlockComponent implements OnChanges {
  // ========== State flags ==========
  @Input() scanningQR = false;
  @Input() scanning = false;
  @Input() readingCard = false;
  @Input() searchingManual = false;

  // ========== Universal input ==========
  @Input() universalInput = '';
  @Output() universalInputChange = new EventEmitter<string>();

  // ========== Ticket & salary ==========
  @Input() scannedTicket: ScanTicketResponse | null = null;
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
  @Output() submitInputClick = new EventEmitter<void>();
  @Output() addExitTicketClick = new EventEmitter<ScanTicketResponse>();
  @Output() confirmExitClick = new EventEmitter<void>();
  @Output() calculateSalaryClick = new EventEmitter<void>();
  @Output() printSummaryClick = new EventEmitter<void>();
  @Output() allowExitWithoutCollectClick = new EventEmitter<void>();

  @Output() collectCashierClick = new EventEmitter<void>();
  @Output() confirmCashierClicked = new EventEmitter<void>();

  @ViewChild('uniInput') uniInput?: ElementRef<HTMLInputElement>;

  // ========== Getters Template ==========
  get canSubmit(): boolean {
    const value = this.universalInput?.trim();
    return !!value && !this.scanning && !this.searchingManual;
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

  get disableExitTicket(): boolean {
    return (
      this.collecting ||
      !this.salarySummary ||
      !this.salarySummary.isExitValid ||
      this.exitTicketAdded
    );
  }

  get disableCashierConfirm(): boolean {
    return this.cashierConfirming || !this.salarySummary || this.salarySummary.isCollectByCashier;
  }

  get displayTotal(): number {
    return this.salarySummary?.totalSalary || 0;
  }

  // ========== Handlers ==========
  onScanButtonClick(): void {
    this.scanQrClick.emit();
    this.focusInput();
  }

  onReadCardClick(): void {
    this.readCardClick.emit();
  }

  private focusInput(): void {
    setTimeout(() => {
      const el = this.uniInput?.nativeElement;
      if (el) {
        el.focus();
        el.select();
      }
    }, 0);
  }

  onAddExitTicketClick(t: ScanTicketResponse): void {
    this.addExitTicketClick.emit(t);
  }

  onCalculateSalaryClick(): void {
    this.calculateSalaryClick.emit();
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

  // ========== Handlers for Universal Input ==========
  onInputChange(value: string): void {
    this.universalInputChange.emit(value);
  }

  onEnterPressed(): void {
    if (!this.canSubmit) return;
    this.submitInputClick.emit();
    this.focusInput();
  }

  selectAll(el: HTMLInputElement): void {
    setTimeout(() => el.select(), 0);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const loadingChange = changes['searchingManual'];
    if (loadingChange && loadingChange.previousValue === true && loadingChange.currentValue === false) {
      this.focusInput();
    }
  }
}
