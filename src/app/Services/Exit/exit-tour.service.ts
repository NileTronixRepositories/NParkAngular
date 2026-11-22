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
export class ExitTourService {
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
        id: 'exit-header-search',
        titleAr: 'بحث التذاكر من الهيدر',
        titleEn: 'Ticket Search In Header',
        textAr:
          'ابحث عن التذكرة برقم التذكرة أو اللوحة أو الكارت. نفس البحث يغذي قائمة التذاكر داخل بلوك الغرامات.',
        textEn:
          'Search by ticket, plate, or card number. It also updates the ticket list inside the fines block.',
        attachTo: '.search-header-container',
        position: 'bottom',
      },
      {
        id: 'exit-gate-connection',
        titleAr: 'بيانات اتصال البوابة',
        titleEn: 'Gate Connection Info',
        textAr:
          'هنا يظهر اتصال جهاز البوابة، كاميرا قراءة اللوحات، وطابعات QR والإيصال الخاصة ببوابة الخروج الحالية.',
        textEn:
          'Shows the connected PC, LPR camera, QR printer, and receipt printer for the current exit gate.',
        attachTo: '.gate-flow-panel',
        position: 'bottom',
      },
      {
        id: 'exit-devices-camera',
        titleAr: 'كاميرا الخروج و LPR',
        titleEn: 'Exit Camera & LPR',
        textAr:
          'تعرض صورة الكاميرا الأمامية وقراءة LPR للتأكد من السيارة قبل التحقق أو تسجيل الخروج.',
        textEn:
          'Displays the front camera image and LPR readings so you can verify the vehicle before exit.',
        attachTo: 'app-exit-gate-devices-block-component',
        position: 'right',
      },
      {
        id: 'exit-validation',
        titleAr: 'نتيجة التحقق',
        titleEn: 'Validation Result',
        textAr:
          'امسح QR أو أدخل رقم الكارت أو السيارة. بعد التحقق الصحيح يتم تسجيل خروج التذكرة وفتح البوابة.',
        textEn:
          'Scan a QR code or enter a card/plate number. Valid results record the exit and open the gate.',
        attachTo: 'app-exit-validation-block-component',
        position: 'bottom',
      },
      {
        id: 'exit-sanctions',
        titleAr: 'التذاكر والغرامات',
        titleEn: 'Tickets & Fines',
        textAr:
          'اختر التذكرة وحدد الغرامة المطلوبة ثم سجّل مبلغ الزيادة وتحصيله قبل الخروج عند الحاجة.',
        textEn:
          'Select a ticket, choose the applicable fine, and collect any exceed amount before exit.',
        attachTo: 'app-exit-sanctions-block-component',
        position: 'bottom',
      },
      {
        id: 'exit-list',
        titleAr: 'تذاكر الخروج والتحصيل',
        titleEn: 'Exit Tickets & Collection',
        textAr:
          'يعرض أحدث تذاكر الخروج وإجمالي رسوم اليوم، ومنه يبدأ تحصيل إيرادات اليوم بواسطة المشرف.',
        textEn:
          'Shows recent exit tickets and today’s total fees, where supervisors can start daily collection.',
        attachTo: 'app-exit-tickets-table-block-component',
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
