import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SanctionDto } from '../../../Domain/Sanction/sanction.models';
import { CreateTicketExceedTransactionResponse } from '../../../Domain/TicketExceedTransaction/ticket-exceed-transaction.models';
import {
  OrderSort,
  SearchTicketRequest,
  SearchTicketResponse,
} from '../../../Domain/tickets/tickets.model';
import { ErrorExtractorService } from '../../../Services/Shared/error-extractor.service';
import { TicketsServices } from '../../../Services/Tickets/tickets-services';
import { ToastServices } from '../../../Services/Toster/toast-services';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-exit-sanctions-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './exit-sanctions-block-component.html',
  styleUrl: './exit-sanctions-block-component.css',
})
export class ExitSanctionsBlockComponent implements OnInit, OnDestroy {
  private readonly ticketsSvc = inject(TicketsServices);
  private readonly toast = inject(ToastServices);
  private readonly errorExtractor = inject(ErrorExtractorService);
  private readonly searchTextChanges = new Subject<string>();
  private readonly subscriptions = new Subscription();

  @Input() allSanctions: SanctionDto[] = [];
  @Input() selectedSanctionIds: string[] = [];
  @Input() selectedTicket: SearchTicketResponse | null = null;
  @Input() registeringExceed = false;
  @Input() isExceedRegistered = false;
  @Input() isExceedAlreadyExists = false;
  @Input() exceedAmount = 0;
  @Input() totalPriceAfterExceed = 0;
  @Input() summary: CreateTicketExceedTransactionResponse | null = null;
  @Input() exitLoading = false;

  @Output() ticketSelected = new EventEmitter<SearchTicketResponse>();
  @Output() toggleSanction = new EventEmitter<string>();
  @Output() registerExceed = new EventEmitter<void>();
  @Output() exitTicket = new EventEmitter<void>();

  searchText = '';
  startDate = '';
  orderSort: OrderSort = 'Newest';
  pageNumber = 1;
  pageSize = 10;
  tickets: SearchTicketResponse[] = [];
  isLoading = false;

  get selectedSanctions(): SanctionDto[] {
    const selected = new Set(this.selectedSanctionIds);
    return this.allSanctions.filter((sanction) => selected.has(sanction.id));
  }

  get selectedSanctionsTotal(): number {
    return this.selectedSanctions.reduce((total, sanction) => total + Number(sanction.amount || 0), 0);
  }

  get disableRegisterExceed(): boolean {
    return (
      this.registeringExceed ||
      this.isExceedRegistered ||
      this.isExceedAlreadyExists ||
      !this.selectedTicket ||
      this.selectedSanctionIds.length === 0
    );
  }

  get showingDateLabel(): string | null {
    return this.startDate ? `Showing tickets from ${this.startDate} until today` : null;
  }

  get canExit(): boolean {
    return !!this.selectedTicket && this.isExceedRegistered && !this.exitLoading;
  }

  get summaryCreatedAt(): string | null {
    return this.summary?.createdAt ?? null;
  }

  ngOnInit(): void {
    this.subscriptions.add(
      this.searchTextChanges.pipe(debounceTime(400), distinctUntilChanged()).subscribe((value) => {
        this.searchText = value;
        this.pageNumber = 1;
        this.loadTickets();
      }),
    );

    this.loadTickets();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSearchTextChange(value: string): void {
    const normalized = this.normalizeTicketReadText(value);
    this.searchText = normalized;
    this.searchTextChanges.next(normalized);
  }

  onStartDateChange(value: string): void {
    this.startDate = value;
    this.pageNumber = 1;
    this.loadTickets();
  }

  onSortChange(value: OrderSort): void {
    this.orderSort = value;
    this.pageNumber = 1;
    this.loadTickets();
  }

  onPageSizeChange(value: string): void {
    this.pageSize = Number(value) || 10;
    this.pageNumber = 1;
    this.loadTickets();
  }

  nextPage(): void {
    this.pageNumber++;
    this.loadTickets();
  }

  prevPage(): void {
    if (this.pageNumber <= 1) return;
    this.pageNumber--;
    this.loadTickets();
  }

  selectTicket(ticket: SearchTicketResponse): void {
    this.ticketSelected.emit(ticket);
  }

  isSelectedTicket(ticket: SearchTicketResponse): boolean {
    return this.selectedTicket?.id === ticket.id;
  }

  getTicketType(ticket: SearchTicketResponse): string {
    return ticket.isSubscribe ? 'Subscriber' : 'Normal';
  }

  isSanctionSelected(id: string): boolean {
    return this.selectedSanctionIds.includes(id);
  }

  onToggleSanction(id: string): void {
    if (!id || this.registeringExceed || this.isExceedRegistered || this.isExceedAlreadyExists) {
      return;
    }

    this.toggleSanction.emit(id);
  }

  onRegisterExceed(): void {
    if (this.disableRegisterExceed) return;
    this.registerExceed.emit();
  }

  onExitTicket(): void {
    if (!this.canExit) return;
    this.exitTicket.emit();
  }

  private loadTickets(): void {
    const request: SearchTicketRequest = {
      searchText: this.searchText,
      startDate: this.startDate || null,
      orderSort: this.orderSort,
      pageNumber: this.pageNumber,
      pageSize: this.pageSize,
    };

    this.isLoading = true;
    this.ticketsSvc.searchTicketLookup(request).subscribe({
      next: (response) => {
        this.tickets = response;
      },
      error: (err) => {
        const message = this.errorExtractor.extractErrorMessage(err, 'Failed to search tickets.');
        this.toast.error(message);
        this.tickets = [];
      },
      complete: () => {
        this.isLoading = false;
      },
    });
  }

  private normalizeTicketReadText(value: string): string {
    let text = String(value ?? '').replace(/[\r\n]+/g, '').trim();

    if (text.startsWith('=')) {
      text = text.slice(1).trim();
    }

    text = text.replace(/^[\s"'`“”«»]+/, '').replace(/[\s"'`“”«»]+$/, '').trim();

    let changed = true;
    while (changed && text.length >= 2) {
      changed = false;
      const first = text.charAt(0);
      const last = text.charAt(text.length - 1);
      if (
        (first === '"' && last === '"') ||
        (first === "'" && last === "'") ||
        (first === '`' && last === '`') ||
        (first === '“' && last === '”') ||
        (first === '«' && last === '»')
      ) {
        text = text.slice(1, -1).trim();
        changed = true;
      }
    }

    return text;
  }
}
