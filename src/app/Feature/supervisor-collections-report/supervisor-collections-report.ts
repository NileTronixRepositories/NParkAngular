import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  SupervisorActiveTicketCollection,
  SupervisorCollectionTransaction,
  SupervisorCollectionsReportResponse,
  SupervisorExceedCollection,
  SupervisorTicketCollectorSummary,
} from '../../Domain/Reports/reports.model';
import { ReportsService } from '../../Services/Reports/reports.service';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { ToastServices } from '../../Services/Toster/toast-services';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';

type SupervisorCollectionsTab = 'transactions' | 'collectors' | 'active' | 'exceed';

@Component({
  selector: 'app-supervisor-collections-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervisor-collections-report.html',
  styleUrl: './supervisor-collections-report.css',
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          title: 'تقرير تحصيلات المشرف',
          subtitle: 'تحصيلات التذاكر والعقوبات في الفترة المحددة',
          supervisor: 'المشرف',
          fromDate: 'من تاريخ',
          toDate: 'إلى تاريخ',
          search: 'بحث',
          loading: 'جاري التحميل...',
          supervisorInfo: 'بيانات المشرف',
          supervisorName: 'اسم المشرف',
          username: 'اسم المستخدم',
          role: 'الدور',
          from: 'من',
          to: 'إلى',
          collectionsSummary: 'ملخص التحصيلات',
          collectionTransactionsCount: 'عدد معاملات التحصيل',
          totalItemsCollected: 'إجمالي العناصر المحصلة',
          totalAmountCollected: 'إجمالي التحصيل',
          ticketCollectionsCount: 'عدد تحصيلات التذاكر',
          activeTicketCollectionsCount: 'تذاكر نشطة متحصلة',
          archivedTicketCollectionsCount: 'تذاكر مؤرشفة متحصلة',
          ticketCollectionsAmount: 'إجمالي تحصيل التذاكر',
          supervisorExceedCollectionsCount: 'عدد عقوبات محصلة',
          supervisorExceedCollectionsAmount: 'إجمالي العقوبات المحصلة',
          pendingExceedCollectionsCount: 'عدد عقوبات معلقة',
          pendingExceedCollectionsAmount: 'إجمالي العقوبات المعلقة',
          grandTotalCollectionsAmount: 'إجمالي التحصيل الفعلي',
          transactions: 'معاملات التحصيل',
          responsibleUsers: 'ملخص المسؤولين',
          enterTickets: 'تذاكر الدخول',
          exceedTransactions: 'العقوبات',
          collectors: 'ملخص المحصلين',
          active: 'تذاكر نشطة',
          archived: 'تذاكر مؤرشفة',
          exceed: 'عقوبات محصلة',
          pending: 'عقوبات معلقة',
          collectorName: 'المحصل',
          responsibleUserName: 'المسؤول',
          transactionType: 'نوع المعاملة',
          gateName: 'البوابة',
          collectedBy: 'تم التحصيل بواسطة',
          totalItems: 'عدد العناصر',
          enterTicketsCount: 'عدد تذاكر الدخول',
          exceedTransactionsCount: 'عدد العقوبات',
          totalItemsCount: 'إجمالي العناصر',
          enterTicketsAmount: 'مبلغ تذاكر الدخول',
          responsibleExceedAmount: 'مبلغ العقوبات',
          activeTicketsCount: 'عدد النشطة',
          archivedTicketsCount: 'عدد المؤرشفة',
          totalTicketsCount: 'إجمالي العدد',
          activeTicketsAmount: 'مبلغ النشطة',
          archivedTicketsAmount: 'مبلغ المؤرشفة',
          totalAmount: 'الإجمالي',
          ticketCode: 'كود التذكرة',
          startDate: 'تاريخ الدخول',
          endDate: 'تاريخ الخروج',
          collectedDate: 'تاريخ التحصيل',
          collectionAmount: 'قيمة التحصيل',
          vehicleNumber: 'رقم المركبة',
          subscriber: 'مشترك',
          cardNumber: 'رقم الكارت',
          gateNumber: 'البوابة',
          exitGateNumber: 'بوابة الخروج',
          ticketStartDate: 'تاريخ دخول التذكرة',
          ticketEndDate: 'تاريخ خروج التذكرة',
          exceedAmount: 'قيمة العقوبة',
          ticketPrice: 'سعر التذكرة',
          ticketOldExceedPrice: 'العقوبة السابقة',
          totalPriceAfterExceed: 'الإجمالي بعد العقوبة',
          exceedCreatedByName: 'منشئ العقوبة',
          supervisorCollectorName: 'مشرف التحصيل',
          supervisorCollectedAt: 'وقت تحصيل المشرف',
          createdAt: 'وقت الإنشاء',
          noCollections: 'لا توجد تحصيلات في الفترة المحددة.',
          unavailable: '-',
          yes: 'نعم',
          no: 'لا',
          requiredSupervisor: 'اختر المشرف أولا.',
          requiredDates: 'اختر تاريخ البداية والنهاية.',
          invalidDateRange: 'تاريخ النهاية يجب أن يكون أكبر من أو يساوي تاريخ البداية.',
          failedLoad: 'تعذر تحميل تقرير التحصيلات.',
          egp: 'ج.م',
        },
        en: {
          title: 'Supervisor Collections Report',
          subtitle: 'Ticket and exceed collections for the selected period',
          supervisor: 'Supervisor',
          fromDate: 'From Date',
          toDate: 'To Date',
          search: 'Search',
          loading: 'Loading...',
          supervisorInfo: 'Supervisor Info',
          supervisorName: 'Supervisor Name',
          username: 'Username',
          role: 'Role',
          from: 'From',
          to: 'To',
          collectionsSummary: 'Collections Summary',
          collectionTransactionsCount: 'Collection Transactions',
          totalItemsCollected: 'Total Items Collected',
          totalAmountCollected: 'Total Amount Collected',
          ticketCollectionsCount: 'Ticket Collections Count',
          activeTicketCollectionsCount: 'Active Ticket Collections',
          archivedTicketCollectionsCount: 'Archived Ticket Collections',
          ticketCollectionsAmount: 'Ticket Collections Amount',
          supervisorExceedCollectionsCount: 'Supervisor Exceed Count',
          supervisorExceedCollectionsAmount: 'Supervisor Exceed Amount',
          pendingExceedCollectionsCount: 'Pending Exceed Count',
          pendingExceedCollectionsAmount: 'Pending Exceed Amount',
          grandTotalCollectionsAmount: 'Grand Total Collections',
          transactions: 'Collection Transactions',
          responsibleUsers: 'Responsible Users',
          enterTickets: 'Enter Tickets',
          exceedTransactions: 'Exceed Transactions',
          collectors: 'Collectors Summary',
          active: 'Active Tickets',
          archived: 'Archived Tickets',
          exceed: 'Collected Exceeds',
          pending: 'Pending Exceeds',
          collectorName: 'Collector',
          responsibleUserName: 'Responsible User',
          transactionType: 'Transaction Type',
          gateName: 'Gate',
          collectedBy: 'Collected By',
          totalItems: 'Items',
          enterTicketsCount: 'Enter Tickets',
          exceedTransactionsCount: 'Exceed Transactions',
          totalItemsCount: 'Total Items',
          enterTicketsAmount: 'Enter Tickets Amount',
          responsibleExceedAmount: 'Exceed Amount',
          activeTicketsCount: 'Active Count',
          archivedTicketsCount: 'Archived Count',
          totalTicketsCount: 'Total Count',
          activeTicketsAmount: 'Active Amount',
          archivedTicketsAmount: 'Archived Amount',
          totalAmount: 'Total Amount',
          ticketCode: 'Ticket Code',
          startDate: 'Start Date',
          endDate: 'End Date',
          collectedDate: 'Collected Date',
          collectionAmount: 'Collection Amount',
          vehicleNumber: 'Vehicle Number',
          subscriber: 'Subscriber',
          cardNumber: 'Card Number',
          gateNumber: 'Gate',
          exitGateNumber: 'Exit Gate',
          ticketStartDate: 'Ticket Start Date',
          ticketEndDate: 'Ticket End Date',
          exceedAmount: 'Exceed Amount',
          ticketPrice: 'Ticket Price',
          ticketOldExceedPrice: 'Old Exceed',
          totalPriceAfterExceed: 'Total After Exceed',
          exceedCreatedByName: 'Exceed Created By',
          supervisorCollectorName: 'Supervisor Collector',
          supervisorCollectedAt: 'Supervisor Collected At',
          createdAt: 'Created At',
          noCollections: 'No collections found for the selected period.',
          unavailable: '-',
          yes: 'Yes',
          no: 'No',
          requiredSupervisor: 'Please select supervisor.',
          requiredDates: 'Please select from and to dates.',
          invalidDateRange: 'To date must be greater than or equal to From date.',
          failedLoad: 'Failed to load supervisor collections report.',
          egp: 'EGP',
        },
      }),
    },
  ],
})
export class SupervisorCollectionsReport implements OnChanges {
  private readonly reportsService = inject(ReportsService);
  private readonly toast = inject(ToastServices);
  private readonly errorExtractor = inject(ErrorExtractorService);
  readonly lang = inject(LanguageService);
  private readonly dict = inject(I18N_DICT);

