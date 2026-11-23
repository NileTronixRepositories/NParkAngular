import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { UserDto } from '../../Domain/Users/user.model';
import {
  EntranceCashierInsideTicket,
  EntranceCashierOutsideTicket,
  EntranceCashierTicketsReportResponse,
  TicketReportAttachment,
} from '../../Domain/Reports/reports.model';
import { ReportsService } from '../../Services/Reports/reports.service';
import { UsersServices } from '../../Services/Users/users-services';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { ToastServices } from '../../Services/Toster/toast-services';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';
import { environment } from '../../Shared/environment/environment';

type ReportTab = 'inside' | 'outside';
type ReportTicket = EntranceCashierInsideTicket | EntranceCashierOutsideTicket;

@Component({
  selector: 'app-entrance-cashier-tickets-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entrance-cashier-tickets-report.html',
  styleUrl: './entrance-cashier-tickets-report.css',
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          title: 'تقرير تذاكر كاشير الدخول',
          subtitle: 'عرض التذاكر التي تم إدخالها بواسطة كاشير الدخول في فترة محددة',
          filters: 'الفلاتر',
          entranceCashier: 'كاشير الدخول',
          selectCashier: 'اختر كاشير الدخول',
          fromDate: 'من تاريخ',
          toDate: 'إلى تاريخ',
          search: 'بحث',
          loading: 'جاري التحميل...',
          cashierInfo: 'بيانات الكاشير',
          cashierName: 'اسم الكاشير',
          username: 'اسم المستخدم',
          role: 'الدور',
          from: 'من',
          to: 'إلى',
          totalEnteredTicketsCount: 'إجمالي التذاكر المدخلة',
          insideParkTicketsCount: 'تذاكر داخل الجراج',
          outsideParkTicketsCount: 'تذاكر خرجت',
          totalExceededTicketsCount: 'إجمالي التذاكر المتجاوزة',
          insideParkExceededTicketsCount: 'متجاوزة داخل الجراج',
          outsideParkExceededTicketsCount: 'متجاوزة خرجت',
          insideParkTotalBasePrice: 'التحصيلات داخل الجراج',
          outsideParkTotalBasePrice: 'التحصيلات خارج الجراج',
          totalBasePrice: 'إجمالي التحصيلات',
          insideParkTotalExceedPrice: 'تجاوز داخل الجراج',
          outsideParkTotalExceedPrice: 'تجاوز خارج الجراج',
          totalExceedPrice: 'إجمالي الغرامات',
          insideParkTotalAmount: 'إجمالي داخل الجراج',
          outsideParkTotalAmount: 'إجمالي خارج الجراج',
          totalAmount: 'الإجمالي الكلي',
          counts: 'ملخص الأعداد',
          moneyTotals: 'ملخص الإجماليات المالية',
          insideTickets: 'تذاكر داخل الجراج',
          outsideTickets: 'تذاكر خرجت',
          ticketCode: 'كود التذكرة',
          startDate: 'تاريخ الدخول',
          endDate: 'تاريخ الخروج',
          vehicleNumber: 'رقم المركبة',
          price: 'السعر',
          exceedPrice: 'قيمة الغرامات',
          totalPrice: 'الإجمالي',
          subscriber: 'مشترك',
          subscriberNationalId: 'الرقم القومي للمشترك',
          cardNumber: 'رقم الكارت',
          gateNumber: 'بوابة الدخول',
          exitGateNumber: 'بوابة الخروج',
          collectorName: 'المحصل',
          collectedDate: 'تاريخ التحصيل',
          attachments: 'المرفقات',
          viewAttachments: 'عرض المرفقات',
          noAttachments: 'لا توجد مرفقات',
          noTickets: 'لا توجد تذاكر في الفترة المحددة.',
          yes: 'نعم',
          no: 'لا',
          unavailable: 'غير متوفر',
          close: 'إغلاق',
          requiredCashier: 'اختر كاشير الدخول أولا.',
          requiredDates: 'اختر تاريخ البداية والنهاية.',
          invalidDateRange: 'تاريخ النهاية يجب أن يكون أكبر من أو يساوي تاريخ البداية.',
          failedLoad: 'تعذر تحميل التقرير.',
          egp: 'ج.م',
        },
        en: {
          title: 'Entrance Cashier Tickets Report',
          subtitle: 'Tickets entered by an entrance cashier during a selected period',
          filters: 'Filters',
          entranceCashier: 'Entrance Cashier',
          selectCashier: 'Select entrance cashier',
          fromDate: 'From Date',
          toDate: 'To Date',
          search: 'Search',
          loading: 'Loading...',
          cashierInfo: 'Cashier Info',
          cashierName: 'Cashier Name',
          username: 'Username',
          role: 'Role',
          from: 'From',
          to: 'To',
          totalEnteredTicketsCount: 'Total Entered Tickets',
          insideParkTicketsCount: 'Inside Park Tickets',
          outsideParkTicketsCount: 'Outside Park Tickets',
          totalExceededTicketsCount: 'Total Exceeded Tickets',
          insideParkExceededTicketsCount: 'Inside Exceeded Tickets',
          outsideParkExceededTicketsCount: 'Outside Exceeded Tickets',
          insideParkTotalBasePrice: 'Inside Base Price',
          outsideParkTotalBasePrice: 'Outside Base Price',
          totalBasePrice: 'Total Base Price',
          insideParkTotalExceedPrice: 'Inside Exceed Price',
          outsideParkTotalExceedPrice: 'Outside Exceed Price',
          totalExceedPrice: 'Total Exceed Price',
          insideParkTotalAmount: 'Inside Total Amount',
          outsideParkTotalAmount: 'Outside Total Amount',
          totalAmount: 'Total Amount',
          counts: 'Counts Summary',
          moneyTotals: 'Money Totals Summary',
          insideTickets: 'Inside Park Tickets',
          outsideTickets: 'Outside Park Tickets',
          ticketCode: 'Ticket Code',
          startDate: 'Start Date',
          endDate: 'End Date',
          vehicleNumber: 'Vehicle Number',
          price: 'Price',
          exceedPrice: 'Exceed Price',
          totalPrice: 'Total Price',
          subscriber: 'Subscriber',
          subscriberNationalId: 'Subscriber National ID',
          cardNumber: 'Card Number',
          gateNumber: 'Entrance Gate',
          exitGateNumber: 'Exit Gate',
          collectorName: 'Collector Name',
          collectedDate: 'Collected Date',
          attachments: 'Attachments',
          viewAttachments: 'View Attachments',
          noAttachments: 'No Attachments',
          noTickets: 'No tickets found for the selected period.',
          yes: 'Yes',
          no: 'No',
          unavailable: 'Unavailable',
          close: 'Close',
          requiredCashier: 'Select an entrance cashier first.',
          requiredDates: 'Select both from and to dates.',
          invalidDateRange: 'To date must be greater than or equal to from date.',
          failedLoad: 'Failed to load the report.',
          egp: 'EGP',
        },
      }),
    },
  ],
})
export class EntranceCashierTicketsReport implements OnInit, OnChanges {
  private readonly reportsService = inject(ReportsService);
  private readonly usersService = inject(UsersServices);
  private readonly toast = inject(ToastServices);
  private readonly errorExtractor = inject(ErrorExtractorService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly lang = inject(LanguageService);
  private readonly dict = inject(I18N_DICT);

  readonly dir = computed(() => this.lang.dir());
  readonly isRTL = computed(() => this.lang.isRTL());

  @Input() fixedCashierId = '';
  @Input() fixedCashierName = '';
  @Input() embedded = false;

  cashiers: UserDto[] = [];
  cashiersLoading = false;
  loading = false;
  selectedCashierId = '';
  fromDate = this.todayInputValue();
  toDate = this.todayInputValue();
  activeTab: ReportTab = 'inside';
  report: EntranceCashierTicketsReportResponse | null = null;
  errorMessage = '';
  selectedAttachments: TicketReportAttachment[] = [];
  selectedTicketCode = '';
  private readonly attachmentSafeUrlCache = new Map<string, SafeResourceUrl>();

  ngOnInit(): void {
    if (this.fixedCashierId) {
      this.selectedCashierId = this.fixedCashierId;
      return;
    }

    this.loadEntranceCashiers();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['fixedCashierId']) return;

    this.selectedCashierId = this.fixedCashierId;
    this.report = null;
    this.errorMessage = '';
  }

