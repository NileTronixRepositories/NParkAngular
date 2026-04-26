import {
  Component,
  Inject,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { GateDevicePeripheral } from '../../../Domain/Auth/auth.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { SafePipe } from '../../../Pipes/safe.pipe';
import { I18N_DICT, I18nDict } from '../../../Services/i18n/i18n.tokens';
import { LanguageService } from '../../../Services/i18n/language-service';
import { TicketsServices } from '../../../Services/Tickets/tickets-services';
import { ToastServices } from '../../../Services/Toster/toast-services';
import { TicketDto } from '../../../Domain/tickets/tickets.model';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-exit-gate-devices-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe, SafePipe],
  templateUrl: './exit-gate-devices-block-component.html',
  styleUrl: './exit-gate-devices-block-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExitGateDevicesBlockComponent {
  @Input() gatePeripheral: GateDevicePeripheral | null = null;
  @Input() scannedFile: {
    name: string;
    url: string;
    safeUrl?: any;
    type: string;
    bytes: any;
  } | null = null;
  @Output() ticketSelected = new EventEmitter<TicketDto>();
  @Output() searchTicketNumber = new EventEmitter<string>();
  @Output() vehicleDetected = new EventEmitter<string>();

  // Manual plate capture
  manualPlate = '';
  manualPlateSubmitting = false;

  // Ticket number search
  ticketNumber = '';
  searchingTicket = false;
  searchResults: TicketDto[] = [];
  showResults = false;

  private searchSubject = new Subject<string>();

  constructor(
    public lang: LanguageService,
    @Inject(I18N_DICT) private readonly dict: I18nDict,
    private readonly ticketsSvc: TicketsServices,
    private readonly toast: ToastServices,
    private readonly cdr: ChangeDetectorRef,
  ) {
    // Debounce search like Quick Search
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((query) => {
      this.performSearch(query);
    });
  }

  t(key: string): string {
    return this.dict[this.lang.current]?.[key] ?? key;
  }

  get canSubmitManualPlate(): boolean {
    return !!this.manualPlate?.trim() && !this.manualPlateSubmitting;
  }

  get canSearchTicket(): boolean {
    return !!this.ticketNumber?.trim() && !this.searchingTicket;
  }

  onManualPlateChange(value: string): void {
    this.manualPlate = this.normalizePlate(value);
    this.cdr.markForCheck();
  }

  submitManualPlate(): void {
    const plate = this.normalizePlate(this.manualPlate);
    if (!plate || this.manualPlateSubmitting) return;

    this.manualPlateSubmitting = true;
    this.vehicleDetected.emit(plate);
    this.manualPlate = '';
    this.manualPlateSubmitting = false;
    this.cdr.markForCheck();
  }

  onSearchInput(value: string): void {
    this.ticketNumber = value;
    this.searchSubject.next(value);
    this.showResults = !!value.trim();
    this.cdr.markForCheck();
  }

  searchTicketByNumber(): void {
    const number = this.ticketNumber?.trim();
    if (!number) return;

    this.searchSubject.next(number);
  }

  private performSearch(query: string): void {
    if (!query?.trim()) {
      this.searchResults = [];
      this.showResults = false;
      this.cdr.markForCheck();
      return;
    }

    this.searchingTicket = true;
    this.cdr.markForCheck();

    this.ticketsSvc.searchTickets(query).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.showResults = results.length > 0;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('searchTickets error', err);
        this.toast.fromProblem(err);
        this.searchResults = [];
        this.showResults = false;
        this.cdr.markForCheck();
      },
      complete: () => {
        this.searchingTicket = false;
        this.cdr.markForCheck();
      },
    });
  }

  selectResult(ticket: TicketDto): void {
    const identifier = ticket.ticketNumber || String(ticket.id);
    this.ticketSelected.emit(ticket);
    this.searchTicketNumber.emit(identifier);
    this.ticketNumber = '';
    this.searchResults = [];
    this.showResults = false;
    this.cdr.markForCheck();
  }

  clearSearch(): void {
    this.ticketNumber = '';
    this.searchResults = [];
    this.showResults = false;
    this.cdr.markForCheck();
  }

  trackByTicketNumber(_index: number, item: TicketDto): string {
    return (item.ticketNumber ?? item.id ?? _index).toString();
  }

  private normalizePlate(value: string): string {
    const compact = String(value ?? '')
      .replace(/[\s\u00a0\u2000-\u200f\u2028-\u202f\u205f\u3000]+/g, '')
      .trim()
      .toUpperCase();

    const letters: string[] = [];
    const suffix: string[] = [];

    for (const char of Array.from(compact)) {
      if (this.isPlateLetter(char) && suffix.length === 0) {
        letters.push(char);
      } else {
        suffix.push(char);
      }
    }

    return [letters.join(' '), suffix.join('')].filter(Boolean).join(' ');
  }

  private isPlateLetter(char: string): boolean {
    return /^[A-Z\u0600-\u06FF]$/.test(char);
  }
}
