import { Injectable, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../../Services/i18n/language-service';

@Injectable({
  providedIn: 'root',
})
export class AltaeriffaTourService {
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

    // ===== تعريف خطوات تور صفحة التعريفة =====
    const stepsData = [
      {
        id: 'pricing-help',
        titleAr: 'دليل شاشة شرائح المحاسبة',
        titleEn: 'Pricing Screen Guide',
        textAr: 'من هنا تقدر تشغل الشرح التفاعلي لشاشة شرائح المحاسبة في أي وقت.',
        textEn: 'From here you can start the interactive guide for the pricing screen at any time.',
        attachTo: '.subscription-page .btn-help-tour',
        position: 'bottom' as const,
        hasBack: false,
      },
      {
        id: 'pricing-header',
        titleAr: 'عنوان الشاشة',
        titleEn: 'Page Header',
        textAr: 'هذا الجزء يوضح عنوان الشاشة ووصف مختصر لطريقة استخدام شرائح المحاسبة.',
        textEn:
          'This section shows the page title and a short description of how to use pricing schemes.',
        attachTo: '.subscription-page .page-header',
        position: 'bottom' as const,
      },
      {
        id: 'pricing-table-card',
        titleAr: 'جدول الشرائح',
        titleEn: 'Pricing Table',
        textAr:
          'هنا يتم عرض جميع شرائح المحاسبة مع نوع المدة، الوقت والسعر. يمكنك البحث والتعديل والحذف من هنا.',
        textEn:
          'Here you can see all pricing schemes with duration type, time window, and price. You can search, edit, or delete from here.',
        attachTo: '.subscription-page .subscription-table-card',
        position: 'right' as const,
      },
      {
        id: 'pricing-search',
        titleAr: 'البحث في الشرائح',
        titleEn: 'Search Schemes',
        textAr: 'استخدم مربع البحث للوصول لأي شريحة بسرعة عن طريق الاسم أو نوع المدة.',
        textEn: 'Use the search box to quickly find any scheme by name or duration type.',
        attachTo: '.subscription-page .search-wrap',
        position: 'bottom' as const,
      },
      {
        id: 'pricing-table-actions',
        titleAr: 'إجراءات التعديل والحذف',
        titleEn: 'Row Actions',
        textAr: 'من أزرار الإجراءات تقدر تعدل بيانات الشريحة أو تحذفها (مع رسالة تأكيد قبل الحذف).',
        textEn:
          'From the actions buttons you can edit the scheme data or delete it (with confirmation).',
        attachTo: '.subscription-page .subscription-actions',
        position: 'left' as const,
      },
      {
        id: 'pricing-form-card',
        titleAr: 'نموذج إضافة / تعديل شريحة',
        titleEn: 'Add / Edit Form',
        textAr: 'هذه النافذة الجانبية مخصصة لإضافة شريحة جديدة أو تعديل شريحة موجودة.',
        textEn: 'This side panel is used to add a new scheme or edit an existing one.',
        attachTo: '.subscription-page .subscription-form-card',
        position: 'left' as const,
      },
      {
        id: 'pricing-duration-toggle',
        titleAr: 'نوع المدة',
        titleEn: 'Duration Type',
        textAr:
          'من هنا تختار نوع المدة: بالساعات، بالأيام، أو بالسنين. كل اختيار يغير الحقول المطلوبة تلقائياً.',
        textEn:
          'Here you choose the duration type: hours, days, or year. Each option changes the required fields automatically.',
        attachTo: '.subscription-page .subscription-duration-toggle',
        position: 'bottom' as const,
      },
      {
        id: 'pricing-time-window',
        titleAr: 'نافذة الوقت (اختياري)',
        titleEn: 'Time Window (Optional)',
        textAr: 'لما تختار بالساعات بدون تكرار، تقدر تحدد وقت البداية والنهاية للشريحة من هنا.',
        textEn:
          'When you choose hourly without repetition, you can set the start and end time of the scheme here.',
        attachTo: '.subscription-page .subscription-time-window',
        position: 'bottom' as const,
      },
      {
        id: 'pricing-price-field',
        titleAr: 'حقل السعر',
        titleEn: 'Price Field',
        textAr: 'هنا تحدد سعر الشريحة. النظام يتحقق أن القيمة أكبر أو تساوي صفر قبل الحفظ.',
        textEn:
          'Here you set the scheme price. The system validates that the value is greater than or equal to zero before saving.',
        attachTo: '.subscription-page .subscription-price-field',
        position: 'top' as const,
      },
      {
        id: 'pricing-form-actions',
        titleAr: 'حفظ وإعادة ضبط',
        titleEn: 'Save & Reset',
        textAr:
          'زر "حفظ" يضيف أو يعدل الشريحة حسب الحالة، وزر "إعادة ضبط" يرجّع النموذج للحالة الافتراضية.',
        textEn:
          'The "Save" button adds or updates the scheme, and "Reset" clears the form back to defaults.',
        attachTo: '.subscription-page .subscription-form-actions',
        position: 'top' as const,
        isLast: true,
      },
    ];

    const totalSteps = stepsData.length;

    stepsData.forEach((step, index) => {
      const stepNum = index + 1;
      const isLast = index === totalSteps - 1;

      const progressBadge = `<span class="step-badge">${stepNum} / ${totalSteps}</span>`;
      const fullTitleAr = `${step.titleAr} ${progressBadge}`;
      const fullTitleEn = `${step.titleEn} ${progressBadge}`;

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
