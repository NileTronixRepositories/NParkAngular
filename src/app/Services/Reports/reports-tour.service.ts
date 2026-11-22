import { Injectable, Injector, afterNextRender, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { animateShepherdStep } from '../Shared/tour-animation.helper';
import { LanguageService } from '../i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

@Injectable({ providedIn: 'root' })
export class ReportsTourService {
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

  private isElementVisible(selector: string): boolean {
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  }

  startTour(): void {
    this.cancelTour();
    this.buildTour();
    this.startAfterRender();
  }

  cancelTour(): void {
    if (this.tour?.isActive()) {
      this.tour.cancel();
    }
    this.tour = null;
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

  private waitForElement(selector: string, timeoutMs = 2000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      const tick = () => {
        if (this.isElementVisible(selector)) return resolve();
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
      keyboardNavigation: true,
      defaultStepOptions: {
        arrow: true,
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 12,
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        canClickTarget: false,
        classes: stepClass,
        when: { show: () => animateShepherdStep(this.tour?.getCurrentStep()) },
        popperOptions: {
          strategy: 'fixed',
          modifiers: [
            { name: 'computeStyles', options: { gpuAcceleration: false } },
            { name: 'preventOverflow', options: { boundary: 'viewport', padding: 12 } },
            { name: 'flip', options: { padding: 12 } },
          ],
        },
      },
    } as any);

    const rawSteps: Array<{
      id: string;
      titleAr: string;
      titleEn: string;
      textAr: string;
      textEn: string;
      attachTo: string;
      position: Placement;
    }> = [
      {
        id: 'reports-filters',
        titleAr: 'فلاتر البحث والتاريخ',
        titleEn: 'Date & Search Filters',
        textAr:
          'حدد فترة التاريخ أو ابحث برقم التذكرة، المركبة، الكارت، المحصل، أو البوابة لتصفية النتائج بدقة.',
        textEn:
          'Set a date range or search by ticket, vehicle, card, collector, or gate to filter results accurately.',
        attachTo: '.reports-theme .reports-filters-card',
        position: 'bottom',
      },
      {
        id: 'reports-actions',
        titleAr: 'تنفيذ البحث والمسح',
        titleEn: 'Search & Clear',
        textAr: 'اضغط "بحث" لجلب النتائج حسب الفلاتر، أو زر المسح لإعادة ضبط جميع الفلاتر.',
        textEn: 'Click Search to load matching records, or Clear to reset all filters.',
        attachTo: '.reports-theme .reports-action-btns',
        position: 'bottom',
      },
      {
        id: 'reports-export-pdf',
        titleAr: 'تصدير PDF',
        titleEn: 'Export PDF',
        textAr: 'صدّر نتائج التقرير الحالية كملف PDF منسق وجاهز للطباعة.',
        textEn: 'Export the current report results as a print-ready PDF file.',
        attachTo: '.reports-theme .btn-export-pdf',
        position: 'bottom',
      },
      {
        id: 'reports-export-excel',
        titleAr: 'تصدير Excel',
        titleEn: 'Export Excel',
        textAr: 'صدّر التقرير كملف Excel للمراجعة والتحليل المالي.',
        textEn: 'Export the report as an Excel sheet for review and financial analysis.',
        attachTo: '.reports-theme .btn-export-excel',
        position: 'bottom',
      },
      {
        id: 'reports-table',
        titleAr: 'جدول التقارير والتفاصيل',
        titleEn: 'Reports Table & Details',
        textAr:
          'تعرض هنا كل الحركات المطابقة. اضغط على أي سطر لفتح تفاصيل التذكرة والمرفقات.',
        textEn:
          'All matching transactions appear here. Click any row to open full ticket details and attachments.',
        attachTo: '.reports-theme #reports-table-to-export',
        position: 'top',
      },
    ];

    const activeSteps = rawSteps.filter((s) => this.isElementVisible(s.attachTo));
    const total = activeSteps.length;

    activeSteps.forEach((step, idx) => {
      const stepNum = idx + 1;
      const isFirst = idx === 0;
      const isLast = idx === total - 1;
      const badge = `<span class="step-badge" dir="ltr">${stepNum} / ${total}</span>`;

      const buttons: any[] = [];

      if (!isLast) {
        buttons.push({
          text: this.t('تخطي', 'Skip'),
          classes: 'shepherd-button-skip',
          action: () => this.tour?.cancel(),
        });
      }

      if (!isFirst) {
        buttons.push({
          text: this.isRTL
            ? `<i class="fa-solid fa-arrow-right"></i> السابق`
            : `<i class="fa-solid fa-arrow-left"></i> Previous`,
          classes: 'shepherd-button-secondary',
          action: () => this.tour?.back(),
        });
      }

      if (isLast) {
        buttons.push({
          text: this.isRTL
            ? `إنهاء <i class="fa-solid fa-check"></i>`
            : `Finish <i class="fa-solid fa-check"></i>`,
          classes: 'shepherd-button-finish',
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
        id: step.id,
        title: `${this.t(step.titleAr, step.titleEn)} ${badge}`,
        text: this.t(step.textAr, step.textEn),
        attachTo: { element: step.attachTo, on: step.position },
        buttons,
        beforeShowPromise: () => this.waitForElement(step.attachTo).catch(() => undefined),
      });
    });
  }
}
