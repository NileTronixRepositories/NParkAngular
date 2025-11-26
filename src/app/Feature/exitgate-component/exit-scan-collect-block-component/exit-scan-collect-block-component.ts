import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { TicketDetailsDto, CalculateSalaryResponse } from '../../../Domain/tickets/tickets.model';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-exit-scan-collect-block-component',
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './exit-scan-collect-block-component.html',
  styleUrl: './exit-scan-collect-block-component.css',
})
export class ExitScanCollectBlockComponent {
  @Input() scanningQR = false;
  @Input() scanning = false;
  @Input() readingCard = false;

  @Input() scanBuffer: string = '';
  @Output() scanBufferChange = new EventEmitter<string>();

  @Input() manualInput: string = '';
  @Output() manualInputChange = new EventEmitter<string>();

  @Input() searchingManual = false;

  @Input() scannedTicket: TicketDetailsDto | null = null;
  @Input() salarySummary: CalculateSalaryResponse | null = null;

  @Input() addingExitTicket = false;
  @Input() exitTicketAdded = false;

  @Input() collecting = false;
  @Input() exitProcessing = false;
  @Input() collectingCashier = false;
  @Input() cashierConfirming = false;

  @Output() scanQrClick = new EventEmitter<void>();
  @Output() readCardClick = new EventEmitter<void>();
  @Output() submitQrClick = new EventEmitter<void>();
  @Output() manualSearchClick = new EventEmitter<void>();
  @Output() addExitTicketClick = new EventEmitter<TicketDetailsDto>();
  @Output() confirmExitClick = new EventEmitter<void>();
  @Output() printSummaryClick = new EventEmitter<void>();
  @Output() allowExitWithoutCollectClick = new EventEmitter<void>();
  @Output() collectCashierClick = new EventEmitter<void>();
  @Output() confirmCashierClicked = new EventEmitter<void>();

  @ViewChild('scanBox') scanBox?: ElementRef<HTMLInputElement>;

  onScanQrClick() {
    this.scanQrClick.emit();

    setTimeout(() => {
      const el = this.scanBox?.nativeElement;
      if (el) {
        el.focus();
        this.selectAll(el);
      }
    }, 0);
  }

  onReadCardClick() {
    this.readCardClick.emit();
  }

  onSubmitQrClick() {
    this.submitQrClick.emit();
  }

  onManualSearchClick() {
    this.manualSearchClick.emit();
  }

  onAddExitTicketClick(t: TicketDetailsDto) {
    this.addExitTicketClick.emit(t);
  }

  onConfirmExitClick() {
    this.confirmExitClick.emit();
  }

  onPrintSummaryClick() {
    this.printSummaryClick.emit();
  }

  onAllowExitWithoutCollectClick() {
    this.allowExitWithoutCollectClick.emit();
  }

  onCollectCashierClick() {
    this.collectCashierClick.emit();
  }

  onConfirmCashier() {
    this.confirmCashierClicked.emit();
  }

  onScanBufferChange(value: string) {
    this.scanBufferChange.emit(value);
  }

  onManualInputChange(value: string) {
    this.manualInputChange.emit(value);
  }

  onScanEnter() {
    this.submitQrClick.emit();
  }

  selectAll(el: HTMLInputElement) {
    setTimeout(() => el.select(), 0);
  }
}
