import { CommonModule } from '@angular/common';
import { Component, computed, signal, Inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LanguageService } from '../../Services/i18n/language-service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { DashboardDto, OverviewTicketDto, GateTicketsSummaryDto } from '../../Domain/OverView/overview.model';
import { OverviewServices } from '../../Services/OverView/overview-services';

@Component({
  selector: 'app-overview-component',
  standalone: true,
  imports: [CommonModule, TranslatePipePipe],
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
          memberships: 'الاشتراكات',
          total: 'الإجمالي',
          expiringNext7Days: 'تنتهي خلال 7 أيام',
          revenueBreakdown: 'تفصيل الإيرادات',
          membershipRevenue: 'إيراد الاشتراكات',
          walkInRevenue: 'إيراد الزوار',
          liveInOut: 'الدخول/الخروج المباشر',
          in: 'دخول',
          out: 'خروج',
          exceedAnalytics: 'تحليل التجاوزات',
          exceededTickets: 'تذاكر متجاوزة',
          totalExceed: 'إجمالي التجاوزات',
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
          topPerformers: 'الأفضل أداءً',
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
          memberships: 'Memberships',
          total: 'Total',
          expiringNext7Days: 'Expiring in 7 days',
          revenueBreakdown: 'Revenue Breakdown',
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
          topPerformers: 'Top Performers',
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
        },
      }),
    },
  ],
})
export class OverviewComponent implements OnInit {
  // Expose Math to template
  protected readonly Math = Math;

  constructor(
    public readonly lang: LanguageService,
    @Inject(I18N_DICT) private readonly dict: I18nDict,
    private readonly overviewServices: OverviewServices
  ) {}

  // ===== State =====
  dashboard = signal<DashboardDto | null>(null);
  loading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  // ===== Computed Properties =====
  
  // Revenue metrics
  totalRevenue = computed(() => this.dashboard()?.totalRevenue ?? 0);
  collectedRevenue = computed(() => this.dashboard()?.collectedRevenue ?? 0);
  pendingRevenue = computed(() => this.dashboard()?.pendingRevenue ?? 0);
  collectedPercent = computed(() => {
    const total = this.totalRevenue();
    return total > 0 ? (this.collectedRevenue() / total) * 100 : 0;
  });

  // Occupancy metrics
  currentVehiclesInside = computed(() => this.dashboard()?.currentVehiclesInside ?? 0);
  estimatedFreeSlots = computed(() => this.dashboard()?.estimatedFreeSlots ?? 0);
  occupancyPercentage = computed(() => this.dashboard()?.occupancyPercentage ?? 0);
  totalCapacity = computed(() => this.currentVehiclesInside() + this.estimatedFreeSlots());

  // Tickets metrics
  enterTicketsCount = computed(() => this.dashboard()?.enterTicketsCount ?? 0);
  exitTicketsCount = computed(() => this.dashboard()?.exitTicketsCount ?? 0);
  activeTicketsCount = computed(() => this.dashboard()?.activeTicketsCount ?? 0);

  // Membership metrics
  subscriptionCount = computed(() => this.dashboard()?.subscriptionCount ?? 0);
  membershipsExpiringNext7Days = computed(() => this.dashboard()?.membershipsExpiringNext7Days ?? 0);
  membershipTicketsCount = computed(() => this.dashboard()?.membershipTicketsCount ?? 0);
  walkInTicketsCount = computed(() => this.dashboard()?.walkInTicketsCount ?? 0);

  // Revenue breakdown
  membershipRelatedRevenue = computed(() => this.dashboard()?.membershipRelatedRevenue ?? 0);
  walkInRevenue = computed(() => this.dashboard()?.walkInRevenue ?? 0);
  membershipRevenuePercent = computed(() => {
    const total = this.totalRevenue();
    return total > 0 ? (this.membershipRelatedRevenue() / total) * 100 : 0;
  });
  walkInRevenuePercent = computed(() => {
    const total = this.totalRevenue();
    return total > 0 ? (this.walkInRevenue() / total) * 100 : 0;
  });

