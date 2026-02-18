import { Injectable, Injector, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../i18n/language-service';

type Placement =
  | 'top'
  | 'top-start'
  | 'top-end'
  | 'bottom'
  | 'bottom-start'
  | 'bottom-end'
  | 'left'
  | 'left-start'
  | 'left-end'
  | 'right'
  | 'right-start'
  | 'right-end';

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
          this.tour.start();
          if (currentId) {
            this.tour.show(currentId);
          }
        }
      },
      { injector: this.injector },
    );
  }

  // ===== Helpers =====
  private get isRTL(): boolean {
    return this.lang.isRTL();
  }

  private t(ar: string, en: string): string {
    return this.isRTL ? ar : en;
  }

  private pos(base: Placement): Placement {
    if (!this.isRTL) return base;

    if (base.startsWith('top') || base.startsWith('bottom')) return 'bottom' as Placement;
    if (base.startsWith('left')) return base.replace('left', 'right') as Placement;
    if (base.startsWith('right')) return base.replace('right', 'left') as Placement;

    return base;
  }

  // ===== Public API =====
  startTour(options?: ConfigTourOptions): void {
    this.options = options ?? {};

    if (this.tour && this.tour.isActive()) {
      this.tour.cancel();
    }

    this.buildTour();
    this.tour?.start();
  }

  cancelTour(): void {
    this.tour?.cancel();
  }

  // ===== Build tour =====
  private buildTour(): void {
    const stepClasses = this.isRTL ? 'np-shepherd-step np-shepherd-rtl' : 'np-shepherd-step';

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        arrow: true,
        modalOverlayOpeningPadding: 6,
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        canClickTarget: false,
        classes: stepClasses,
        popperOptions: {
          strategy: 'fixed',
        },
      },
    } as any);

    // 1) header page(Summary header)
    this.addStep({
      id: 'config-header',
      titleAr: 'إعدادات النظام',
      titleEn: 'Configuration screen',
      textAr: 'من هذه الشاشة تقوم بضبط إعدادات نظام المواقف بالكامل.',
      textEn: 'On this screen you configure the entire parking system behavior.',
      attachTo: '.config-title-group',
      position: 'bottom-end',
      hasBack: false,
    });

    // 2) The Wizard
    this.addStep({
      id: 'config-wizard',
      titleAr: 'معالج الإعدادات',
      titleEn: 'Configuration wizard',
      textAr:
        'المعالج مكوَّن من خطوتين: الأساسيات، ثم وضع التسعير والإعدادات التفصيلية. يمكنك التنقل من الأعلى.',
      textEn:
        'The wizard has two steps: basics, then pricing mode and detailed settings. You can switch using the stepper above.',
      attachTo: '.config-main-card',
      position: 'top',
    });

    // 3) Basics – Step 1
    this.addStep({
      id: 'config-basics',
      titleAr: 'الأساسيات',
      titleEn: 'Basics',
      textAr:
        'هنا تحدد عدد بوابات الدخول والخروج، وعدد الباكيّات المسموح، وفترة السماح قبل احتساب الرسوم.',
      textEn:
        'Here you set the number of entry and exit gates, allowed parking slots, and grace period before fees apply.',
      attachTo: '.config-step1-form',
      position: 'top',
      beforeShow: () => {
        this.options.ensureStep1?.();
      },
      waitForSelector: '.config-step1-form',
    });

    // 4) Price type (Entry / Exit)
    this.addStep({
      id: 'config-mode',
      titleAr: 'نوع التسعير',
      titleEn: 'Price type',
      textAr:
        'اختَر ما إذا كان احتساب الرسوم عند الدخول أو عند الخروج. هذا يحدد كامل منطق التسعير في النظام.',
      textEn:
        'Choose whether fees are calculated on entry or on exit. This controls the pricing logic in the whole system.',
      attachTo: '.config-mode-group',
      position: 'top',
      beforeShow: () => {
        this.options.ensureStep2?.();
      },
      waitForSelector: '.config-mode-group',
    });

    // 5) Capture mode
    this.addStep({
      id: 'config-capture',
      titleAr: 'طريقة الالتقاط',
      titleEn: 'Capture mode',
      textAr:
        'حدّد إذا كان النظام يعتمد على كاميرات LPR، أو كاميرا السكنر، أو كلاهما معًا لقراءة لوحات المركبات.',
      textEn:
        'Select whether the system uses LPR cameras, scanner cameras, or both for reading vehicle plates.',
      attachTo: '.config-capture-group',
      position: 'top',
      waitForSelector: '.config-capture-group',
    });

    // 6) Pricing schema (entry only)
    this.addStep({
      id: 'config-pricing',
      titleAr: 'نظام التسعير',
      titleEn: 'Pricing schema',
      textAr:
        'من هنا تختار مخطط التسعير الذي تم تعريفه مسبقًا، مثل أول ساعة مجانًا ثم تسعير تدريجي.',
      textEn:
        'Here you choose the predefined pricing schema, such as first hour free then progressive fees.',
      attachTo: '.config-pricing-group',
      position: 'top',
      beforeShow: () => {
        this.options.ensureStep2?.();
        this.options.ensureModeEntry?.();
      },
      waitForSelector: '.config-pricing-group',
    });

    // 7) Entry / Exit gates
    this.addStep({
      id: 'config-gates',
      titleAr: 'بوابات الدخول والخروج',
      titleEn: 'Entry / Exit gates',
      textAr:
        'في كل تبويب تقوم بتحديد عنوان IP لجهاز الـ PC وجهاز الكاميرا لكل بوابة، لتسهيل الربط بين النظام والأجهزة.',
      textEn:
        'In each tab you configure the PC IP and camera/device IP for every gate to link hardware with the system.',
      attachTo: '.config-gates-tabs',
      position: 'top',
      waitForSelector: '.config-gates-tabs',
    });

    // 8) Configuration summary
    this.addStep({
      id: 'config-summary',
      titleAr: 'ملخَّص الإعدادات',
      titleEn: 'Configuration summary',
      textAr:
        'في هذا الجزء ترى ملخّص الإعدادات الحالية، وعدد البوابات، ونوع التسعير، وطريقة الالتقاط، وتاريخ بداية التطبيق.',
      textEn:
        'This panel shows a summary of your current configuration: number of gates, pricing mode, capture mode, and start date.',
      attachTo: '.config-summary-card',
      position: this.pos('left'),
      isLast: true,
      waitForSelector: '.config-summary-card',
    });
  }

  // ===== Helper to add steps =====
  private addStep(config: {
    id: string;
    titleAr: string;
    titleEn: string;
    textAr: string;
    textEn: string;
    attachTo: string;
    position: Placement;
    hasBack?: boolean;
    isLast?: boolean;
    beforeShow?: () => void;
    waitForSelector?: string;
  }) {
    const buttons: { text: string; action: () => void }[] = [];

    if (config.hasBack !== false) {
      buttons.push({
        text: this.t('السابق', 'Previous'),
        action: () => this.tour?.back(),
      });
    }

    if (config.isLast) {
      buttons.push({
        text: this.t('إنهاء', 'Finish'),
        action: () => this.tour?.complete(),
      });
    } else {
      buttons.push({
        text: this.t('التالي', 'Next'),
        action: () => this.tour?.next(),
      });
    }

    const beforeShowPromise = () => {
      if (config.beforeShow) {
        config.beforeShow();
      }

      if (!config.waitForSelector) {
        return new Promise<void>((resolve) => setTimeout(resolve, 80));
      }

      return new Promise<void>((resolve) => {
        const selector = config.waitForSelector!;
        const start = performance.now();

        const check = () => {
          if (document.querySelector(selector)) {
            resolve();
            return;
          }
          if (performance.now() - start > 1500) {
            resolve();
            return;
          }
          requestAnimationFrame(check);
        };

        check();
      });
    };

    this.tour?.addStep({
      id: config.id,
      title: this.t(config.titleAr, config.titleEn),
      text: this.t(config.textAr, config.textEn),
      attachTo: {
        element: config.attachTo,
        on: this.pos(config.position),
      },
      buttons,
      beforeShowPromise,
    } as any);
  }
}
