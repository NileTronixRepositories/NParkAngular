import { Injectable, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../i18n/language-service';

@Injectable({
  providedIn: 'root',
})
export class VisitorTourService {
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
              name: 'flip',
              options: {
                fallbackPlacements: [],
              },
            },
          ],
        },
      },
    } as any);

    // Visitor Page Steps
    const stepsData = [
      {
        id: 'visitor-help',
        titleAr: 'دليل شاشة الزوار',
        titleEn: 'Visitor Screen Guide',
        textAr: 'من هنا تقدر تشغل الشرح التفاعلي لشاشة الزوار في أي وقت.',
        textEn: 'You can start the interactive guide for the Visitor screen from here at any time.',
        attachTo: '.btn-help-tour',
        position: 'bottom',
        hasBack: false,
      },
      {
        id: 'visitor-header',
        titleAr: 'إدارة الزوار',
        titleEn: 'Visitor Management',
        textAr: 'هذه الشاشة تمكنك من عرض سجلات الزوار وتخصيص تسعيراتهم.',
        textEn: 'This screen allows you to view visitor records and customize their pricing.',
        attachTo: '.page-header',
        position: 'bottom',
      },
      {
        id: 'visitor-block1',
        titleAr: 'كل السجلات',
        titleEn: 'All Records',
        textAr: 'تعرض هذه القائمة جميع تسعيرات الزوار المتاحة. يمكنك البحث والفلترة.',
        textEn:
          'This list displays all available visitor pricing schemas. You can search and filter.',
        attachTo: '.col-xl-4:nth-child(1) .card',
        position: 'right',
      },
      {
        id: 'visitor-toolbar',
        titleAr: 'أدوات البحث',
        titleEn: 'Search Tools',
        textAr: 'استخدم شريط البحث للعثور بسرعة على تسعيرة، وزر التحديث لإعادة تحميل البيانات.',
        textEn:
          'Use the search bar to find a pricing schema quickly, and the reload button to refresh data.',
        attachTo: '.toolbar',
        position: 'bottom',
      },
      {
        id: 'visitor-block2',
        titleAr: 'القائمة المختارة',
        titleEn: 'Selected Order',
        textAr: 'هنا يتم تجميع التسعيرات التي اخترتها لترتيب ظهورها في النظام.',
        textEn:
          'Here you gather the pricing schemas you selected to order their appearance in the system.',
        attachTo: '.col-xl-4:nth-child(2) .card',
        position: 'top',
      },
      {
        id: 'visitor-block3',
        titleAr: 'التفاصيل',
        titleEn: 'Details',
        textAr: 'عند اختيار أي سجل، ستظهر تفاصيله الكاملة هنا للمراجعة.',
        textEn: 'When selecting any record, its full details will appear here for review.',
        attachTo: '.col-xl-4:nth-child(3) .card',
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