  t(key: string): string {
    return this.lang.translate(this.dict as any, key);
  }

  get hasReport(): boolean {
    return !!this.report;
  }

  get noTicketsFound(): boolean {
    return (
      !!this.report &&
      this.report.insideParkTickets.length === 0 &&
      this.report.outsideParkTickets.length === 0
    );
  }

  get fixedCashierLabel(): string {
    return this.fixedCashierName || this.fixedCashierId || this.t('unavailable');
  }

  get summaryCards(): Array<{
    key: keyof EntranceCashierTicketsReportResponse['summary'];
    icon: string;
    tone: string;
  }> {
    return [
      { key: 'totalEnteredTicketsCount', icon: 'fa-solid fa-ticket', tone: 'blue' },
      { key: 'insideParkTicketsCount', icon: 'fa-solid fa-square-parking', tone: 'green' },
      { key: 'outsideParkTicketsCount', icon: 'fa-solid fa-right-from-bracket', tone: 'slate' },
      { key: 'totalExceededTicketsCount', icon: 'fa-solid fa-triangle-exclamation', tone: 'red' },
      { key: 'insideParkExceededTicketsCount', icon: 'fa-solid fa-circle-exclamation', tone: 'amber' },
      { key: 'outsideParkExceededTicketsCount', icon: 'fa-solid fa-burst', tone: 'red' },
    ];
  }

