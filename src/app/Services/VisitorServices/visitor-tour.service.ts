import { Injectable, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { animateShepherdStep } from '../Shared/tour-animation.helper';
import { LanguageService } from '../i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

@Injectable({
  providedIn: 'root',
})
export class VisitorTourService {
  private tour: any | null = null;
  private readonly lang = inject(LanguageService);

  constructor() {
    effect(() => {
      this.lang.isRTL();
      if (this.tour && this.tour.isActive()) {
        const currentId = this.tour.getCurrentStep()?.id;
        this.tour.cancel();
        this.buildTour();
        this.tour?.start();
        if (currentId) {
          this.tour?.show(currentId);
        }
      }
    });
  }

  private get isRTL(): boolean {
    return this.lang.isRTL();
  }

  private t(ar: string, en: string): string {
    return this.isRTL ? ar : en;
  }

  private isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth < 992;
  }

  private resolvePlacement(base: Placement): Placement {
    if (this.isMobile()) {
      return base === 'top' ? 'top' : 'bottom';
    }
    if (base === 'top' || base === 'bottom') {
      return base;
    }
    if (!this.isRTL) {
      return base;
    }
    return base === 'left' ? 'right' : 'left';
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
        id: 'visitor-records',
        titleAr: 'كل السجلات',
        titleEn: 'All Records',
        textAr: 'تعرض هذه القائمة جميع شرائح تسعير الزوار المتاحة. يمكنك البحث عنها أو تحديث القائمة في أي وقت.',
        textEn: 'This panel lists all available visitor pricing schemas. You can search or reload the list anytime.',
        attachTo: '.visitor-card--records',
        position: 'right',
      },
      {
        id: 'visitor-toolbar',
        titleAr: 'البحث والتحديث',
        titleEn: 'Search & Reload',
        textAr: 'ابحث باسم الشريحة للوصول السريع، أو اضغط زر التحديث لإعادة تحميل أحدث البيانات.',
        textEn: 'Search by schema name for quick access, or click reload to fetch the latest data.',
        attachTo: '.toolbar',
        position: 'bottom',
      },
      {
        id: 'visitor-order',
        titleAr: 'المختارة والترتيب',
        titleEn: 'Selected & Order',
        textAr: 'أضف الشرائح هنا واسحبها لإعادة الترتيب، ثم اضغط إرسال لحفظ ترتيب ظهورها في النظام.',
        textEn: 'Add schemas here, drag to reorder them, and click Submit to save their display order.',
        attachTo: '.visitor-card--order',
        position: 'left',
      },
      {
        id: 'visitor-details',
        titleAr: 'تفاصيل الشريحة',
        titleEn: 'Schema Details',
        textAr: 'عند اختيار أي سجل، تظهر تفاصيله الكاملة هنا (السعر، نوع المدة، الساعات، والتكرار).',
        textEn: 'Selecting any record displays its full details here (price, duration type, hours, and recurrence).',
        attachTo: '.visitor-card--details',
        position: 'left',
      },
    ];

    const activeSteps = rawSteps.filter((s) => this.isElementVisible(s.attachTo));
    const total = activeSteps.length;

    activeSteps.forEach((step, idx) => {
      const stepNum = idx + 1;
      const isFirst = idx === 0;
      const isLast = idx === total - 1;
      const badge = `<span class="step-badge">${stepNum} / ${total}</span>`;

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
        attachTo: {
          element: step.attachTo,
          on: this.resolvePlacement(step.position),
        },
        buttons,
        beforeShowPromise: () => this.waitForElement(step.attachTo).catch(() => undefined),
      });
    });
  }

  private waitForElement(selector: string, timeoutMs = 2000): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = performance.now();
      const tick = () => {
        if (this.isElementVisible(selector)) {
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