  readonly dir = computed(() => this.lang.dir());
  readonly isRTL = computed(() => this.lang.isRTL());

  @Input() supervisorId = '';
  @Input() supervisorName = '';

  fromDate = this.todayInputValue();
  toDate = this.todayInputValue();
  activeTab: SupervisorCollectionsTab = 'transactions';
  loading = false;
  report: SupervisorCollectionsReportResponse | null = null;
  errorMessage = '';

  readonly summaryCards: Array<{
    key: keyof SupervisorCollectionsReportResponse['summary'];
    icon: string;
    money: boolean;
    tone: string;
  }> = [
    { key: 'collectionTransactionsCount', icon: 'bi-receipt', money: false, tone: 'slate' },
    { key: 'totalItemsCollected', icon: 'bi-list-check', money: false, tone: 'blue' },
    { key: 'totalAmountCollected', icon: 'bi-coin', money: true, tone: 'green' },
    { key: 'ticketCollectionsCount', icon: 'bi-ticket-perforated', money: false, tone: 'blue' },
    { key: 'ticketCollectionsAmount', icon: 'bi-cash-stack', money: true, tone: 'blue' },
    {
      key: 'supervisorExceedCollectionsCount',
      icon: 'bi-exclamation-circle',
      money: false,
      tone: 'amber',
    },
    {
      key: 'supervisorExceedCollectionsAmount',
      icon: 'bi-receipt-cutoff',
      money: true,
      tone: 'amber',
    },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['supervisorId']) return;
    this.report = null;
    this.errorMessage = '';
  }

  t(key: string): string {
    return this.lang.translate(this.dict as any, key);
  }

  get noCollectionsFound(): boolean {
    return (
      !!this.report &&
      this.report.collectionTransactions.length === 0 &&
      this.report.activeTicketCollections.length === 0 &&
      this.report.supervisorExceedCollections.length === 0
    );
  }

  search(): void {
    if (!this.validateFilters()) return;

    this.loading = true;
    this.errorMessage = '';
    this.report = null;

    this.reportsService
      .getSupervisorCollectionsReport(this.supervisorId, this.fromDate, this.toDate)
      .subscribe({
        next: (report) => {
          this.report = report;
          this.loading = false;
          this.activeTab = 'transactions';
        },
        error: (err) => {
          this.errorMessage = this.errorExtractor.extractErrorMessage(err, this.t('failedLoad'));
          this.loading = false;
        },
      });
  }

  setTab(tab: SupervisorCollectionsTab): void {
    this.activeTab = tab;
  }

  roleLabel(): string {
    if (!this.report) return this.t('unavailable');
    const current =
      this.lang.current === 'ar'
        ? this.report.supervisor.roleNameAr
        : this.report.supervisor.roleNameEn;
    return (
      current ||
      this.report.supervisor.roleNameAr ||
      this.report.supervisor.roleNameEn ||
      this.t('unavailable')
    );
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

  trackCollector(_: number, item: SupervisorTicketCollectorSummary): string {
    return item.responsibleUserId || item.responsibleUserName || String(_);
  }

  trackTransaction(_: number, item: SupervisorCollectionTransaction): string {
    return item.transactionId || String(_);
  }

  trackActive(_: number, item: SupervisorActiveTicketCollection): string {
    return item.ticketId || item.uniqueCode;
  }

  trackExceed(_: number, item: SupervisorExceedCollection): string {
    return item.transactionId || item.ticketUniqueCode;
  }

  private validateFilters(): boolean {
    if (!this.supervisorId) {
      this.toast.warn(this.t('requiredSupervisor'));
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
