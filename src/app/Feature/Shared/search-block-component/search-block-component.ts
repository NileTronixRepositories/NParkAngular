import { Component, EventEmitter, Input, Output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { TicketDto } from '../../../Domain/tickets/tickets.model';

@Component({
  selector: 'app-search-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-block-component.html',
  styleUrl: './search-block-component.css',
})
export class SearchBlockComponent implements OnDestroy {
  @Input() placeholder = 'ابحث برقم التذكرة، اللوحة، أو الكارت';
  @Input() searching = false;
  @Input() results: TicketDto[] = [];

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
