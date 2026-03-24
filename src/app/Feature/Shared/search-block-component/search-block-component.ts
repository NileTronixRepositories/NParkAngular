import { Component, EventEmitter, Input, Output, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { TicketDto } from '../../../Domain/tickets/tickets.model';
import { LanguageService, AppLang } from '../../../Services/i18n/language-service';

@Component({
  selector: 'app-search-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-block-component.html',
  styleUrl: './search-block-component.css',
})
export class SearchBlockComponent implements OnDestroy {
  // ===== i18n =====
  readonly i18n = inject(LanguageService);
  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      quick_search: 'بحث سريع',
      search_subtitle: 'ابحث برقم التذكرة، اللوحة، أو الكارت',
      searching: 'جاري البحث...',
      collected: 'مُحصّلة',
      not_collected: 'غير مُحصّلة',
      no_results: 'لا توجد نتائج',
      currency: 'ج.م',
    },
    en: {
      quick_search: 'Quick Search',
      search_subtitle: 'Search by ticket, plate, or card number',
      searching: 'Searching...',
      collected: 'Collected',
      not_collected: 'Not collected',
      no_results: 'No results',
      currency: 'EGP',
    },
  };
  t = (k: string) => this.dict[this.i18n.current]?.[k] ?? k;

  @Input() placeholder = '';
  @Input() searching = false;
  @Input() results: TicketDto[] = [];
  @Input() isCompact = false;

  @Output() searchQuery = new EventEmitter<string>();
  @Output() resultSelected = new EventEmitter<TicketDto>();

  searchText = '';
  showResults = false;

  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((query) => {
      this.searchQuery.emit(query);
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  onSearchInput(value: string): void {
    this.searchText = value;
    this.searchSubject.next(value);
    this.showResults = !!value.trim();
  }

  onInputFocus(): void {
    if (this.searchText.trim()) {
      this.showResults = true;
    }
  }

  selectResult(ticket: TicketDto): void {
    this.resultSelected.emit(ticket);
  }

  clearSearch(): void {
    this.searchText = '';
    this.showResults = false;
    this.searchQuery.emit('');
  }

  trackByTicketNumber(_index: number, item: TicketDto): string {
    return (item.ticketNumber ?? item.id ?? _index).toString();
  }
}
