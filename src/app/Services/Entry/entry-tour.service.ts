import { Injectable, Injector, afterNextRender, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { animateShepherdStep } from '../Shared/tour-animation.helper';
import { LanguageService } from '../../Services/i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TourStepDef {
  id: string;
  titleAr: string;
  titleEn: string;
  textAr: string;
  textEn: string;
  attachTo: string;
  position: Placement;
}

@Injectable({
  providedIn: 'root',
})
export class EntryTourService {
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

  private pos(base: Placement): Placement {
    if (base === 'top' || base === 'bottom') return base;
    if (!this.isRTL) return base;
    return base === 'left' ? 'right' : 'left';
  }

  startTour(): void {
    if (this.tour?.isActive()) {
      this.tour.cancel();
    }
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
        when: { show: () => animateShepherdStep(this.tour?.getCurrentStep()) },
        popperOptions: {
          strategy: 'fixed',
          modifiers: [
            {
              name: 'computeStyles',
              options: { gpuAcceleration: false },
            },
            {
              name: 'preventOverflow',
              options: { boundary: 'viewport', padding: 14 },
            },
            {
              name: 'flip',
              options: { padding: 14 },
            },
          ],
        },
      },
    } as any);

    const allSteps: TourStepDef[] = [
      {
        id: 'entry-search',
        titleAr: 'البحث السريع عن التذاكر',
        titleEn: 'Quick Ticket Search',
        textAr: 'ابحث عن أي تذكرة بسرعة باستخدام رقم التذكرة أو رقم اللوحة أو الكارت.',
        textEn: 'Quickly search for any ticket using its number, vehicle plate, or card.',
        attachTo: 'app-search-block-component',
        position: 'bottom',
      },
      {
        id: 'entry-gate-devices',
        titleAr: 'أجهزة البوابة',
        titleEn: 'Gate Devices',
        textAr:
          'هنا يتم عرض حالة الأجهزة المتصلة بالبوابة، الكاميرا الأمامية، وقراءة اللوحات (LPR) تلقائيًا.',
        textEn:
          'Displays connected gate devices, front camera snapshot, and automatic License Plate Recognition (LPR).',
        attachTo: 'app-gate-devices-block-component',
        position: 'right',
      },
      {
        id: 'entry-issue',
        titleAr: 'إصدار التذاكر',
        titleEn: 'Issue Ticket',
        textAr:
          'من هنا يمكنك اختيار التعريفة وإصدار تذكرة دخول جديدة أو قراءة كارت المشترك وفتح البوابة.',
        textEn:
          'Choose a tariff and issue a new entry ticket or scan a subscriber card to open the gate.',
        attachTo: 'app-issue-ticket-block-component',
        position: 'bottom',
      },
      {
        id: 'entry-list',
        titleAr: 'قائمة التذاكر والتحصيل',
        titleEn: 'Tickets List & Collection',
        textAr:
          'آخر التذاكر الصادرة اليوم تظهر هنا مع إجمالي الرسوم، ويمكنك عرض التفاصيل أو تحصيل اليومية.',
        textEn:
          'Today’s issued tickets and total fees appear here, with quick access to details and daily collection.',
        attachTo: 'app-tickets-table-block-component',
        position: 'left',
      },
    ];

    const visibleSteps = allSteps.filter((step) => this.isElementVisible(step.attachTo));
    const stepsToUse = visibleSteps.length > 0 ? visibleSteps : allSteps;
    const totalSteps = stepsToUse.length;

    stepsToUse.forEach((step, index) => {
      const stepNum = index + 1;
      const isFirst = index === 0;
      const isLast = index === totalSteps - 1;
      const progress = `<span class="step-badge" dir="ltr">${stepNum}/${totalSteps}</span>`;

      this.addStep({
        id: step.id,
        title: this.t(
          `<span class="step-title-text">${step.titleAr}</span> ${progress}`,
          `<span class="step-title-text">${step.titleEn}</span> ${progress}`,
        ),
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
      buttons.push({
        text: this.isRTL
          ? `<i class="fa-solid fa-arrow-right"></i> السابق`
          : `<i class="fa-solid fa-arrow-left"></i> Previous`,
        action: () => this.tour?.back(),
        classes: 'shepherd-button-secondary',
      });
    }

    if (config.isLast) {
      buttons.push({
        text: this.isRTL
          ? `إنهاء <i class="fa-solid fa-check"></i>`
          : `Finish <i class="fa-solid fa-check"></i>`,
        action: () => this.tour?.complete(),
        classes: 'shepherd-button-finish',
      });
    } else {
      buttons.push({
        text: this.isRTL
          ? `التالي <i class="fa-solid fa-arrow-left"></i>`
          : `Next <i class="fa-solid fa-arrow-right"></i>`,
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
