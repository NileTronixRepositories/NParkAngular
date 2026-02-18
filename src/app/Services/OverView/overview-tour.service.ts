import { Injectable, Injector, afterNextRender, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../../Services/i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

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
    this.tour?.cancel();
  }

  private startAfterRender(stepId?: string): void {
    afterNextRender(
      () => {
        queueMicrotask(() => {
          this.tour?.start();
          if (stepId) this.tour?.show(stepId);
        });
      },
      { injector: this.injector },
    );
  }

  private waitForElement(selector: string, timeoutMs = 2500): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = performance.now();

      const tick = () => {
        const el = document.querySelector(selector);
        if (el) return resolve();

        if (performance.now() - start > timeoutMs) {
          return reject(new Error(`Shepherd target not found: ${selector}`));
        }
        requestAnimationFrame(tick);
      };

      tick();
    });
  }

  private buildTour(): void {
    const stepClass = this.isRTL ? 'np-shepherd-step np-shepherd-rtl' : 'np-shepherd-step';

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        arrow: true,
        modalOverlayOpeningPadding: 8,
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
              options: { boundary: 'viewport', padding: 8 },
            },
            {
              name: 'flip',
              options: { padding: 8 },
            },
          ],
        },
      },
    } as any);

    const stepsData: Array<{
      id: string;
      titleAr: string;
      titleEn: string;
      textAr: string;
      textEn: string;
      attachTo: string;
      position: Placement;
      hasBack?: boolean;
    }> = [
      {
        id: 'overview-help',
        titleAr: 'شرح لوحة المعلومات',
        titleEn: 'Overview help tour',
        textAr: 'من هنا تقدر تشغّل شرح تفاعلي سريع لواجهة لوحة المعلومات في أي وقت.',
        textEn:
          'You can start an interactive guided tour of this dashboard from this Help button at any time.',
        attachTo: '.btn-help-tour',
        position: 'bottom',
        hasBack: false,
      },
      {
        id: 'overview-header',
        titleAr: 'لوحة المعلومات',
        titleEn: 'Dashboard header',
        textAr: 'هنا عنوان لوحة المعلومات مع وصف سريع لكونها ملخص لإحصائيات اليوم.',
        textEn: "Here you see the dashboard title and a short description of today's statistics.",
        attachTo: '.page-header',
        position: 'bottom',
      },
      {
        id: 'overview-search',
        titleAr: 'البحث عن التذاكر',
        titleEn: 'Ticket search',
        textAr: 'استخدم البحث للعثور السريع على تذكرة عن طريق رقم التذكرة أو اللوحة أو رقم الكارت.',
        textEn: 'Use this search box to quickly find a ticket by ticket number, plate, or card.',
        attachTo: '.header-search-main',
        position: 'bottom',
      },
      {
        id: 'overview-kpis',
        titleAr: 'المؤشرات الرئيسية (KPIs)',
        titleEn: 'Key KPIs',
        textAr:
          'هذه الكروت تعرض أهم الأرقام: إجمالي الإيرادات، الإشغال، عدد التذاكر اليوم، وحالة الاشتراكات.',
        textEn:
          "These cards show the main KPIs: total revenue, occupancy, today's tickets, and memberships.",
        attachTo: '.overview-kpi-section',
        position: 'top',
      },
      {
        id: 'overview-revenue',
        titleAr: 'أنواع العملاء والإيرادات',
        titleEn: 'Revenue breakdown',
        textAr: 'هنا ترى كيف يتوزع الدخل بين الاشتراكات والزوار، مع عدد التذاكر وقيمة كل نوع.',
        textEn: 'Here you can see how revenue is split between memberships and walk-in customers.',
        attachTo: '.overview-revenue-card',
        position: 'top',
      },
      {
        id: 'overview-live',
        titleAr: 'الدخول/الخروج المباشر',
        titleEn: 'Live In/Out',
        textAr: 'الشارت الحي يوضح عدد التذاكر الداخلة والخارجة الآن، ويتحدث تلقائيًا.',
        textEn:
          'This live chart shows how many tickets are entering and exiting right now, updating automatically.',
        attachTo: '.live-card',
        position: 'top',
      },
      {
        id: 'overview-gates',
        titleAr: 'أداء البوابات',
        titleEn: 'Gate performance',
        textAr:
          'هذه الجداول تعرض أداء بوابات الدخول والخروج، وأعلى البوابات نشاطًا، وإحصائيات التجاوزات.',
        textEn:
          'These tables show how each gate is performing plus analytics about exceeded tickets.',
        attachTo: '.overview-entry-gates-card',
        position: 'top',
      },
    ];

    const totalSteps = stepsData.length;

    stepsData.forEach((step, index) => {
      const stepNum = index + 1;
      const isLast = index === totalSteps - 1;

      const progress = `<span class="step-badge" dir="ltr">${stepNum}/${totalSteps}</span>`;
      const fullTitleAr = `${step.titleAr} ${progress}`;
      const fullTitleEn = `${step.titleEn} ${progress}`;

      this.addStep({
        id: step.id,
        title: this.t(fullTitleAr, fullTitleEn),
        text: this.t(step.textAr, step.textEn),
        attachTo: step.attachTo,
        position: step.position,
        hasBack: step.hasBack !== false,
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
    hasBack?: boolean;
    isLast?: boolean;
  }): void {
    const buttons: any[] = [];

    if (config.hasBack) {
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
      buttons.push({ text: finishText, action: () => this.tour?.complete() });
    } else {
      const nextText = this.isRTL
        ? `التالي <i class="bi bi-arrow-left"></i>`
        : `Next <i class="bi bi-arrow-right"></i>`;
      buttons.push({ text: nextText, action: () => this.tour?.next() });
    }

    this.tour?.addStep({
      id: config.id,
      title: config.title,
      text: config.text,
      attachTo: { element: config.attachTo, on: config.position },
      buttons,

      beforeShowPromise: () => this.waitForElement(config.attachTo).catch(() => undefined),
    });
  }
}
