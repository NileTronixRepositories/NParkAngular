import { Injectable, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../../Services/i18n/language-service';

@Injectable({
  providedIn: 'root',
})
export class ExitTourService {
  private tour: any | null = null;
  private readonly lang = inject(LanguageService);

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

    // Exit Page Steps
    const stepsData = [
      {
        id: 'exit-help',
        titleAr: 'دليل شاشة الخروج',
        titleEn: 'Exit Screen Guide',
        textAr: 'من هنا تقدر تشغل الشرح التفاعلي لشاشة الخروج في أي وقت.',
        textEn: 'You can start the interactive guide for the Exit screen from here at any time.',
        attachTo: '.btn-help-tour',
        position: 'bottom',
        hasBack: false,
      },
      {
        id: 'exit-header',
        titleAr: 'شاشة الخروج',
        titleEn: 'Exit Screen',
        textAr: 'هذه الشاشة مخصصة لإدارة عمليات خروج المركبات وتحصيل الرسوم.',
        textEn: 'This screen is dedicated to managing vehicle exits and collecting fees.',
        attachTo: '.page-header',
        position: 'bottom',
      },
      {
        id: 'exit-gate-devices',
        titleAr: 'أجهزة البوابة',
        titleEn: 'Gate Devices',
        textAr: 'هنا تظهر حالة الأجهزة ويمكنك البحث عن تذكرة برقمها مباشرة.',
        textEn: 'Here you can see device status and search for a ticket directly by number.',
        attachTo: 'app-exit-gate-devices-block-component',
        position: 'right',
      },
      {
        id: 'exit-scan',
        titleAr: 'مسح وتحصيل',
        titleEn: 'Scan & Collect',
        textAr: 'الجزء الأهم: امسح التذكرة (QR) أو الكارت لعرض التفاصيل والمبلغ المستحق والتحصيل.',
        textEn:
          'The main part: Scan the ticket (QR) or card to view details, due amount, and collect fees.',
        attachTo: 'app-exit-scan-collect-block-component',
        position: 'top',
      },
      {
        id: 'exit-list',
        titleAr: 'قائمة الخارجين',
        titleEn: 'Exit List',
        textAr: 'جدول يوضح آخر التذاكر التي خرجت وتم تحصيلها.',
        textEn: 'Table showing the most recent tickets that have exited and been collected.',
        attachTo: 'app-exit-tickets-table-block-component',
        position: 'top',
      },
      {
        id: 'exit-search',
        titleAr: 'البحث الشامل',
        titleEn: 'Global Search',
        textAr: 'بحث سريع عن أي تذكرة باستخدام الرقم، اللوحة، أوالكارت.',
        textEn: 'Quick search for any ticket using Number, Plate, or Card.',
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
    });
  }
}