  get moneyCards(): Array<{
    key: keyof EntranceCashierTicketsReportResponse['summary'];
    icon: string;
    tone: string;
  }> {
    return [
      { key: 'insideParkTotalBasePrice', icon: 'fa-solid fa-money-bill-wave', tone: 'green' },
      { key: 'outsideParkTotalBasePrice', icon: 'fa-solid fa-money-bills', tone: 'slate' },
      { key: 'totalBasePrice', icon: 'fa-solid fa-wallet', tone: 'blue' },
      { key: 'insideParkTotalExceedPrice', icon: 'fa-solid fa-circle-plus', tone: 'amber' },
      { key: 'outsideParkTotalExceedPrice', icon: 'fa-solid fa-file-invoice-dollar', tone: 'red' },
      { key: 'totalExceedPrice', icon: 'fa-solid fa-receipt', tone: 'red' },
      { key: 'insideParkTotalAmount', icon: 'fa-solid fa-vault', tone: 'green' },
      { key: 'outsideParkTotalAmount', icon: 'fa-solid fa-landmark', tone: 'slate' },
      { key: 'totalAmount', icon: 'fa-solid fa-coins', tone: 'navy' },
    ];
  }

  loadEntranceCashiers(): void {
    this.cashiersLoading = true;
    this.usersService.getCashiers(1).subscribe({
      next: (cashiers) => {
        this.cashiers = cashiers ?? [];
        this.cashiersLoading = false;
      },
      error: () => {
        this.cashiers = [];
        this.cashiersLoading = false;
      },
    });
  }

  search(): void {
    if (!this.validateFilters()) return;

    this.loading = true;
    this.errorMessage = '';
    this.report = null;

    this.reportsService
      .getEntranceCashierTicketsReport(this.selectedCashierId, this.fromDate, this.toDate)
      .subscribe({
        next: (report) => {
          this.report = report;
          this.loading = false;
          this.activeTab = 'inside';
        },
        error: (err) => {
          this.errorMessage = this.errorExtractor.extractErrorMessage(err, this.t('failedLoad'));
          this.loading = false;
        },
      });
  }

  setTab(tab: ReportTab): void {
    this.activeTab = tab;
  }

  roleLabel(): string {
    if (!this.report) return this.t('unavailable');
    const current = this.lang.current === 'ar' ? this.report.roleNameAr : this.report.roleNameEn;
    return current || this.report.roleNameAr || this.report.roleNameEn || this.t('unavailable');
  }

  dateLabel(value: string | null | undefined): string {
    if (!value) return this.t('unavailable');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return this.t('unavailable');
    return date.toLocaleString(this.lang.current === 'ar' ? 'ar-EG' : 'en-US');
  }

  dateOnlyLabel(value: string | null | undefined): string {
    if (!value) return this.t('unavailable');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return this.t('unavailable');
    return date.toLocaleDateString(this.lang.current === 'ar' ? 'ar-EG' : 'en-US');
  }

  moneyLabel(value: number | null | undefined): string {
    return `${Number(value ?? 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${this.t('egp')}`;
  }

  valueLabel(value: string | number | null | undefined): string {
    const text = String(value ?? '').trim();
    return text || this.t('unavailable');
  }

  subscriberLabel(value: boolean): string {
    return value ? this.t('yes') : this.t('no');
  }

  attachmentPath(attachment: TicketReportAttachment | null | undefined): string {
    return String(attachment?.filePath ?? '').trim();
  }

  attachmentUrl(path: string | null | undefined): string {
    const value = String(path ?? '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;

    const origin = environment.baseUrl.replace(/\/api\/?$/i, '').replace(/\/$/, '');
    return `${origin}/${value.replace(/^\/+/, '')}`;
  }

  attachmentSafeUrl(path: string | null | undefined): SafeResourceUrl {
    const url = this.attachmentUrl(path);
    const cached = this.attachmentSafeUrlCache.get(url);
    if (cached) return cached;

    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.attachmentSafeUrlCache.set(url, safeUrl);
    return safeUrl;
  }

  isPdfAttachment(path: string | null | undefined): boolean {
    return String(path ?? '')
      .toLowerCase()
      .split('?')[0]
      .endsWith('.pdf');
  }

  openAttachments(ticket: ReportTicket): void {
    this.selectedAttachments = ticket.attachments ?? [];
    this.selectedTicketCode = ticket.uniqueCode;
  }

  closeAttachments(): void {
    this.selectedAttachments = [];
    this.selectedTicketCode = '';
  }

  outsideTicket(ticket: EntranceCashierOutsideTicket): EntranceCashierOutsideTicket {
    return ticket;
  }

  trackInside(_: number, ticket: EntranceCashierInsideTicket): string {
    return ticket.ticketId;
  }

  trackOutside(_: number, ticket: EntranceCashierOutsideTicket): string {
    return ticket.ticketId;
  }

  trackAttachment(_: number, attachment: TicketReportAttachment): string {
    return attachment.attachmentId || attachment.filePath;
  }

  private validateFilters(): boolean {
    if (!this.selectedCashierId) {
      this.toast.warn(this.t('requiredCashier'));
      return false;
    }

    if (!this.fromDate || !this.toDate) {
      this.toast.warn(this.t('requiredDates'));
      return false;
    }

    const from = new Date(this.fromDate);
    const to = new Date(this.toDate);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      this.toast.warn(this.t('invalidDateRange'));
      return false;
    }

    return true;
  }

  private todayInputValue(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
