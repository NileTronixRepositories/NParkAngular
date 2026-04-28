import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import {
  DashboardDto,
  TicketInsideParkDto,
  TicketAdminDto,
  ActiveMembershipDto,
  InactiveMembershipDto,
  ExpiringMembershipDto,
} from '../../Domain/OverView/overview.model';
import { OverviewServices } from '../../Services/OverView/overview-services';
import { DashboardHubService } from '../../Services/OverView/dashboard-hub.service';
import {
  TicketAddedNotification,
  TicketExitedNotification,
  TicketCollectedNotification,
} from '../../Domain/OverView/dashboard-notifications.model';
import { TicketsServices } from '../../Services/Tickets/tickets-services';
import { TicketDto } from '../../Domain/tickets/tickets.model';
import { FormsModule } from '@angular/forms';
import { TicketDetailsModalBlockComponent } from '../Shared/ticket-details-modal-block-component/ticket-details-modal-block-component';
import { CommonModule } from '@angular/common';
import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { LanguageService } from '../../Services/i18n/language-service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { OverviewTourService } from '../../Services/OverView/overview-tour.service';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';

type NotificationType = 'IN' | 'OUT' | 'COLLECTED';
type MembershipViewType = 'active' | 'inactive' | 'expiring';
type TicketsTodayTooltipType = 'entry' | 'exit';
type DataModalType =
  | 'occupancy'
  | 'ticketsEntry'
  | 'ticketsExit'
  | 'membershipActive'
  | 'membershipInactive'
  | 'membershipExpiring'
  | 'ticketDetails';

interface UiNotification {
  id: number;
  type: NotificationType;
  titleKey: string;
  message: string;
  time: string;
}

