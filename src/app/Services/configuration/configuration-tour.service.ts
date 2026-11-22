import { Injectable, Injector, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { animateShepherdStep } from '../Shared/tour-animation.helper';
import { LanguageService } from '../i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface ConfigTourOptions {
  ensureStep1?: () => void;
  ensureStep2?: () => void;
  ensureModeEntry?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ConfigurationTourService {
  private tour: any | null = null;
  private readonly lang = inject(LanguageService);
  private readonly injector = inject(Injector);
  private options: ConfigTourOptions = {};

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

  startTour(options?: ConfigTourOptions): void {
    this.options = options ?? {};
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
    const stepClasses = this.isRTL ? 'np-shepherd-step np-shepherd-rtl' : 'np-shepherd-step';

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
        classes: stepClasses,
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

    const steps: Array<{
      id: string;
      titleAr: string;
      titleEn: string;
      textAr: string;
      textEn: string;
      attachTo: string;
      position: Placement;
      beforeShow?: () => void;
      waitForSelector?: string;
    }> = [
      {
        id: 'config-basics',
        titleAr: 'البيانات الأساسية',
        titleEn: 'Basic Settings',
        textAr: 'حدد عدد بوابات الدخول والخروج، والسعة المتاحة، وفترة السماح بالدقائق.',
        textEn: 'Set the number of entry/exit gates, parking capacity, and grace period in minutes.',
        attachTo: '.config-step1-form',
        position: 'bottom',
        beforeShow: () => this.options.ensureStep1?.(),
        waitForSelector: '.config-step1-form',
      },
      {
        id: 'config-mode',
        titleAr: 'مكان التحصيل وطريقة القراءة',
        titleEn: 'Collection & Capture Mode',
        textAr: 'اختر مكان التحصيل (عند الدخول أو الخروج) وطريقة قراءة المركبة ومحتوى التذكرة.',
        textEn: 'Choose collection point (entry or exit), vehicle capture mode, and ticket print options.',
        attachTo: '.config-operations-panel',
        position: 'bottom',
        beforeShow: () => this.options.ensureStep2?.(),
        waitForSelector: '.config-operations-panel',
      },
      {
        id: 'config-gates',
        titleAr: 'إعدادات البوابات والأجهزة',
        titleEn: 'Gate Hardware Settings',
        textAr: 'اضبط عناوين IP لأجهزة البوابات والطابعات وكاميرات ONVIF وتعيين المحصلين.',
        textEn: 'Configure gate PC/LPR IPs, printers, ONVIF cameras, and cashier assignments.',
        attachTo: '.config-gates-tabs',
        position: 'top',
        waitForSelector: '.config-gates-tabs',
      },
      {
        id: 'config-summary',
        titleAr: 'ملخص الإعدادات',
        titleEn: 'Configuration Summary',
        textAr: 'يعرض هذا الكارت ملخصاً فورياً لكل الإعدادات الحالية وتقدم الخطوات.',
        textEn: 'This sticky card gives a live summary of your current configuration and step progress.',
        attachTo: '.config-summary-card',
        position: 'right',
        waitForSelector: '.config-summary-card',
      },
    ];

    const total = steps.length;

    steps.forEach((step, idx) => {
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

      const beforeShowPromise = () => {
        if (step.beforeShow) step.beforeShow();
        if (!step.waitForSelector) {
          return new Promise<void>((resolve) => setTimeout(resolve, 60));
        }
        return new Promise<void>((resolve) => {
          const started = performance.now();
          const check = () => {
            if (document.querySelector(step.waitForSelector!)) return resolve();
            if (performance.now() - started > 2000) return resolve();
            requestAnimationFrame(check);
          };
          check();
        });
      };

      this.tour?.addStep({
        id: step.id,
        title: `${this.t(step.titleAr, step.titleEn)} ${badge}`,
        text: this.t(step.textAr, step.textEn),
        attachTo: { element: step.attachTo, on: this.resolvePlacement(step.position) },
        buttons,
        beforeShowPromise,
      });
    });
  }
}