  // Exceed analytics
  exceededTicketsCount = computed(() => this.dashboard()?.exceededTicketsCount ?? 0);
  totalExceedRevenue = computed(() => this.dashboard()?.totalExceedRevenue ?? 0);
  averageExceedPerTicket = computed(() => this.dashboard()?.averageExceedPerTicket ?? 0);

  // Duration stats
  averageDurationMinutes = computed(() => this.dashboard()?.averageDurationMinutes ?? 0);
  maxDurationMinutes = computed(() => this.dashboard()?.maxDurationMinutes ?? 0);
  averageDurationHours = computed(() => Math.floor(this.averageDurationMinutes() / 60));
  averageDurationRemainingMinutes = computed(() => this.averageDurationMinutes() % 60);
  maxDurationHours = computed(() => Math.floor(this.maxDurationMinutes() / 60));
  maxDurationRemainingMinutes = computed(() => this.maxDurationMinutes() % 60);

  // Top performers
  busiestGateNumber = computed(() => this.dashboard()?.busiestGateNumber ?? 0);
  busiestGateTicketsCount = computed(() => this.dashboard()?.busiestGateTicketsCount ?? 0);
  topCollectorName = computed(() => this.dashboard()?.topCollectorName ?? 'N/A');
  topCollectorAmount = computed(() => this.dashboard()?.topCollectorAmount ?? 0);
  topCollectorTicketsCount = computed(() => this.dashboard()?.topCollectorTicketsCount ?? 0);

  // Gates
  entryGates = computed(() => this.dashboard()?.entryGates ?? []);
  exitGates = computed(() => this.dashboard()?.exitGates ?? []);

  // Recent tickets
  recentTickets = computed(() => this.dashboard()?.recentTickets ?? []);

  // Charts
  chartHours = computed(() => this.dashboard()?.chartHours ?? []);
  chartIn = computed(() => this.dashboard()?.chartIn ?? []);
  chartOut = computed(() => this.dashboard()?.chartOut ?? []);

  // Donut chart for revenue breakdown
  donutRadius = 58;
  donutCirc = computed(() => 2 * Math.PI * this.donutRadius);
  membershipStroke = computed(() => (this.membershipRevenuePercent() / 100) * this.donutCirc());
  walkInStroke = computed(() => (this.walkInRevenuePercent() / 100) * this.donutCirc());
  walkInRotateDeg = computed(() => -90 + (this.membershipRevenuePercent() / 100) * 360);

  // Line chart for live in/out
  lineChartWidth = 420;
  lineChartHeight = 200;
  linePadding = 20;

  inPoints = computed(() => this.buildLinePoints(this.chartIn()));
  outPoints = computed(() => this.buildLinePoints(this.chartOut()));

  private buildLinePoints(series: number[]): string {
    if (!series || series.length === 0) return '';

    const w = this.lineChartWidth - this.linePadding * 2;
    const h = this.lineChartHeight - this.linePadding * 2;
    const maxVal = Math.max(...this.chartIn(), ...this.chartOut(), 1);
    const stepX = w / Math.max(series.length - 1, 1);

    return series
      .map((v, i) => {
        const x = this.linePadding + i * stepX;
        const y = this.linePadding + (1 - v / maxVal) * h;
        return `${x},${y}`;
      })
      .join(' ');
  }

  // ===== Lifecycle =====
  ngOnInit(): void {
    this.loadDashboard();
  }

  // ===== API =====
  loadDashboard(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.overviewServices.getDashboard().subscribe({
      next: (dto) => {
        this.loading.set(false);
        this.dashboard.set(dto);
      },
      error: (err) => {
        console.error('Error loading dashboard', err);
        this.loading.set(false);
        this.errorMessage.set('Failed to load dashboard');
      },
    });
  }

  // ===== Helpers =====
  formatCurrency(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }
}
