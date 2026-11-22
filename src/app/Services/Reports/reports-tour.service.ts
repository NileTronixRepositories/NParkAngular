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

  startTour(): void {
    if (this.tour?.isActive()) this.tour.cancel();
    this.buildTour();
    this.startAfterRender();
  }

  cancelTour(): void {
    this.tour?.cancel();
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

  private waitForElement(selector: string, timeoutMs = 2500): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = performance.now();

      const tick = () => {
        const el = document.querySelector(selector);
        if (el) return resolve();

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

    const stepsData: Array<{
      id: string;
      titleAr: string;
      titleEn: string;
      textAr: string;
      textEn: string;
      attachTo: string;
      position: Placement;
      hasBack?: boolean;
    }> = [
      {
        id: 'reports-help',
        titleAr: 'دليل صفحة التقارير',
        titleEn: 'Reports Page Guide',
        textAr: 'من هنا تقدر تشغّل الشرح التفاعلي لصفحة التقارير في أي وقت.',
        textEn: 'You can start the interactive guided tour of the Reports page from this Help button at any time.',
        attachTo: '.reports-theme .btn-help-tour',
        position: 'bottom',
        hasBack: false,
      },
      {
        id: 'reports-header',
        titleAr: 'عنوان الصفحة',
        titleEn: 'Page Header',
        textAr: 'هنا اسم صفحة التقارير. يمكنك أيضًا تصدير البيانات كـ PDF أو Excel من أزرار التصدير.',
        textEn: 'This is the Reports page header. You can also export data as PDF or Excel using the export buttons.',
        attachTo: '.reports-theme .page-header',
        position: 'bottom',
      },
      {
        id: 'reports-export-pdf',
        titleAr: 'تصدير PDF',
        titleEn: 'Export as PDF',
        textAr: 'انقر هنا لتصدير نتائج التقرير الحالية كملف PDF جاهز للطباعة.',
        textEn: 'Click here to export the current report results as a print-ready PDF file.',
        attachTo: '.reports-theme .btn-export-pdf',
        position: 'bottom',
      },
      {
        id: 'reports-export-excel',
        titleAr: 'تصدير Excel',
        titleEn: 'Export as Excel',
        textAr: 'انقر هنا لتصدير نتائج التقرير كملف Excel للتحليل والمعالجة.',
        textEn: 'Click here to export the report results as an Excel file for further analysis.',
        attachTo: '.reports-theme .btn-export-excel',
        position: 'bottom',
      },
      {
        id: 'reports-filters',
        titleAr: 'قسم الفلاتر',
        titleEn: 'Filters Section',
        textAr:
          'استخدم هذا القسم لتصفية التقارير. حدد تاريخ البداية والنهاية أو ابحث بأي قيمة مدعومة مثل رقم التذكرة، العربية، الكارت، المستخدم، المحصل، البوابة، أو الحالة.',
        textEn:
          'Use this section to filter reports. Set a date range or search any supported value such as ticket, vehicle, card, user, collector, gate, or status.',
        attachTo: '.reports-theme .reports-filters-card',
        position: 'bottom',
      },
      {
        id: 'reports-date-from',
        titleAr: 'تاريخ البداية',
        titleEn: 'Date From',
        textAr: 'اختر تاريخ بداية الفترة الزمنية التي تريد عرض تقاريرها.',
        textEn: 'Select the start date of the period you want to view reports for.',
        attachTo: '.reports-theme .reports-date-from',
        position: 'bottom',
      },
      {
        id: 'reports-date-to',
        titleAr: 'تاريخ النهاية',
        titleEn: 'Date To',
        textAr: 'اختر تاريخ نهاية الفترة الزمنية. يجب أن يكون بعد تاريخ البداية.',
        textEn: 'Select the end date of the period. It must be after the start date.',
        attachTo: '.reports-theme .reports-date-to',
        position: 'bottom',
      },
      {
        id: 'reports-search-box',
        titleAr: 'البحث النصي',
        titleEn: 'Text Search',
        textAr:
          'اكتب رقم السيارة، رقم التذكرة، رقم الكارت، اسم المستخدم أو المحصل، رقم البوابة، أو كلمات مثل داخل، خرج، مشترك، زائر، محصل، غير محصل.',
        textEn:
          'Type a vehicle, ticket, card, user, collector, gate number, or keywords like inside, exited, subscriber, visitor, collected, or pending.',
        attachTo: '.reports-theme .reports-search-box',
        position: 'bottom',
      },
      {
        id: 'reports-search-btn',
        titleAr: 'زر البحث والمسح',
        titleEn: 'Search & Clear Buttons',
        textAr: 'اضغط "بحث" لتحميل التقارير بناءً على الفلاتر المحددة، أو "مسح" لإعادة تعيين الفلاتر.',
        textEn: 'Press "Search" to load reports based on the selected filters, or the clear button to reset filters.',
        attachTo: '.reports-theme .reports-action-btns',
        position: 'bottom',
      },
      {
        id: 'reports-table',
        titleAr: 'جدول التقارير',
        titleEn: 'Reports Table',
        textAr:
          'هنا تظهر نتائج التذاكر: رقم التذكرة، رقم المركبة، تاريخ الدخول والخروج، نوع العميل، اسم المحصل، والسعر.',
        textEn:
          'Here you see ticket results: ticket number, vehicle number, entry & exit dates, customer type, collector name, and price.',
        attachTo: '.reports-theme #reports-table-to-export',
        position: 'top',
      },
    ];

    const totalSteps = stepsData.length;

    stepsData.forEach((step, index) => {
      const stepNum = index + 1;
      const isLast = index === totalSteps - 1;

      const progress = `<span class="step-badge" dir="ltr">${stepNum}/${totalSteps}</span>`;
      const fullTitleAr = `${step.titleAr} ${progress}`;
      const fullTitleEn = `${step.titleEn} ${progress}`;

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
    position: Placement;
    hasBack?: boolean;
    isLast?: boolean;
  }): void {
    const buttons: any[] = [];

    if (config.hasBack) {
      const backText = this.isRTL
        ? `<i class="fa-solid fa-arrow-right"></i> السابق`
        : `<i class="fa-solid fa-arrow-left"></i> Previous`;

      buttons.push({
        text: backText,
        action: () => this.tour?.back(),
        classes: 'shepherd-button-secondary',
      });
    }

    if (config.isLast) {
      const finishText = this.isRTL
        ? `إنهاء <i class="fa-solid fa-check"></i>`
        : `Finish <i class="fa-solid fa-check"></i>`;
      buttons.push({ text: finishText, action: () => this.tour?.complete() });
    } else {
      const nextText = this.isRTL
        ? `التالي <i class="fa-solid fa-arrow-left"></i>`
        : `Next <i class="fa-solid fa-arrow-right"></i>`;
      buttons.push({ text: nextText, action: () => this.tour?.next() });
    }

    this.tour?.addStep({
      id: config.id,
      title: config.title,
      text: config.text,
      attachTo: { element: config.attachTo, on: config.position },
      buttons,
      beforeShowPromise: () => this.waitForElement(config.attachTo).catch(() => undefined),
    });
  }
}
