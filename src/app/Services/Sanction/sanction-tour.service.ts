import { Injectable, Injector, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { animateShepherdStep } from '../Shared/tour-animation.helper';
import { LanguageService } from '../../Services/i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

@Injectable({ providedIn: 'root' })
export class SanctionTourService {
  private tour: any | null = null;
  private readonly lang = inject(LanguageService);
  private readonly injector = inject(Injector);

  constructor() {
    effect(
      () => {
        this.lang.currentSignal();
        if (this.tour && this.tour.isActive()) {
          const currentId = this.tour.getCurrentStep()?.id;
          this.tour.cancel();
          this.buildTour();
          this.tour?.start();
          if (currentId) {
            this.tour?.show(currentId);
          }
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

  private resolvePlacement(base: Placement): Placement {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      return base === 'top' ? 'top' : 'bottom';
    }
    if (base === 'top' || base === 'bottom') return base;
    if (!this.isRTL) return base;
    return base === 'left' ? 'right' : 'left';
  }

  startTour(): void {
    this.cancelTour();
    this.buildTour();
    this.tour?.start();
  }

  cancelTour(): void {
    if (this.tour && this.tour.isActive()) {
      this.tour.cancel();
    }
    this.tour = null;
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

    const stepsData: Array<{
      id: string;
      titleAr: string;
      titleEn: string;
      textAr: string;
      textEn: string;
      attachTo: string;
      position: Placement;
    }> = [
      {
        id: 'sanction-header',
        titleAr: 'إدارة الغرامات',
        titleEn: 'Fines Management',
        textAr: 'من هذه الشاشة يمكنك إضافة وتعديل وحذف الغرامات وتحديد قيمتها المالية.',
        textEn: 'From this screen you can add, edit, and delete parking fines and set their amounts.',
        attachTo: '.sanction-page .page-header',
        position: 'bottom',
      },
      {
        id: 'sanction-search',
        titleAr: 'البحث السريع في الغرامات',
        titleEn: 'Quick Search',
        textAr: 'ابحث عن أي غرامة بالاسم أو الوصف أو المبلغ للوصول إليها فوراً.',
        textEn: 'Search for any fine by name, description, or amount to find it instantly.',
        attachTo: '.sanction-page .sanction-search',
        position: 'bottom',
      },
      {
        id: 'sanction-add-btn',
        titleAr: 'إضافة غرامة جديدة',
        titleEn: 'Add New Fine',
        textAr: 'اضغط هنا لفتح نافذة إضافة غرامة جديدة مع تحديد اسمها وقيمتها.',
        textEn: 'Click here to open the modal for creating a new fine and setting its amount.',
        attachTo: '.sanction-page .btn-add-sanction',
        position: 'bottom',
      },
      {
        id: 'sanction-table',
        titleAr: 'قائمة الغرامات',
        titleEn: 'Fines List',
        textAr: 'تعرض جميع الغرامات المسجلة مع أزرار التعديل والحذف لكل غرامة.',
        textEn: 'Displays all registered fines with edit and delete actions for each fine.',
        attachTo: '.sanction-page .sanction-table-wrapper',
        position: 'top',
      },
    ];

    const totalSteps = stepsData.length;

    stepsData.forEach((step, index) => {
      const stepNum = index + 1;
      const isFirst = index === 0;
      const isLast = index === totalSteps - 1;
      const progressBadge = `<span class="step-badge">${stepNum} / ${totalSteps}</span>`;

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
        title: this.t(`${step.titleAr} ${progressBadge}`, `${step.titleEn} ${progressBadge}`),
        text: this.t(step.textAr, step.textEn),
        attachTo: { element: step.attachTo, on: this.resolvePlacement(step.position) },
        buttons,
        beforeShowPromise: () => this.waitForElement(step.attachTo).catch(() => undefined),
      });
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
