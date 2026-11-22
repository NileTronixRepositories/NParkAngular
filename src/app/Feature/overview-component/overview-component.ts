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
import { OverviewKpiCardComponent } from './components/kpi-card/overview-kpi-card.component';
import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  signal,
  computed,
  HostListener,
  AfterViewInit,
} from '@angular/core';
import gsap from 'gsap';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { LanguageService } from '../../Services/i18n/language-service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { OverviewTourService } from '../../Services/OverView/overview-tour.service';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';

type NotificationType = 'IN' | 'OUT' | 'COLLECTED';
type MembershipViewType = 'active' | 'inactive' | 'expiring';
type TicketsTodayTooltipType = 'entry' | 'exit';
type GateTabType = 'entry' | 'exit' | 'all';
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
  imports: [
    CommonModule,
    TranslatePipePipe,
    FormsModule,
    TicketDetailsModalBlockComponent,
    OverviewKpiCardComponent,
  ],
  templateUrl: './overview-component.html',
  styleUrls: ['./overview-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          overview: 'لوحة المعلومات',
          commandCenterTitle: 'لوحة متابعة العمليات',
          commandCenterSubtitle: 'نظرة شاملة على حالة المواقف والحركة والإيرادات',
          welcomeBack: 'مرحبًا بعودتك',
          todayStats: 'إحصائيات اليوم',
          totalRevenue: 'إجمالي الإيرادات',
          collected: 'محصّل',
          pending: 'معلّق',
          occupancy: 'معدل الإشغال',
          parkingStatus: 'حالة الموقف',
          occupiedSpaces: 'أماكن مشغولة',
          availableSpaces: 'أماكن متاحة',
          totalCapacity: 'إجمالي السعة',
          inside: 'داخل',
          free: 'فارغ',
          ticketsToday: 'التذاكر الصادرة',
          entry: 'دخول',
          exit: 'خروج',
          active: 'نشط',
          inactive: 'غير نشط',
          memberships: 'الاشتراكات النشطة',
          customersAndSubscriptions: 'الاشتراكات والعملاء',
          revenueByCustomerType: 'الإيرادات حسب نوع العميل (ج.م)',
          subscriptionStatus: 'حالة الاشتراكات (بالعدد)',
          total: 'الإجمالي',
          expiringNext7Days: 'تنتهي خلال 7 أيام',
          revenueBreakdown: 'أنواع العملاء',
          financialBreakdown: 'التحليل المالي',
          collectionRate: 'نسبة التحصيل',
          membershipRevenue: 'إيراد الاشتراكات',
          walkInRevenue: 'إيراد الزوار',
          liveInOut: 'حركة الدخول والخروج',
          in: 'دخول',
          out: 'خروج',
          exceedAnalytics: 'تحليل الغرامات',
          exceededTickets: 'تذاكر عليها غرامة',
          totalExceed: 'إجمالي الغرامات',
          avgPerTicket: 'متوسط التذكرة / المعاملة',
          durationStats: 'إحصائيات المدة',
          avgDuration: 'متوسط المدة',
          maxDuration: 'أقصى مدة',
          minutes: 'دقيقة',
          gatePerformance: 'أداء البوابات',
          entryGates: 'بوابات الدخول',
          exitGates: 'بوابات الخروج',
          allGates: 'الكل',
          gateNumber: 'البوابة',
          gateType: 'النوع',
          tickets: 'التذاكر',
          totalPrice: 'المبلغ الكلي',
          collectedPrice: 'المحصّل',
          supervisor: 'المشرف',
          topPerformers: 'أعلى الأداء',
          additionalMetrics: 'مؤشرات إضافية',
          busiestGate: 'أكثر بوابة نشاطًا',
          topCollector: 'أفضل محصّل',
          amount: 'المبلغ',
          recentTickets: 'آخر العمليات',
          id: 'المعرّف',
          plate: 'اللوحة',
          action: 'الإجراء',
          gate: 'البوابة',
          time: 'الوقت',
          IN: 'دخول',
          OUT: 'خروج',
          loading: 'جاري التحميل...',
          refreshing: 'جارٍ التحديث...',
          error: 'حدث خطأ في تحميل البيانات',
          retry: 'إعادة المحاولة',
          egp: 'ج.م',
          count: 'العدد',
          percentage: 'النسبة',
          selectedDate: 'التاريخ',
          fromDate: 'من',
          toDate: 'إلى',
          applyDate: 'عرض',
          filters: 'الفترة الزمنية',
          clearSearch: 'مسح البحث',
          viewDetails: 'عرض التفاصيل',
          ticketBaseRevenue: 'إيرادات التذاكر',
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
          noDataAvailable: 'لا توجد بيانات متاحة لهذه الفترة',
          noCollectionsYet: 'لا يوجد تحصيل بعد',
          notAvailable: 'غير متاح',
          topExceedCollector: 'أفضل مشرف غرامات',
          transactions: 'معاملات',
          notif_in_title: 'تذكرة دخول جديدة',
          notif_out_title: 'تذكرة خروج',
          notif_collected_title: 'تحصيل تذكرة',
          showMoreDetails: 'عرض تفاصيل أكثر',
          helpTour: 'شرح الواجهة',
        },
        en: {
          overview: 'Dashboard',
          commandCenterTitle: 'Operations Command Center',
          commandCenterSubtitle: 'Comprehensive overview of parking status, traffic, and revenue',
          welcomeBack: 'Welcome Back',
          todayStats: "Today's Statistics",
          totalRevenue: 'Total Revenue',
          collected: 'Collected',
          pending: 'Pending',
          occupancy: 'Occupancy Rate',
          parkingStatus: 'Parking Occupancy',
          occupiedSpaces: 'Occupied',
          availableSpaces: 'Available',
          totalCapacity: 'Total Capacity',
          inside: 'Inside',
          free: 'Free',
          ticketsToday: 'Issued Tickets',
          entry: 'Entry',
          exit: 'Exit',
          active: 'Active',
          inactive: 'Inactive',
          memberships: 'Active Subscriptions',
          customersAndSubscriptions: 'Subscriptions & Customers',
          revenueByCustomerType: 'Revenue by Customer Type (EGP)',
          subscriptionStatus: 'Subscription Counts',
          total: 'Total',
          expiringNext7Days: 'Expiring in 7 days',
          revenueBreakdown: 'Customer Types',
          financialBreakdown: 'Financial Breakdown',
          collectionRate: 'Collection Rate',
          membershipRevenue: 'Membership Revenue',
          walkInRevenue: 'Walk-in Revenue',
          liveInOut: 'Entry & Exit Activity',
          in: 'Entry',
          out: 'Exit',
          exceedAnalytics: 'Fine Analytics',
          exceededTickets: 'Fined Tickets',
          totalExceed: 'Total Fines',
          avgPerTicket: 'Avg / Ticket & Tx',
          durationStats: 'Duration Stats',
          avgDuration: 'Avg Duration',
          maxDuration: 'Max Duration',
          minutes: 'min',
          gatePerformance: 'Gate Performance',
          entryGates: 'Entry Gates',
          exitGates: 'Exit Gates',
          allGates: 'All',
          gateNumber: 'Gate',
          gateType: 'Type',
          tickets: 'Tickets',
          totalPrice: 'Total',
          collectedPrice: 'Collected',
          supervisor: 'Supervisor',
          topPerformers: 'Top Performers',
          additionalMetrics: 'Additional Metrics',
          busiestGate: 'Busiest Gate',
          topCollector: 'Top Collector',
          amount: 'Amount',
          recentTickets: 'Recent Activity',
          id: 'ID',
          plate: 'Plate',
          action: 'Action',
          gate: 'Gate',
          time: 'Time',
          IN: 'IN',
          OUT: 'OUT',
          loading: 'Loading...',
          refreshing: 'Refreshing...',
          error: 'Error loading data',
          retry: 'Retry',
          egp: 'EGP',
          count: 'Count',
          percentage: 'Percentage',
          selectedDate: 'Date',
          fromDate: 'From',
          toDate: 'To',
          applyDate: 'Apply',
          filters: 'Date Range',
          clearSearch: 'Clear search',
          viewDetails: 'View details',
          ticketBaseRevenue: 'Ticket Revenue',
          totalExceedRevenue: 'Fine Revenue',
          collectedExceedRevenue: 'Collected Fines',
          pendingExceedRevenue: 'Pending Fines',
          ticketEnterToday: 'Entry Today',
          ticketEnterNotTodayButNotExitYet: 'Prior Still Inside',
          exitTicketsCount: 'Exit Today',
          pendingPrice: 'Outstanding',
          collectors: 'Collectors',
          supervisors: 'Supervisors',
          exitedTickets: 'Exited Tickets',
          exceedTransactions: 'Fine Transactions',
          noDataAvailable: 'No data available for this period',
          noCollectionsYet: 'No collections yet',
          notAvailable: 'N/A',
          topExceedCollector: 'Top Fine Supervisor',
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
    private readonly hostRef: ElementRef<HTMLElement>,
  ) {}

  private gsapCtx: gsap.Context | null = null;
  private hasAnimatedInitialEntrance = false;

  // ===== State =====
  dashboard = signal<DashboardDto | null>(null);
  loading = signal<boolean>(false);
  refreshing = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  selectedDashboardFrom = this.toDateInputValue(this.firstDayOfMonth(new Date()));
  selectedDashboardTo = this.toDateInputValue(new Date());

  // Local Presentation State
  activeGateTab = signal<GateTabType>('entry');
  mobileFiltersOpen = signal<boolean>(false);
  expandedGateKey = signal<string | null>(null);

  // Tickets lists
  ticketsInside = signal<TicketInsideParkDto[]>([]);
  todayEntryTickets = signal<TicketAdminDto[]>([]);
  todayExitTickets = signal<TicketAdminDto[]>([]);

  // Membership details
  activeMemberships = signal<ActiveMembershipDto[]>([]);
  inactiveMemberships = signal<InactiveMembershipDto[]>([]);
  expiringMemberships = signal<ExpiringMembershipDto[]>([]);

  // Hover hint (preserved for compatibility)
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

  // Tooltips (preserved for compatibility)
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
    return total > 0 ? Math.min(100, (this.collectedRevenue() / total) * 100) : 0;
  });

  currentVehiclesInside = computed(() => this.dashboard()?.currentVehiclesInside ?? 0);
  estimatedFreeSlots = computed(() => this.dashboard()?.estimatedFreeSlots ?? 0);
  occupancyPercentage = computed(() => this.dashboard()?.occupancyPercentage ?? 0);
  totalCapacity = computed(() => this.currentVehiclesInside() + this.estimatedFreeSlots());

  ticketEnterToday = computed(() => this.dashboard()?.ticketEnterToday ?? 0);
  ticketEnterNotTodayButNotExitYet = computed(
    () => this.dashboard()?.ticketEnterNotTodayButNotExitYet ?? 0,
  );
  enterTicketsCount = computed(() => this.ticketEnterToday());
  exitTicketsCount = computed(() => this.dashboard()?.exitTicketsCount ?? 0);
  activeTicketsCount = computed(() => this.dashboard()?.activeTicketsCount ?? 0);
  ticketFlowCount = computed(
    () =>
      this.activeTicketsCount() ||
      this.ticketEnterToday() + this.ticketEnterNotTodayButNotExitYet() + this.exitTicketsCount(),
  );

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
    const total = this.membershipRelatedRevenue() + this.walkInRevenue();
    return total > 0 ? (this.membershipRelatedRevenue() / total) * 100 : 0;
  });

  walkInRevenuePercent = computed(() => {
    const total = this.membershipRelatedRevenue() + this.walkInRevenue();
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

  // Occupancy Gauge SVG Geometry (radius 54)
  readonly occupancyGaugeRadius = 54;
  readonly occupancyGaugeCirc = 2 * Math.PI * 54;
  occupancyGaugeOffset = computed(() => {
    const pct = Math.max(0, Math.min(100, this.occupancyPercentage()));
    return this.occupancyGaugeCirc * (1 - pct / 100);
  });
  occupancyTone = computed<'green' | 'amber' | 'red'>(() => {
    const pct = this.occupancyPercentage();
    if (pct >= 85) return 'red';
    if (pct >= 65) return 'amber';
    return 'green';
  });

  // Customer Split Donut Geometry (radius 46)
  readonly customerDonutRadius = 46;
  readonly customerDonutCirc = 2 * Math.PI * 46;
  membershipStroke = computed(
    () => (this.membershipRevenuePercent() / 100) * this.customerDonutCirc,
  );
  walkInStroke = computed(() => (this.walkInRevenuePercent() / 100) * this.customerDonutCirc);
  walkInRotateDeg = computed(() => -90 + (this.membershipRevenuePercent() / 100) * 360);

  // Activity Max Reference
  liveMaxCount = computed(() =>
    Math.max(
      this.ticketEnterToday(),
      this.exitTicketsCount(),
      this.ticketEnterNotTodayButNotExitYet(),
      1,
    ),
  );

  // Financial Max Reference
  financialMaxAmount = computed(() =>
    Math.max(this.totalRevenue(), this.ticketBaseRevenue(), this.totalExceedRevenue(), 1),
  );

  @HostListener('window:resize')
  onResize(): void {
    // Layout is pure CSS Grid/Flexbox; keep hook for future chart sizing if needed.
  }

  barPercent(value: number, max: number): number {
    if (max <= 0 || value <= 0) return 0;
    return Math.min(100, Math.max(2, (value / max) * 100));
  }

  setGateTab(tab: GateTabType): void {
    this.activeGateTab.set(tab);
    this.expandedGateKey.set(null);
    requestAnimationFrame(() => this.animateGateTabChange());
  }

  toggleGateRow(key: string): void {
    this.expandedGateKey.update((current) => (current === key ? null : key));
  }

  toggleMobileFilters(): void {
    this.mobileFiltersOpen.update((open) => !open);
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
    this.gsapCtx?.revert();
    this.hubSubscriptions.unsubscribe();
    this.dashboardHub.stop();
    this.overviewTour.cancelTour();
  }

  ngAfterViewInit(): void {
    // No JS dimension hacks needed; SVG viewBox scales responsively.
  }

  // ===== GSAP Data-Load & Refresh Animations =====
  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private animateDashboardEntrance(): void {
    if (this.prefersReducedMotion()) return;
    const root = this.hostRef.nativeElement;
    this.gsapCtx?.revert();

    const origin = this.lang.isRTL() ? 'right center' : 'left center';

    this.gsapCtx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.from('app-overview-kpi-card', {
        y: 18,
        opacity: 0,
        duration: 0.45,
        stagger: 0.06,
        clearProps: 'transform,opacity',
      })
        .from(
          '.ops-grid > .panel-card',
          {
            y: 20,
            opacity: 0,
            duration: 0.48,
            stagger: 0.08,
            clearProps: 'transform,opacity',
          },
          '-=0.25',
        )
        .from(
          '.progress-fill',
          {
            scaleX: 0,
            transformOrigin: origin,
            duration: 0.65,
            stagger: 0.05,
            ease: 'power2.out',
            clearProps: 'transform',
          },
          '-=0.3',
        )
        .from(
          '.gauge-progress',
          {
            attr: { 'stroke-dashoffset': this.occupancyGaugeCirc },
            duration: 0.8,
            ease: 'power2.out',
          },
          '-=0.55',
        )
        .from(
          '.secondary-grid > .panel-card',
          {
            y: 16,
            opacity: 0,
            duration: 0.44,
            stagger: 0.08,
            clearProps: 'transform,opacity',
          },
          '-=0.45',
        )
        .from(
          '.metric-cell',
          {
            y: 12,
            opacity: 0,
            duration: 0.36,
            stagger: 0.045,
            clearProps: 'transform,opacity',
          },
          '-=0.25',
        );
    }, root);
  }

  private animateDataRefresh(): void {
    if (this.prefersReducedMotion()) return;
    const root = this.hostRef.nativeElement;
    const origin = this.lang.isRTL() ? 'right center' : 'left center';

    gsap.context(() => {
      gsap.fromTo(
        '.kpi-value, .bar-metric__value, .fin-row__amount, .gauge-percent',
        { y: 6, opacity: 0.45 },
        {
          y: 0,
          opacity: 1,
          duration: 0.34,
          stagger: 0.02,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
        },
      );

      gsap.fromTo(
        '.progress-fill',
        { scaleX: 0.15, transformOrigin: origin },
        {
          scaleX: 1,
          duration: 0.5,
          stagger: 0.03,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      );
    }, root);
  }

  private animateGateTabChange(): void {
    if (this.prefersReducedMotion()) return;
    const root = this.hostRef.nativeElement;

    gsap.fromTo(
      root.querySelectorAll('.gate-table-block'),
      { y: 10, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.28,
        stagger: 0.05,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      },
    );
  }

  // ===== Help Tour =====
  startAdminTour(): void {
    this.overviewTour.startTour();
  }

  // ===== API =====
  loadDashboard(): void {
    const isInitialLoad = !this.dashboard();
    if (isInitialLoad) {
      this.loading.set(true);
    } else {
      this.refreshing.set(true);
    }
    this.errorMessage.set(null);

    this.normalizeDashboardDateRange();

    this.overviewServices
      .getDashboard(this.selectedDashboardFrom, this.selectedDashboardTo)
      .subscribe({
        next: (dto) => {
          this.loading.set(false);
          this.refreshing.set(false);
          this.dashboard.set(dto);

          this.syncOccupancyWithTicketsInside();
          this.loadTodayTickets();
          this.loadMembershipDetails();

          requestAnimationFrame(() => {
            if (!this.hasAnimatedInitialEntrance) {
              this.hasAnimatedInitialEntrance = true;
              this.animateDashboardEntrance();
            } else {
              this.animateDataRefresh();
            }
          });
        },
        error: (err) => {
          console.error('Error loading dashboard', err);
          this.loading.set(false);
          this.refreshing.set(false);
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

  // ===== Tickets Today (click -> modal) =====
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

  private firstDayOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private normalizeDashboardDateRange(): void {
    if (this.selectedDashboardFrom && this.selectedDashboardTo) {
      if (this.selectedDashboardFrom > this.selectedDashboardTo) {
        this.selectedDashboardTo = this.selectedDashboardFrom;
      }
      return;
    }

    if (!this.selectedDashboardFrom && this.selectedDashboardTo) {
      this.selectedDashboardFrom = this.selectedDashboardTo;
    }

    if (this.selectedDashboardFrom && !this.selectedDashboardTo) {
      this.selectedDashboardTo = this.selectedDashboardFrom;
    }
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

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.searchAttempted = false;
    this.searchingTickets = false;
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
    this.selectedTicket.set(ticket);
    this.activeModal.set('ticketDetails');
    this.clearSearch();
  }

  // ===== Notifications =====
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

    return `${collectorLabel} - ${amountPart}`;
  }
}
