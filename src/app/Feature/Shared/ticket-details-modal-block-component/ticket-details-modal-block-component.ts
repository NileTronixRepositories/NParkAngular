import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketDto } from '../../../Domain/tickets/tickets.model';
import { LanguageService, AppLang } from '../../../Services/i18n/language-service';

@Component({
  selector: 'app-ticket-details-modal-block-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ticket-details-modal-block-component.html',
  styleUrl: './ticket-details-modal-block-component.css',
})
export class TicketDetailsModalBlockComponent {
  private readonly i18n = inject(LanguageService);

  @Input() show = false;
  @Input() ticket: TicketDto | null = null;
  @Output() close = new EventEmitter<void>();

  get isRTL(): boolean {
    return this.i18n.isRTL();
  }

  private readonly dict: Record<AppLang, Record<string, string>> = {
    ar: {
      ticket_details: 'تفاصيل التذكرة',
      ticket_number: 'رقم التذكرة',
      time: 'الوقت',
      price: 'السعر',
      plate: 'اللوحة',
      gate: 'البوابة',
      customerName: 'اسم العميل',
      cardNumber: 'رقم الكارت',
      phone: 'رقم الهاتف',
      additional_info: 'معلومات إضافية',
      close: 'إغلاق',
      collected: 'مُحصّلة',
      not_collected: 'غير مُحصّلة',
      currency: 'ج.م',
    },
    en: {
      ticket_details: 'Ticket Details',
      ticket_number: 'Ticket Number',
      time: 'Time',
      price: 'Price',
      plate: 'Plate',
      gate: 'Gate',
      customerName: 'Customer Name',
      cardNumber: 'Card Number',
      phone: 'Phone',
      additional_info: 'Additional Info',
      close: 'Close',
      collected: 'Collected',
      not_collected: 'Not collected',
      currency: 'EGP',
    },
  };

  t(k: string): string {
    return this.dict[this.i18n.current]?.[k] ?? k;
  }

  onClose(): void {
    this.close.emit();
  }
}
