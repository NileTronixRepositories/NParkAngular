import { Injectable, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { animateShepherdStep } from '../Shared/tour-animation.helper';
import { LanguageService } from '../../Services/i18n/language-service';

@Injectable({ providedIn: 'root' })
export class SanctionTourService {
  private tour: any | null = null;
  private readonly lang = inject(LanguageService);

  private get isRTL(): boolean {
    return this.lang.isRTL();
  }

  private t(ar: string, en: string): string {
    return this.isRTL ? ar : en;
  }

  private pos(base: 'top' | 'bottom' | 'left' | 'right'): string {
    if (base === 'top' || base === 'bottom') return base;
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
        id: 'sanction-help',
        titleAr: 'دليل شاشة الغرامات',
        titleEn: 'Fines Screen Guide',
        textAr: 'من هنا تقدر تشغل الشرح التفاعلي لشاشة الغرامات في أي وقت.',
        textEn: 'From here you can start the interactive guide for the Fines screen.',
        attachTo: '.sanction-page .btn-help-tour',
        position: 'bottom' as const,
        hasBack: false,
      },
      {
        id: 'sanction-header',
        titleAr: 'عنوان الشاشة',
        titleEn: 'Page Header',
        textAr: 'هذا الجزء يوضح عنوان شاشة الغرامات ووصف مختصر لطريقة استخدامها.',
        textEn: 'This section shows the page title and a short description of how to use it.',
        attachTo: '.sanction-page .page-header',
        position: 'bottom' as const,
      },
      {
        id: 'sanction-add-btn',
        titleAr: 'إضافة غرامة جديدة',
        titleEn: 'Add New Fine',
        textAr: 'اضغط هنا لفتح نموذج إضافة غرامة جديدة.',
        textEn: 'Click here to open the form for adding a new fine.',
        attachTo: '.sanction-page .btn-add-sanction',
        position: 'bottom' as const,
      },
      {
        id: 'sanction-search',
        titleAr: 'البحث في الغرامات',
        titleEn: 'Search Fines',
        textAr: 'استخدم مربع البحث للوصول لأي غرامة بسرعة عن طريق الاسم أو الوصف أو المبلغ.',
        textEn: 'Use the search box to quickly find any fine by name, description, or amount.',
        attachTo: '.sanction-page .sanction-search',
        position: 'bottom' as const,
      },
      {
        id: 'sanction-table',
        titleAr: 'جدول الغرامات',
        titleEn: 'Fines Table',
        textAr: 'هنا يتم عرض جميع الغرامات مع الاسم والوصف والمبلغ. يمكنك التعديل والحذف من هنا.',
        textEn:
          'Here you can see all fines with name, description, and amount. You can edit or delete from here.',
        attachTo: '.sanction-page .sanction-table-wrapper',
        position: 'top' as const,
        isLast: true,
      },
    ];

    const totalSteps = stepsData.length;

    stepsData.forEach((step, index) => {
      const stepNum = index + 1;
      const isLast = index === totalSteps - 1;
      const progressBadge = `<span class="step-badge">${stepNum} / ${totalSteps}</span>`;

      this.addStep({
        id: step.id,
        title: this.t(`${step.titleAr} ${progressBadge}`, `${step.titleEn} ${progressBadge}`),
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
    position: 'top' | 'bottom' | 'left' | 'right';
    hasBack?: boolean;
    isLast?: boolean;
  }) {
    const buttons: { text: string; action: () => void; secondary?: boolean }[] = [];

    if (config.hasBack) {
      buttons.push({
        text: this.isRTL
          ? `<i class="fa-solid fa-arrow-right"></i> السابق`
          : `<i class="fa-solid fa-arrow-left"></i> Previous`,
        action: () => this.tour?.back(),
        secondary: true,
      } as any);
    }

    if (config.isLast) {
      buttons.push({
        text: this.isRTL
          ? `إنهاء <i class="fa-solid fa-check"></i>`
          : `Finish <i class="fa-solid fa-check"></i>`,
        action: () => this.tour?.complete(),
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
      attachTo: { element: config.attachTo, on: this.pos(config.position) },
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
