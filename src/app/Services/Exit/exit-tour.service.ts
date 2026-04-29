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
        titleAr: 'بوابة الخروج',
        titleEn: 'Exit Screen',
        textAr: 'هذه الشاشة مخصصة للتحقق من التذاكر، تسجيل الخروج، فتح البوابة، وتحصيل الغرامات.',
        textEn:
          'This screen validates tickets, records exits, opens the gate, and collects exceed fines.',
        attachTo: '.page-header',
        position: 'bottom',
      },
      {
        id: 'exit-gate-connection',
        titleAr: 'بيانات اتصال البوابة',
        titleEn: 'Gate Connection Info',
        textAr:
          'هنا يظهر عنوان جهاز الكمبيوتر، كاميرا قراءة اللوحات، وطابعات QR والإيصال للبوابة الحالية.',
        textEn:
          'This strip shows the PC, LPR camera, QR printer, and receipt printer connected to the current gate.',
        attachTo: '.gate-flow-panel',
        position: 'bottom',
      },
      {
        id: 'exit-header-search',
        titleAr: 'بحث التذاكر من الهيدر',
        titleEn: 'Ticket Search In Header',
        textAr:
          'استخدم هذا البحث للوصول للتذكرة برقم التذكرة أو اللوحة أو الكارت. نفس البحث يغذي قائمة التذاكر داخل بلوك الغرامات.',
        textEn:
          'Use this search by ticket, plate, or card number. It also drives the ticket list inside the fines block.',
        attachTo: '.search-header-container',
        position: 'left',
      },
      {
        id: 'exit-devices-camera',
        titleAr: 'كاميرا الخروج و LPR',
        titleEn: 'Exit Camera And LPR',
        textAr:
          'هنا تظهر صورة الكاميرا الأمامية وقراءة LPR. استخدمها للتأكد من السيارة قبل التحقق أو الخروج.',
        textEn:
          'This block shows the front camera image and LPR readings so the operator can verify the vehicle.',
        attachTo: 'app-exit-gate-devices-block-component',
        position: 'right',
      },
      {
        id: 'exit-validation',
        titleAr: 'نتيجة التحقق',
        titleEn: 'Validation Result',
        textAr:
          'امسح QR أو أدخل رقم الكارت أو رقم السيارة. بعد التحقق الصحيح يتم تسجيل خروج التذكرة ثم فتح البوابة.',
        textEn:
          'Scan a QR code or enter a card/vehicle number. A valid result records the ticket exit and opens the gate.',
        attachTo: 'app-exit-validation-block-component',
        position: 'top',
      },
      {
        id: 'exit-sanctions',
        titleAr: 'التذاكر والغرامات',
        titleEn: 'Tickets And Fines',
        textAr:
          'يعرض نتائج البحث في سطور مختصرة. اختر التذكرة، اختر الغرامة، ثم سجل مبلغ الزيادة قبل الخروج عند الحاجة.',
        textEn:
          'Search results are shown as compact rows. Select the ticket, choose the fine, then register the exceed amount when needed.',
        attachTo: 'app-exit-sanctions-block-component',
        position: 'top',
      },
      {
        id: 'exit-list',
        titleAr: 'تذاكر الخروج والتحصيل',
        titleEn: 'Exit Tickets And Collection',
        textAr:
          'يعرض أحدث تذاكر الخروج وإجمالي رسوم اليوم، ومنه يبدأ تحصيل زيادات الخروج بواسطة المشرف.',
        textEn:
          'Shows recent exit tickets and today’s total fees. Supervisors can start exceed collection from here.',
        attachTo: 'app-exit-tickets-table-block-component',
        position: 'top',
        isLast: true,
      },
    ];

    const totalSteps = stepsData.length;

    stepsData.forEach((step, index) => {
      const stepNum = index + 1;
      const isLast = index === totalSteps - 1;
      const progress = `<span class="step-badge">${stepNum} / ${totalSteps}</span>`;

      this.addStep({
        id: step.id,
        title: this.t(`${step.titleAr} ${progress}`, `${step.titleEn} ${progress}`),
        text: this.t(step.textAr, step.textEn),
        attachTo: step.attachTo,
        position: step.position as any,
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
    position: 'top' | 'bottom' | 'left' | 'right';
    hasBack?: boolean;
    isLast?: boolean;
  }) {
    const buttons: { text: string; action: () => void; secondary?: boolean }[] = [];

    if (config.hasBack) {
      buttons.push({
        text: this.isRTL
          ? `<i class="bi bi-arrow-right"></i> السابق`
          : `<i class="bi bi-arrow-left"></i> Previous`,
        action: () => this.tour?.back(),
        secondary: true,
      } as any);
    }

    if (config.isLast) {
      buttons.push({
        text: this.isRTL ? `إنهاء <i class="bi bi-check-lg"></i>` : `Finish <i class="bi bi-check-lg"></i>`,
        action: () => this.tour?.complete(),
      });
    } else {
      buttons.push({
        text: this.isRTL ? `التالي <i class="bi bi-arrow-left"></i>` : `Next <i class="bi bi-arrow-right"></i>`,
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
