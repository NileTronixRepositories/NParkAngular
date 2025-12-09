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
    // Automatically rebuild/restart tour if language changes while active
    effect(
      () => {
        // dep: access signal to track changes
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
      { injector: this.injector }
    );
  }

  private get isRTL(): boolean {
    return this.lang.isRTL();
  }

  private t(ar: string, en: string): string {
    return this.isRTL ? ar : en;
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

    // 1) Tour Button
    this.addStep({
      id: 'overview-help',
      titleAr: 'شرح لوحة المعلومات',
      titleEn: 'Overview help tour',
      textAr: 'من هنا تقدر تشغّل شرح تفاعلي سريع لواجهة لوحة المعلومات في أي وقت.',
      textEn:
        'You can start an interactive guided tour of this dashboard from this Help button at any time.',
      attachTo: '.btn-help-tour',
      position: 'bottom',
      hasBack: false,
    });

    // 2) Header
    this.addStep({
      id: 'overview-header',
      titleAr: 'لوحة المعلومات',
      titleEn: 'Dashboard header',
      textAr: 'هنا عنوان لوحة المعلومات مع وصف سريع لكونها ملخص لإحصائيات اليوم.',
      textEn: "Here you see the dashboard title and a short description of today's statistics.",
      attachTo: '.page-header',
      position: 'bottom',
    });

    // 3) Search
    this.addStep({
      id: 'overview-search',
      titleAr: 'البحث عن التذاكر',
      titleEn: 'Ticket search',
      textAr: 'استخدم البحث للعثور السريع على تذكرة عن طريق رقم التذكرة أو اللوحة أو رقم الكارت.',
      textEn: 'Use this search box to quickly find a ticket by ticket number, plate, or card.',
      attachTo: '.header-search-main',
      position: 'bottom',
    });

    // 4) KPIs
    this.addStep({
      id: 'overview-kpis',
      titleAr: 'المؤشرات الرئيسية (KPIs)',
      titleEn: 'Key KPIs',
      textAr:
        'هذه الكروت تعرض أهم الأرقام: إجمالي الإيرادات، الإشغال، عدد التذاكر اليوم، وحالة الاشتراكات.',
      textEn:
        "These cards show the main KPIs: total revenue, occupancy, today's tickets, and memberships.",
      attachTo: '.overview-kpi-section',
      position: 'top',
    });

    // 5) Revenue
    this.addStep({
      id: 'overview-revenue',
      titleAr: 'أنواع العملاء والإيرادات',
      titleEn: 'Revenue breakdown',
      textAr: 'هنا ترى كيف يتوزع الدخل بين الاشتراكات والزوار، مع عدد التذاكر وقيمة كل نوع.',
      textEn: 'Here you can see how revenue is split between memberships and walk-in customers.',
      attachTo: '.overview-revenue-card',
      position: 'top',
    });

    // 6) Live
    this.addStep({
      id: 'overview-live',
      titleAr: 'الدخول/الخروج المباشر',
      titleEn: 'Live In/Out',
      textAr: 'الشارت الحي يوضح عدد التذاكر الداخلة والخارجة الآن، ويتحدث تلقائيًا.',
      textEn:
        'This live chart shows how many tickets are entering and exiting right now, updating automatically.',
      attachTo: '.overview-live-card',
      position: 'top',
    });

    // 7) Gates
    this.addStep({
      id: 'overview-gates',
      titleAr: 'أداء البوابات',
      titleEn: 'Gate performance',
      textAr:
        'هذه الجداول تعرض أداء بوابات الدخول والخروج، وأعلى البوابات نشاطًا، وإحصائيات التجاوزات.',
      textEn:
        'These tables show how each gate is performing plus analytics about exceeded tickets.',
      attachTo: '.overview-entry-gates-card',
      position: 'top',
      isLast: true,
    });
  }

  // ======= Helper to reduce duplication =======
  private addStep(config: {
    id: string;
    titleAr: string;
    titleEn: string;
    textAr: string;
    textEn: string;
    attachTo: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    hasBack?: boolean;
    isLast?: boolean;
  }) {
    const buttons = [];

    // Back button
    if (config.hasBack !== false) {
      buttons.push({
        text: this.t('السابق', 'Previous'),
        action: () => this.tour?.back(),
      });
    }

    // Next/Finish button
    if (config.isLast) {
      buttons.push({
        text: this.t('إنهاء', 'Finish'),
        action: () => this.tour?.complete(),
      });
    } else {
      buttons.push({
        text: this.t('التالي', 'Next'),
        action: () => this.tour?.next(),
      });
    }

    this.tour.addStep({
      id: config.id,
      title: this.t(config.titleAr, config.titleEn),
      text: this.t(config.textAr, config.textEn),
      attachTo: {
        element: config.attachTo,
        on: config.position,
      },
      buttons: buttons,
    });
  }
}
