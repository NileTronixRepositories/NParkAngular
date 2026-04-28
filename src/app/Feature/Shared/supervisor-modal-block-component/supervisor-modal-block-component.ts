import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../Services/i18n/language-service';
import { CollectDailyTicketsResponse } from '../../../Domain/tickets/tickets.model';
import { CollectExceedTransactionsResponse } from '../../../Domain/TicketExceedTransaction/ticket-exceed-transaction.models';

@Component({
  selector: 'app-supervisor-modal-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervisor-modal-block-component.html',
  styleUrl: './supervisor-modal-block-component.css',
})
export class SupervisorModalBlockComponent {
  private readonly i18n = inject(LanguageService);

  @Input() show = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() username = '';
  @Input() password = '';
  @Input() summary: CollectDailyTicketsResponse | null = null;
  @Input() exceedSummary: CollectExceedTransactionsResponse | null = null;
  @Input() readyToCollect = false;

  @Output() usernameChange = new EventEmitter<string>();
  @Output() passwordChange = new EventEmitter<string>();
  @Output() submit = new EventEmitter<void>();
  @Output() collect = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  private readonly dict: Record<string, Record<string, string>> = {
    ar: {
      supervisor_login: 'دخول المشرف',
      pleaseLoginToProceed: 'يرجى تسجيل الدخول كمشرف للمتابعة والتحصيل.',
      supervisor_username: 'اسم مستخدم المشرف',
      supervisor_password: 'كلمة مرور المشرف',
      confirm: 'تأكيد',
      cancel: 'إلغاء',
      logout: 'تسجيل خروج',
      collection_summary: 'ملخص التحصيل',
      total_amount: 'إجمالي المبلغ',
      total_tickets: 'عدد التذاكر',
      ticket: 'التذكرة',
      ticket_id: 'معرف التذكرة',
      source: 'المصدر',
      start_date: 'وقت الدخول',
      end_date: 'وقت الخروج',
      vehicle_number: 'رقم المركبة',
      card_number: 'رقم الكارت',
      subscriber: 'مشترك',
      exit_gate: 'بوابة الخروج',
      yes: 'نعم',
      no: 'لا',
      amount: 'المبلغ',
      total_exceed: 'إجمالي الغرامات',
      total_transactions: 'عدد المعاملات',
      transaction: 'المعاملة',
      created_at: 'تاريخ المعاملة',
      collected_at: 'وقت التحصيل',
      ticket_price: 'سعر التذكرة',
      old_exceed: 'غرامات سابقة',
      total_after_exceed: 'الإجمالي بعد الغرامة',
      ready_to_collect: 'جاهز للتحصيل',
      collect_now: 'تحصيل',
      currency: 'ج.م',
    },
    en: {
      supervisor_login: 'Supervisor Login',
      pleaseLoginToProceed: 'Please log in as a supervisor to proceed with collection.',
      supervisor_username: 'Supervisor Username',
      supervisor_password: 'Supervisor Password',
      confirm: 'Confirm',
      cancel: 'Cancel',
      logout: 'Logout',
      collection_summary: 'Collection summary',
      total_amount: 'Total amount',
      total_tickets: 'Total tickets',
      ticket: 'Ticket',
      ticket_id: 'Ticket ID',
      source: 'Source',
      start_date: 'Start date',
      end_date: 'End date',
      vehicle_number: 'Vehicle number',
      card_number: 'Card number',
      subscriber: 'Subscriber',
      exit_gate: 'Exit gate',
      yes: 'Yes',
      no: 'No',
      amount: 'Amount',
      total_exceed: 'Total exceed',
      total_transactions: 'Transactions',
      transaction: 'Transaction',
      created_at: 'Created at',
      collected_at: 'Collected at',
      ticket_price: 'Ticket price',
      old_exceed: 'Old exceed',
      total_after_exceed: 'Total after exceed',
      ready_to_collect: 'Ready to collect',
      collect_now: 'Collect',
      currency: 'EGP',
    },
  };

  t(key: string): string {
    return this.dict[this.i18n.current]?.[key] ?? this.dict['en']?.[key] ?? key;
  }

  onSubmit(): void {
    this.submit.emit();
  }

  onCollect(): void {
    this.collect.emit();
  }

  onClose(): void {
    if (!this.loading) {
      this.close.emit();
    }
  }

  onUsernameChange(val: string): void {
    this.usernameChange.emit(val);
  }

  onPasswordChange(val: string): void {
    this.passwordChange.emit(val);
  }
}