@Component({
  selector: 'app-overview-component',
  standalone: true,
  imports: [CommonModule, TranslatePipePipe, FormsModule, TicketDetailsModalBlockComponent],
  templateUrl: './overview-component.html',
  styleUrls: ['./overview-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          overview: 'لوحة المعلومات',
          welcomeBack: 'مرحبًا بعودتك',
          todayStats: 'إحصائيات اليوم',
          totalRevenue: 'إجمالي الإيرادات',
          collected: 'محصّل',
          pending: 'معلّق',
          occupancy: 'الإشغال',
          inside: 'داخل',
          free: 'فارغ',
          ticketsToday: 'التذاكر اليوم',
          entry: 'دخول',
          exit: 'خروج',
          active: 'نشط',
          inactive: 'غير نشط',
          memberships: 'الاشتراكات',
          total: 'الإجمالي',
          expiringNext7Days: 'تنتهي خلال 7 أيام',
          revenueBreakdown: 'أنواع العملاء ',
          membershipRevenue: 'إيراد الاشتراكات',
          walkInRevenue: 'إيراد الزوار',
          liveInOut: 'الدخول/الخروج المباشر',
          in: 'دخول',
          out: 'خروج',
          exceedAnalytics: 'تحليل الغرامات',
          exceededTickets: 'تذاكر عليها غرامة',
          totalExceed: 'إجمالي الغرامات',
          avgPerTicket: 'متوسط كل تذكرة',
          durationStats: 'إحصائيات المدة',
          avgDuration: 'متوسط المدة',
          maxDuration: 'أقصى مدة',
          minutes: 'دقيقة',
          entryGates: 'بوابات الدخول',
          exitGates: 'بوابات الخروج',
          gateNumber: 'البوابة',
          tickets: 'التذاكر',
          totalPrice: 'المبلغ الكلي',
          collectedPrice: 'المحصّل',
          supervisor: 'المشرف',
          topPerformers: 'Gate Flow',
          busiestGate: 'أكثر بوابة نشاطًا',
          topCollector: 'أفضل محصّل',
          amount: 'المبلغ',
          recentTickets: 'أحدث التذاكر',
          id: 'المعرّف',
          plate: 'اللوحة',
          action: 'الإجراء',
          gate: 'البوابة',
          time: 'الوقت',
          IN: 'دخول',
          OUT: 'خروج',
          loading: 'جاري التحميل...',
          error: 'حدث خطأ في تحميل البيانات',
          retry: 'إعادة المحاولة',
          egp: 'ج.م',
          count: 'العدد',
          percentage: 'النسبة',
          selectedDate: 'التاريخ',
          applyDate: 'عرض',
          ticketBaseRevenue: 'إيرادات التذاكر ',
          totalExceedRevenue: 'إجمالي الغرامات',
          collectedExceedRevenue: 'غرامات محصلة',
          pendingExceedRevenue: 'غرامات معلقة',
          ticketEnterToday: 'دخول اليوم',
          ticketEnterNotTodayButNotExitYet: 'دخول قديم لم يخرج',
          exitTicketsCount: 'خروج اليوم',
          pendingPrice: 'غير محصل',
          collectors: 'المحصلون',
          supervisors: 'المشرفون',
          exitedTickets: 'تذاكر خرجت',
          exceedTransactions: 'معاملات الغرامات',
          noDataAvailable: 'لا توجد بيانات',
          noCollectionsYet: 'لا يوجد تحصيل بعد',
          notAvailable: 'غير متاح',
          topExceedCollector: 'أفضل مشرف غرامات',
          transactions: 'معاملات',

          notif_in_title: 'تذكرة دخول جديدة',
          notif_out_title: 'تذكرة خروج',
          notif_collected_title: 'تحصيل تذكرة',

          showMoreDetails: 'عرض تفاصيل أكثر',

          // زر شرح الواجهة
          helpTour: 'شرح الواجهة',
        },
        en: {
          overview: 'Dashboard',
          welcomeBack: 'Welcome Back',
          todayStats: "Today's Statistics",
          totalRevenue: 'Total Revenue',
          collected: 'Collected',
          pending: 'Pending',
          occupancy: 'Occupancy',
          inside: 'Inside',
          free: 'Free',
          ticketsToday: 'Tickets Today',
          entry: 'Entry',
          exit: 'Exit',
          active: 'Active',
          inactive: 'Inactive',
          memberships: 'Memberships',
          total: 'Total',
          expiringNext7Days: 'Expiring in 7 days',
          revenueBreakdown: 'Customer Type',
          membershipRevenue: 'Membership Revenue',
          walkInRevenue: 'Walk-in Revenue',
          liveInOut: 'Live In/Out',
          in: 'IN',
          out: 'OUT',
          exceedAnalytics: 'Exceed Analytics',
          exceededTickets: 'Exceeded Tickets',
          totalExceed: 'Total Exceed',
          avgPerTicket: 'Avg per Ticket',
          durationStats: 'Duration Stats',
          avgDuration: 'Avg Duration',
          maxDuration: 'Max Duration',
          minutes: 'min',
          entryGates: 'Entry Gates',
          exitGates: 'Exit Gates',
          gateNumber: 'Gate',
          tickets: 'Tickets',
          totalPrice: 'Total',
          collectedPrice: 'Collected',
          supervisor: 'Supervisor',
          topPerformers: 'Gate Flow',
          busiestGate: 'Busiest Gate',
          topCollector: 'Top Collector',
          amount: 'Amount',
          recentTickets: 'Recent Tickets',
          id: 'ID',
          plate: 'Plate',
          action: 'Action',
          gate: 'Gate',
          time: 'Time',
          IN: 'IN',
          OUT: 'OUT',
          loading: 'Loading...',
          error: 'Error loading data',
          retry: 'Retry',
          egp: 'EGP',
          count: 'Count',
          percentage: 'Percentage',
          selectedDate: 'Date',
          applyDate: 'Apply',
          ticketBaseRevenue: 'Ticket Base',
          totalExceedRevenue: 'Total Exceed Revenue',
          collectedExceedRevenue: 'Collected Exceed',
          pendingExceedRevenue: 'Pending Exceed',
          ticketEnterToday: 'Entry Today',
          ticketEnterNotTodayButNotExitYet: 'Old Still Inside',
          exitTicketsCount: 'Exit Today',
          pendingPrice: 'Pending',
          collectors: 'Collectors',
          supervisors: 'Supervisors',
          exitedTickets: 'Exited Tickets',
          exceedTransactions: 'Exceed Transactions',
          noDataAvailable: 'No data available',
          noCollectionsYet: 'No collections yet',
          notAvailable: 'N/A',
          topExceedCollector: 'Top Exceed Collector',
          transactions: 'Transactions',

          notif_in_title: 'New entry ticket',
          notif_out_title: 'Exit ticket',
          notif_collected_title: 'Ticket collected',

          showMoreDetails: 'Show more details',

          helpTour: 'Help tour',
        },
      }),
    },
  ],
})
export class OverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  protected readonly Math = Math;

  constructor(
    public readonly lang: LanguageService,
    private readonly overviewServices: OverviewServices,
    private readonly dashboardHub: DashboardHubService,
    private readonly ticketsService: TicketsServices,
    private readonly overviewTour: OverviewTourService,
    private readonly errorExtractor: ErrorExtractorService,
  ) {}

  // ===== State =====
  dashboard = signal<DashboardDto | null>(null);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  selectedDashboardDate = this.toDateInputValue(new Date());

  // Tickets lists
  ticketsInside = signal<TicketInsideParkDto[]>([]);
  todayEntryTickets = signal<TicketAdminDto[]>([]);
  todayExitTickets = signal<TicketAdminDto[]>([]);

  // Membership details
  activeMemberships = signal<ActiveMembershipDto[]>([]);
  inactiveMemberships = signal<InactiveMembershipDto[]>([]);
  expiringMemberships = signal<ExpiringMembershipDto[]>([]);

  // Hover hint (show more details)
  membershipHintVisible = signal<boolean>(false);
  membershipHintType = signal<MembershipViewType | null>(null);

  // Search
  searchingTickets = false;
  searchResults: TicketDto[] = [];
  searchQuery = '';
  searchAttempted = false;
  private searchSubject = new Subject<string>();

  // Notifications
  notifications = signal<UiNotification[]>([]);
  private notificationIdCounter = 0;
  private hubSubscriptions = new Subscription();

  // Tooltips (مش مستخدمة في الـ UI دلوقتي كـ hover)
  occupancyTooltipVisible = signal<boolean>(false);
  ticketsTodayTooltipVisible = signal<boolean>(false);
  ticketsTodayTooltipType = signal<TicketsTodayTooltipType | null>(null);

  // Global modal state
  activeModal = signal<DataModalType | null>(null);
  selectedTicket = signal<TicketDto | null>(null);

  // ===== Computed =====
  totalRevenue = computed(() => this.dashboard()?.totalRevenue ?? 0);
  collectedRevenue = computed(() => this.dashboard()?.collectedRevenue ?? 0);
  pendingRevenue = computed(() => this.dashboard()?.pendingRevenue ?? 0);

  collectedPercent = computed(() => {
    const total = this.totalRevenue();
    return total > 0 ? (this.collectedRevenue() / total) * 100 : 0;
  });

  currentVehiclesInside = computed(() => this.dashboard()?.currentVehiclesInside ?? 0);
  estimatedFreeSlots = computed(() => this.dashboard()?.estimatedFreeSlots ?? 0);
  occupancyPercentage = computed(() => this.dashboard()?.occupancyPercentage ?? 0);

  ticketEnterToday = computed(() => this.dashboard()?.ticketEnterToday ?? 0);
  ticketEnterNotTodayButNotExitYet = computed(
    () => this.dashboard()?.ticketEnterNotTodayButNotExitYet ?? 0,
  );
  enterTicketsCount = computed(() => this.ticketEnterToday());
  exitTicketsCount = computed(() => this.dashboard()?.exitTicketsCount ?? 0);
  activeTicketsCount = computed(() => this.dashboard()?.activeTicketsCount ?? 0);

  subscriptionCount = computed(() => this.dashboard()?.subscriptionCount ?? 0);
  activeSubscriptionCount = computed(() => this.dashboard()?.activeSubscriptionCount ?? 0);
  inactiveSubscriptionCount = computed(() => this.dashboard()?.inactiveSubscriptionCount ?? 0);

  membershipsExpiringNext7Days = computed(
    () => this.dashboard()?.membershipsExpiringNext7Days ?? 0,
  );

  membershipTicketsCount = computed(() => this.dashboard()?.membershipTicketsCount ?? 0);
  walkInTicketsCount = computed(() => this.dashboard()?.walkInTicketsCount ?? 0);

  membershipRelatedRevenue = computed(() => this.dashboard()?.membershipRelatedRevenue ?? 0);
  walkInRevenue = computed(() => this.dashboard()?.walkInRevenue ?? 0);
  ticketBaseRevenue = computed(() => this.dashboard()?.ticketBaseRevenue ?? 0);
  collectedTicketBaseRevenue = computed(() => this.dashboard()?.collectedTicketBaseRevenue ?? 0);
  pendingTicketBaseRevenue = computed(() => this.dashboard()?.pendingTicketBaseRevenue ?? 0);

  membershipRevenuePercent = computed(() => {
    const total = this.totalRevenue();
    return total > 0 ? (this.membershipRelatedRevenue() / total) * 100 : 0;
  });

  walkInRevenuePercent = computed(() => {
    const total = this.totalRevenue();
    return total > 0 ? (this.walkInRevenue() / total) * 100 : 0;
  });

  exceededTicketsCount = computed(() => this.dashboard()?.exceededTicketsCount ?? 0);
  exceedTransactionsCount = computed(() => this.dashboard()?.exceedTransactionsCount ?? 0);
  collectedExceedTransactionsCount = computed(
    () => this.dashboard()?.collectedExceedTransactionsCount ?? 0,
  );
  pendingExceedTransactionsCount = computed(
    () => this.dashboard()?.pendingExceedTransactionsCount ?? 0,
  );
  totalExceedRevenue = computed(() => this.dashboard()?.totalExceedRevenue ?? 0);
  collectedExceedRevenue = computed(() => this.dashboard()?.collectedExceedRevenue ?? 0);
  pendingExceedRevenue = computed(() => this.dashboard()?.pendingExceedRevenue ?? 0);
  averageExceedPerTicket = computed(() => this.dashboard()?.averageExceedPerTicket ?? 0);
  averageExceedPerTransaction = computed(() => this.dashboard()?.averageExceedPerTransaction ?? 0);

  averageDurationMinutes = computed(() => this.dashboard()?.averageDurationMinutes ?? 0);
  maxDurationMinutes = computed(() => this.dashboard()?.maxDurationMinutes ?? 0);

  busiestGateNumber = computed(() => this.dashboard()?.busiestGateNumber ?? 0);
  busiestGateTicketsCount = computed(() => this.dashboard()?.busiestGateTicketsCount ?? 0);
  topCollectorName = computed(() => this.dashboard()?.topCollectorName ?? null);
  topCollectorAmount = computed(() => this.dashboard()?.topCollectorAmount ?? 0);
  topCollectorTicketsCount = computed(() => this.dashboard()?.topCollectorTicketsCount ?? 0);
  topExceedCollectorName = computed(() => this.dashboard()?.topExceedCollectorName ?? null);
  topExceedCollectorAmount = computed(() => this.dashboard()?.topExceedCollectorAmount ?? 0);
  topExceedCollectorTransactionsCount = computed(
    () => this.dashboard()?.topExceedCollectorTransactionsCount ?? 0,
  );

  entryGates = computed(() => this.dashboard()?.entryGates ?? []);
  exitGates = computed(() => this.dashboard()?.exitGates ?? []);
  recentTickets = computed(() => this.dashboard()?.recentTickets ?? []);

  // Charts
  private readonly defaultChartHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  chartHours = computed(() => {
    const hours = this.dashboard()?.chartHours;
    return hours && hours.length > 0 ? hours : this.defaultChartHours;
  });

  chartIn = computed(() => this.dashboard()?.chartIn ?? []);
  chartOut = computed(() => this.dashboard()?.chartOut ?? []);

  // Donut chart
  donutRadius = signal(58);
  donutCirc = computed(() => 2 * Math.PI * this.donutRadius());
  membershipStroke = computed(() => (this.membershipRevenuePercent() / 100) * this.donutCirc());
  walkInStroke = computed(() => (this.walkInRevenuePercent() / 100) * this.donutCirc());
  walkInRotateDeg = computed(() => -90 + (this.membershipRevenuePercent() / 100) * 360);

  // Live In/Out bars
  liveChartWidth = signal(360);
  liveChartHeight = 140;
  readonly liveLeftPadding = 70;
  readonly liveRightPadding = 24;
  readonly liveBarThickness = 32;
  readonly liveBarsGap = 28;

  liveMaxCount = computed(() => Math.max(this.ticketEnterToday(), this.exitTicketsCount(), 1));

  @HostListener('window:resize')
  onResize(): void {
    this.updateChartDimensions();
  }

  private updateChartDimensions(): void {
    const width = window.innerWidth;

    // Adjust Live Chart Width
    if (width < 400) {
      this.liveChartWidth.set(Math.min(280, width - 20));
      this.donutRadius.set(40);
    } else if (width < 576) {
      this.liveChartWidth.set(Math.min(320, width - 40));
      this.donutRadius.set(45);
    } else if (width < 768) {
      this.liveChartWidth.set(Math.min(450, width - 60));
      this.donutRadius.set(50);
    } else if (width < 1200) {
      this.liveChartWidth.set(340);
      this.donutRadius.set(54);
    } else {
      this.liveChartWidth.set(380);
      this.donutRadius.set(58);
    }
  }

  liveBarWidth(value: number): number {
    const usable = this.liveChartWidth() - this.liveLeftPadding - this.liveRightPadding;
    const max = this.liveMaxCount();
    const ratio = max > 0 ? value / max : 0;
    return ratio * usable;
  }

  liveBarX(value: number): number {
    if (this.lang.isRTL()) {
      return this.liveChartWidth() - this.liveLeftPadding - this.liveBarWidth(value);
    }
    return this.liveLeftPadding;
  }

  liveInBarY(): number {
    return 30;
  }

  liveOutBarY(): number {
    return this.liveInBarY() + this.liveBarThickness + this.liveBarsGap;
  }

  liveValueX(value: number): number {
    // Center of the bar
    if (this.lang.isRTL()) {
      const barW = this.liveBarWidth(value);
      return this.liveChartWidth() - this.liveLeftPadding - barW / 2;
    }
    return this.liveLeftPadding + this.liveBarWidth(value) / 2;
  }

  liveValueYForIn(): number {
    return this.liveInBarY() + this.liveBarThickness / 2;
  }

  liveValueYForOut(): number {
    return this.liveOutBarY() + this.liveBarThickness / 2;
  }

  liveLabelX(): number {
    return this.lang.isRTL() ? this.liveChartWidth() - this.liveLeftPadding : this.liveLeftPadding;
  }

  liveLabelYForIn(): number {
    return this.liveInBarY() + this.liveBarThickness + 18;
  }

  liveLabelYForOut(): number {
    return this.liveOutBarY() + this.liveBarThickness + 18;
  }

  // ===== Lifecycle =====
  ngOnInit(): void {
    this.loadDashboard();
    this.connectToHub();

    // Live Search Setup
    this.hubSubscriptions.add(
      this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe((query) => {
        this.performSearch(query);
      }),
    );
  }

  ngOnDestroy(): void {
    this.hubSubscriptions.unsubscribe();
    this.dashboardHub.stop();
  }

  ngAfterViewInit(): void {
    // Initial calculation
    setTimeout(() => this.updateChartDimensions(), 0);
  }

  // ===== Help Tour (زرار شرح الواجهة) =====
  startAdminTour(): void {
    this.overviewTour.startTour();
  }

  // ===== API =====
  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.overviewServices.getDashboard(this.selectedDashboardDate).subscribe({
      next: (dto) => {
        this.loading.set(false);
        this.dashboard.set(dto);

        this.syncOccupancyWithTicketsInside();
        this.loadTodayTickets();
        this.loadMembershipDetails();
      },
      error: (err) => {
        console.error('Error loading dashboard', err);
        this.loading.set(false);
        const fallback =
          this.lang.current === 'ar' ? 'حدث خطأ في تحميل البيانات' : 'Error loading data';
        this.errorMessage.set(this.errorExtractor.extractErrorMessage(err, fallback));
      },
    });
  }

  private syncOccupancyWithTicketsInside(): void {
    this.overviewServices.getTicketsInsidePark().subscribe({
      next: (tickets) => this.ticketsInside.set(tickets ?? []),
      error: (err) => console.error('Error syncing occupancy', err),
    });
  }

  private loadTodayTickets(): void {
    this.overviewServices.getTicketsForEntryAdmin().subscribe({
      next: (list) => this.todayEntryTickets.set(list ?? []),
      error: (err) => console.error('Error loading today entry tickets', err),
    });

    this.overviewServices.getTicketsForExitAdmin().subscribe({
      next: (list) => this.todayExitTickets.set(list ?? []),
      error: (err) => console.error('Error loading today exit tickets', err),
    });
  }

  private loadMembershipDetails(): void {
    this.overviewServices.getActiveMemberships().subscribe({
      next: (list) => this.activeMemberships.set(list ?? []),
      error: (err) => console.error('Error loading active memberships', err),
    });

    this.overviewServices.getInactiveMemberships().subscribe({
      next: (list) => this.inactiveMemberships.set(list ?? []),
      error: (err) => console.error('Error loading inactive memberships', err),
    });

    this.overviewServices.getMembershipsExpireNextSevenDays().subscribe({
      next: (list) => this.expiringMemberships.set(list ?? []),
      error: (err) => console.error('Error loading expiring memberships', err),
    });
  }

  // ===== Membership UI logic (Popup) =====
  showMembershipHint(type: MembershipViewType): void {
    this.membershipHintType.set(type);
    this.membershipHintVisible.set(true);
  }

  hideMembershipHint(): void {
    this.membershipHintVisible.set(false);
  }

  openMembershipModal(type: MembershipViewType): void {
    if (type === 'active') {
      this.activeModal.set('membershipActive');
    } else if (type === 'inactive') {
      this.activeModal.set('membershipInactive');
    } else {
      this.activeModal.set('membershipExpiring');
    }
  }

  // ===== Tickets Today (now click -> modal) =====
  showTicketsTodayDetails(type: TicketsTodayTooltipType): void {
    if (type === 'entry') {
      this.activeModal.set('ticketsEntry');
    } else {
      this.activeModal.set('ticketsExit');
    }
  }

  // ===== Occupancy (click -> modal) =====
  showOccupancyDetails(): void {
    this.activeModal.set('occupancy');
  }

  // ===== Global Modal control =====
  closeModal(): void {
    this.activeModal.set(null);
  }

  // ===== SignalR =====
  private async connectToHub(): Promise<void> {
    try {
      await this.dashboardHub.start();

      this.hubSubscriptions.add(
        this.dashboardHub.ticketAdded$.subscribe((notification) => {
          this.pushNotification('IN', 'notif_in_title', this.buildInMessage(notification));
          this.loadDashboard();
        }),
      );

      this.hubSubscriptions.add(
        this.dashboardHub.ticketExited$.subscribe((notification) => {
          this.pushNotification('OUT', 'notif_out_title', this.buildOutMessage(notification));
          this.loadDashboard();
        }),
      );

      this.hubSubscriptions.add(
        this.dashboardHub.ticketCollected$.subscribe((notification) => {
          this.pushNotification(
            'COLLECTED',
            'notif_collected_title',
            this.buildCollectedMessage(notification),
          );

          this.loadDashboard();
        }),
      );
    } catch (error) {
      console.error('Failed to connect to SignalR hub', error);
    }
  }

  // Removed local chart simulation helpers as we now rely on DTO only

  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  formatName(value: string | null | undefined): string {
    const normalized = String(value ?? '').trim();
    return normalized || (this.lang.isRTL() ? 'غير متاح' : 'N/A');
  }

  private toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ===== Search tickets =====
  onSearchInput(term: string): void {
    const value = term.trim();
    this.searchQuery = value;

    if (!value) {
      this.searchResults = [];
      this.searchAttempted = false;
      this.searchingTickets = false;
      return;
    }

    this.searchSubject.next(value);
  }

  onSearchTickets(): void {
    const query = this.searchQuery.trim();
    this.performSearch(query);
  }

  private performSearch(query: string): void {
    if (!query) {
      this.searchResults = [];
      this.searchingTickets = false;
      this.searchAttempted = false;
      return;
    }

    this.searchingTickets = true;
    this.searchAttempted = true;

    this.ticketsService.searchTickets(query).subscribe({
      next: (results) => {
        this.searchResults = results ?? [];
        this.searchingTickets = false;
      },
      error: (err) => {
        console.error('Search error:', err);
        this.searchResults = [];
        this.searchingTickets = false;
      },
    });
  }

  onTicketSelected(ticket: TicketDto): void {
    console.log('Selected ticket:', ticket);
    this.selectedTicket.set(ticket);
    this.activeModal.set('ticketDetails');
    this.searchQuery = '';
    this.searchResults = [];
  }

  // Notifications
  private pushNotification(type: NotificationType, titleKey: string, message: string): void {
    const id = ++this.notificationIdCounter;
    const date = new Date();
    const time = date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    this.notifications.update((list) => {
      const next: UiNotification[] = [
        ...list,
        {
          id,
          type,
          titleKey,
          message,
          time,
        },
      ];

      if (next.length > 5) next.shift();

      return next;
    });

    setTimeout(() => {
      this.notifications.update((list) => list.filter((n) => n.id !== id));
    }, 8000);
  }

  dismissNotification(id: number): void {
    this.notifications.update((list) => list.filter((n) => n.id !== id));
  }

  private buildInMessage(notification: TicketAddedNotification): string {
    const gateLabel = this.lang.isRTL()
      ? `بوابة ${notification.gateNumber}`
      : `Gate ${notification.gateNumber}`;

    return this.lang.isRTL()
      ? `${gateLabel} - تذكرة رقم ${notification.ticketId}`
      : `${gateLabel} - Ticket #${notification.ticketId}`;
  }

  private buildOutMessage(notification: any): string {
    const gateLabel = notification.gateNumber
      ? `${notification.gateNumber}`
      : this.lang.isRTL()
        ? 'بوابة خروج'
        : 'Exit gate';

    const hasPrice =
      notification.price !== null &&
      notification.price !== undefined &&
      typeof notification.price === 'number';

    if (!hasPrice) {
      return this.lang.isRTL()
        ? `${gateLabel} - تم تحصيل تذكرة خروج`
        : `${gateLabel} - Exit ticket collected`;
    }

    const priceText = this.lang.isRTL()
      ? `${notification.price.toFixed(2)} ج.م`
      : `${notification.price.toFixed(2)} EGP`;

    return this.lang.isRTL()
      ? `${gateLabel} - تحصيل ${priceText}`
      : `${gateLabel} - Collected ${priceText}`;
  }

  private buildCollectedMessage(notification: TicketCollectedNotification): string {
    const collectorLabel = this.lang.isRTL()
      ? `المحصّل ${notification.collectorName}`
      : `Collector ${notification.collectorName}`;

    const amountPart = this.lang.isRTL()
      ? `${notification.collectedAmount.toFixed(2)} ج.م`
      : `${notification.collectedAmount.toFixed(2)} EGP`;

    return this.lang.isRTL()
      ? `${collectorLabel} - ${amountPart}`
      : `${collectorLabel} - ${amountPart}`;
  }
}
