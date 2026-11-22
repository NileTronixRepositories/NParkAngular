import { Injectable, Injector, afterNextRender, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../../Services/i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TourStepDefinition {
  id: string;
  titleAr: string;
  titleEn: string;
  textAr: string;
  textEn: string;
  attachTo: string;
  position: Placement;
}

@Injectable({ providedIn: 'root' })
export class OverviewTourService {
  private tour: any | null = null;

  private readonly lang = inject(LanguageService);
  private readonly injector = inject(Injector);

  constructor() {
    effect(
      () => {
        this.lang.currentSignal();

        if (this.tour?.isActive()) {
          const stepId = this.tour.getCurrentStep()?.id as string | undefined;
          this.tour.cancel();

          this.buildTour();
          this.startAfterRender(stepId);
        }
      },
      { injector: this.injector },
    );
  }

  private get isRTL(): boolean {
    return this.lang.isRTL();
  }

  private t(ar: string, en: string): string {
    return this.isRTL ? ar : en;
  }

  startTour(): void {
    if (this.tour?.isActive()) this.tour.cancel();
    this.buildTour();
    this.startAfterRender();
  }

  cancelTour(): void {
    if (this.tour?.isActive()) {
      this.tour.cancel();
    }
  }

  private startAfterRender(stepId?: string): void {
    afterNextRender(
      () => {
        queueMicrotask(() => {
          if (!this.tour) return;
          this.tour.start();
          if (stepId) {
            const exists = this.tour.steps?.some((s: any) => s.id === stepId);
            if (exists) this.tour.show(stepId);
          }
        });
      },
      { injector: this.injector },
    );
  }

  private isElementVisible(selector: string): boolean {
    if (typeof document === 'undefined') return false;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private buildTour(): void {
    const stepClass = this.isRTL ? 'np-shepherd-step np-shepherd-rtl' : 'np-shepherd-step';

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      keyboardNavigation: true,
      defaultStepOptions: {
        arrow: true,
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 10,
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        canClickTarget: false,
        classes: stepClass,
        popperOptions: {
          strategy: 'fixed',
          modifiers: [
            {
              name: 'computeStyles',
              options: { gpuAcceleration: false },
            },
            {
              name: 'preventOverflow',
              options: { boundary: 'viewport', padding: 12 },
            },
            {
              name: 'flip',
              options: { padding: 12 },
            },
          ],
        },
      },
    } as any);

    const allSteps: TourStepDefinition[] = [
      {
        id: 'overview-search',
        titleAr: 'البحث السريع عن التذاكر',
        titleEn: 'Quick Ticket Search',
        textAr:
          'ابحث فورًا عن أي تذكرة باستخدام رقم التذكرة أو رقم اللوحة أو الكارت، واضغط على النتيجة لعرض تفاصيلها الكاملة.',
        textEn:
          'Search instantly for any ticket by ticket number, plate, or card, then click a result to inspect its full details.',
        attachTo: '.header-search-main',
        position: 'bottom',
      },
      {
        id: 'overview-date-range',
        titleAr: 'فلتر الفترة الزمنية',
        titleEn: 'Date Range Filter',
        textAr:
          'حدد تاريخ البداية والنهاية ثم اضغط «عرض» لتحديث جميع الإحصائيات والإيرادات وأداء البوابات لهذه الفترة.',
        textEn:
          'Choose a start and end date and click Apply to refresh all metrics, revenue figures, and gate stats for that period.',
        attachTo: '.dashboard-date-range',
        position: 'bottom',
      },
      {
        id: 'overview-kpis',
        titleAr: 'المؤشرات الرئيسية (KPIs)',
        titleEn: 'Primary KPIs',
        textAr:
          'ملخص فوري لأهم 4 مؤشرات: إجمالي الإيرادات، معدل الإشغال، التذاكر الصادرة، والاشتراكات النشطة — ويمكنك الضغط على المؤشرات التفاعلية لعرض التفاصيل.',
        textEn:
          'Instant summary of the 4 core KPIs: Total Revenue, Occupancy Rate, Issued Tickets, and Active Subscriptions — click interactive items to drill down.',
        attachTo: '.overview-kpi-section',
        position: 'bottom',
      },
      {
        id: 'overview-live',
        titleAr: 'حركة الدخول والخروج المباشرة',
        titleEn: 'Live Entry & Exit Activity',
        textAr:
          'يعرض مقارنة فورية بين دخول اليوم، خروج اليوم، والمركبات التي دخلت سابقًا ولم تخرج بعد، مع تحديث لحظي عبر SignalR.',
        textEn:
          'Compares today’s entries, exits, and prior vehicles still inside in real time via SignalR updates.',
        attachTo: '.live-card',
        position: 'bottom',
      },
      {
        id: 'overview-occupancy',
        titleAr: 'حالة الموقف ونسبة الإشغال',
        titleEn: 'Parking Occupancy',
        textAr:
          'يوضح نسبة الإشغال الحالية، عدد الأماكن المشغولة والمتاحة وإجمالي السعة، مع زر سريع لعرض السيارات الموجودة بالداخل الآن.',
        textEn:
          'Displays current occupancy percentage, occupied vs. available spaces, and total capacity with quick access to parked vehicles.',
        attachTo: '.occupancy-panel',
        position: 'bottom',
      },
      {
        id: 'overview-financial',
        titleAr: 'التحليل المالي',
        titleEn: 'Financial Breakdown',
        textAr:
          'يفصل إيرادات التذاكر الأساسية وإجمالي الغرامات والإيراد الكلي، مع توضيح المبالغ المحصّلة والمعلّقة ونسبة التحصيل.',
        textEn:
          'Breaks down base ticket revenue, fine revenue, and total revenue with collected vs. pending amounts and collection rate.',
        attachTo: '.overview-revenue-summary-section',
        position: 'bottom',
      },
      {
        id: 'overview-gates',
        titleAr: 'أداء البوابات (الدخول والخروج)',
        titleEn: 'Gate Performance',
        textAr:
          'تنقّل بسهولة بين تبويب بوابات الدخول، بوابات الخروج، أو الكل لمتابعة عدد التذاكر والمحصّل وغير المحصّل وأداء المحصّلين والمشرفين.',
        textEn:
          'Switch between Entry Gates, Exit Gates, or All to review ticket counts, collected/pending totals, collectors, and supervisors.',
        attachTo: '.gate-performance-card',
        position: 'top',
      },
      {
        id: 'overview-customers',
        titleAr: 'الاشتراكات والعملاء',
        titleEn: 'Subscriptions & Customers',
        textAr:
          'يعرض توزيع الإيرادات والتذاكر بين المشتركين والزوار، مع اختصارات فورية لقوائم الاشتراكات النشطة وغير النشطة والمنتهية خلال 7 أيام.',
        textEn:
          'Shows revenue and ticket distribution between subscribers and walk-ins, plus quick access to active, inactive, and expiring memberships.',
        attachTo: '.overview-revenue-card',
        position: 'top',
      },
      {
        id: 'overview-additional',
        titleAr: 'مؤشرات إضافية',
        titleEn: 'Additional Metrics',
        textAr:
          'شريط مدمج يجمع متوسط وأقصى مدة وقوف، أكثر بوابة نشاطًا، أفضل محصّل، أفضل مشرف غرامات، ومتوسط الغرامات في مكان واحد.',
        textEn:
          'A compact strip consolidating average/max parking duration, busiest gate, top collector, top fine supervisor, and fine averages.',
        attachTo: '.additional-metrics-panel',
        position: 'top',
      },
    ];

    // Only include steps whose target element is currently visible in the DOM (no 2.5s freezes!)
    const visibleSteps = allSteps.filter((step) => this.isElementVisible(step.attachTo));
    const stepsToUse = visibleSteps.length > 0 ? visibleSteps : allSteps;
    const totalSteps = stepsToUse.length;

    stepsToUse.forEach((step, index) => {
      const stepNum = index + 1;
      const isFirst = index === 0;
      const isLast = index === totalSteps - 1;

      const progress = `<span class="step-badge" dir="ltr">${stepNum}/${totalSteps}</span>`;
      const fullTitleAr = `<span class="step-title-text">${step.titleAr}</span> ${progress}`;
      const fullTitleEn = `<span class="step-title-text">${step.titleEn}</span> ${progress}`;

      this.addStep({
        id: step.id,
        title: this.t(fullTitleAr, fullTitleEn),
        text: this.t(step.textAr, step.textEn),
        attachTo: step.attachTo,
        position: step.position,
        isFirst,
        isLast,
      });
    });
  }

  private addStep(config: {
    id: string;
    title: string;
    text: string;
    attachTo: string;
    position: Placement;
    isFirst: boolean;
    isLast: boolean;
  }): void {
    const buttons: any[] = [];

    if (!config.isLast) {
      buttons.push({
        text: this.t('تخطي', 'Skip'),
        action: () => this.tour?.cancel(),
        classes: 'shepherd-button-skip',
      });
    }

    if (!config.isFirst) {
      const backText = this.isRTL
        ? `<i class="bi bi-arrow-right"></i> السابق`
        : `<i class="bi bi-arrow-left"></i> Previous`;

      buttons.push({
        text: backText,
        action: () => this.tour?.back(),
        classes: 'shepherd-button-secondary',
      });
    }

    if (config.isLast) {
      const finishText = this.isRTL
        ? `إنهاء <i class="bi bi-check-lg"></i>`
        : `Finish <i class="bi bi-check-lg"></i>`;
      buttons.push({
        text: finishText,
        action: () => this.tour?.complete(),
        classes: 'shepherd-button-finish',
      });
    } else {
      const nextText = this.isRTL
        ? `التالي <i class="bi bi-arrow-left"></i>`
        : `Next <i class="bi bi-arrow-right"></i>`;
      buttons.push({
        text: nextText,
        action: () => this.tour?.next(),
      });
    }

    this.tour?.addStep({
      id: config.id,
      title: config.title,
      text: config.text,
      attachTo: { element: config.attachTo, on: config.position },
      buttons,
    });
  }
}
