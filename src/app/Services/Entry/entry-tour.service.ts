import { Injectable, inject, Injector } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../../Services/i18n/language-service';

@Injectable({
  providedIn: 'root',
})
export class EntryTourService {
  private tour: any | null = null;
  private readonly lang = inject(LanguageService);

  private get isRTL(): boolean {
    return this.lang.isRTL();
  }

  private t(ar: string, en: string): string {
    return this.isRTL ? ar : en;
  }

  private pos(base: 'top' | 'bottom' | 'left' | 'right'): string {
    if (base === 'top' || base === 'bottom') return 'bottom';

    if (!this.isRTL) return base;

    if (base === 'left') return 'right';
    if (base === 'right') return 'left';

    return base;
  }

  startTour(): void {
    if (this.tour && this.tour.isActive()) {
      this.tour.cancel();
    }
    this.buildTour();
    this.tour?.start();
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

    // Entry Page Steps
    const stepsData = [
      {
        id: 'entry-help',
        titleAr: 'دليل شاشة الدخول',
        titleEn: 'Entry Screen Guide',
        textAr: 'من هنا تقدر تشغل الشرح التفاعلي لشاشة الدخول في أي وقت.',
        textEn: 'You can start the interactive guide for the Entry screen from here at any time.',
        attachTo: '.btn-help-tour',
        position: 'bottom',
        hasBack: false,
      },
      {
        id: 'entry-header',
        titleAr: 'شاشة الدخول',
        titleEn: 'Entry Screen',
        textAr: 'هذه الشاشة مخصصة لإدارة عمليات دخول المركبات وإصدار التذاكر.',
        textEn: 'This screen is dedicated to managing vehicle entries and issuing tickets.',
        attachTo: '.page-header',
        position: 'bottom',
      },
      {
        id: 'entry-gate-devices',
        titleAr: 'أجهزة البوابة',
        titleEn: 'Gate Devices',
        textAr: 'هنا يتم عرض حالة الأجهزة المتصلة بالبوابة، وقراءة اللوحات (LPR) تلقائياً.',
        textEn:
          'Here you can see the status of gate devices and automatic License Plate Recognition (LPR).',
        attachTo: 'app-gate-devices-block-component',
        position: 'right', // 'right' depends on layout, might need 'top' on mobile. auto-flip helps.
      },
      {
        id: 'entry-issue',
        titleAr: 'إصدار التذاكر',
        titleEn: 'Issue Ticket',
        textAr: 'من هنا يمكنك إصدار تذكرة جديدة يدوياً أو قراءة كارت المشترك.',
        textEn: 'Here you can manually issue a new ticket or read a subscriber card.',
        attachTo: 'app-issue-ticket-block-component',
        position: 'top',
      },
      {
        id: 'entry-list',
        titleAr: 'قائمة التذاكر',
        titleEn: 'Tickets List',
        textAr: 'آخر التذاكر التي تم إصدارها تظهر هنا، ويمكنك إعادة طباعتها أو تحصيلها.',
        textEn: 'Recently issued tickets appear here, where you can reprint or collect them.',
        attachTo: 'app-tickets-table-block-component',
        position: 'top',
      },
      {
        id: 'entry-search',
        titleAr: 'البحث',
        titleEn: 'Search',
        textAr: 'ابحث عن أي تذكرة بسرعة باستخدام الرقم أو اللوحة.',
        textEn: 'Quickly search for any ticket using its number or vehicle plate.',
        attachTo: 'app-search-block-component',
        position: 'left',
        isLast: true,
      },
    ];

    const totalSteps = stepsData.length;

    stepsData.forEach((step, index) => {
      const stepNum = index + 1;
      const isLast = index === totalSteps - 1;

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
      beforeShowPromise: () => this.waitForElement(config.attachTo).catch(() => undefined),
    });
  }

  private waitForElement(selector: string, timeoutMs = 2500): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = performance.now();

      const tick = () => {
        if (document.querySelector(selector)) {
          resolve();
          return;
        }

        if (performance.now() - start > timeoutMs) {
          reject(new Error(`Shepherd target not found: ${selector}`));
          return;
        }

        requestAnimationFrame(tick);
      };

      tick();
    });
  }
}
