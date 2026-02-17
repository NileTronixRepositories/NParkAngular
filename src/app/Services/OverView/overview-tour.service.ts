import { Injectable, inject, effect, Injector } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../../Services/i18n/language-service';

@Injectable({
  providedIn: 'root',
})
export class OverviewTourService {
  private tour: any | null = null;
  private readonly lang = inject(LanguageService);
  private readonly injector = inject(Injector);

  constructor() {
    effect(
      () => {
        this.lang.currentSignal();

        if (this.tour && this.tour.isActive()) {
          const currentStepId = this.tour.getCurrentStep()?.id;
          this.tour.cancel();
          this.buildTour();
          this.tour.start();
          if (currentStepId) {
            this.tour.show(currentStepId);
          }
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

  private pos(base: 'top' | 'bottom' | 'left' | 'right'): string {
    if (base === 'bottom') return 'bottom-start';
    if (base === 'top') return 'top-start';
    return base;
  }

  startTour(): void {
    if (this.tour && this.tour.isActive()) {
      this.tour.cancel();
    }
    this.buildTour();
    this.tour?.start();
  }

  cancelTour(): void {
    this.tour?.cancel();
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
              name: 'flip',
              options: {
                fallbackPlacements: [],
              },
            },
          ],
        },
      },
    } as any);

    // تعريف الخطوات كـ Data
    const stepsData = [
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

    // Loop and add steps
    stepsData.forEach((step, index) => {
      const stepNum = index + 1;
      const isLast = index === totalSteps - 1;

      // Add "Step X of Y" to title
      const progressAr = `<span class="step-badge">${stepNum} / ${totalSteps}</span>`;
      const progressEn = `<span class="step-badge">${stepNum} / ${totalSteps}</span>`;

      const fullTitleAr = `${step.titleAr} ${progressAr}`;
      const fullTitleEn = `${step.titleEn} ${progressEn}`;

      this.addStep({
        id: step.id,
        title: this.t(fullTitleAr, fullTitleEn),
        text: this.t(step.textAr, step.textEn),
        attachTo: step.attachTo,
        position: step.position as any,
        hasBack: step.hasBack !== false,
        isLast: isLast,
      });
    });
  }

  private addStep(config: {
    id: string;
    title: string;
    text: string;
    attachTo: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    hasBack?: boolean;
    isLast?: boolean;
  }) {
    const buttons: { text: string; action: () => void; secondary?: boolean }[] = [];

    // Back Button with Icon
    if (config.hasBack) {
      const backText = this.isRTL
        ? `<i class="bi bi-arrow-right"></i> السابق`
        : `<i class="bi bi-arrow-left"></i> Previous`;

      buttons.push({
        text: backText,
        action: () => this.tour?.back(),
        secondary: true,
      } as any);
    }

    // Next / Finish Button with Icon
    if (config.isLast) {
      const finishText = this.isRTL
        ? `إنهاء <i class="bi bi-check-lg"></i>`
        : `Finish <i class="bi bi-check-lg"></i>`;

      buttons.push({
        text: finishText,
        action: () => this.tour?.complete(),
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
      attachTo: {
        element: config.attachTo,
        on: this.pos(config.position),
      },
      buttons,
    });
  }
}
