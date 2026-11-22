import { Injectable, Injector, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { animateShepherdStep } from '../Shared/tour-animation.helper';
import { LanguageService } from '../../Services/i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

@Injectable({
  providedIn: 'root',
})
export class RegistrationTourService {
  private tour: any | null = null;
  private readonly lang = inject(LanguageService);
  private readonly injector = inject(Injector);

  constructor() {
    effect(
      () => {
        this.lang.currentSignal();
        if (this.tour && this.tour.isActive()) {
          const currentStepId = this.tour.getCurrentStep()?.id;
          this.tour.cancel();
          this.buildTour();
          this.tour?.start();
          if (currentStepId) {
            this.tour?.show(currentStepId);
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
    setTimeout(() => {
      this.buildTour();
      this.tour?.start();
    }, 0);
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
        id: 'reg-subscriber-card',
        titleAr: 'بيانات المشترك',
        titleEn: 'Subscriber Details',
        textAr:
          'سجّل بيانات صاحب الاشتراك: لوحة المركبة، الاسم، رقم الهاتف، والرقم القومي.',
        textEn:
          'Enter the subscriber details: vehicle plate, name, phone number, and national ID.',
        attachTo: '.reg-card-subscriber',
        position: 'bottom',
      },
      {
        id: 'reg-schema-card',
        titleAr: 'نوع الاشتراك والكارت',
        titleEn: 'Subscription & Card',
        textAr:
          'اختر شريحة الاشتراك المناسبة، واستخدم زر قراءة الكارت (NFC) لربط الكارت تلقائياً.',
        textEn:
          'Choose the pricing schema and use the NFC reader button to auto-fill the card UID.',
        attachTo: '.reg-card-schema',
        position: 'bottom',
      },
      {
        id: 'reg-docs-card',
        titleAr: 'المستندات المرفقة',
        titleEn: 'Attached Documents',
        textAr:
          'ارفع مستندات المركبة من الملفات أو بالكاميرا مع إمكانية المعاينة أو الحذف قبل الحفظ.',
        textEn:
          'Upload vehicle documents from files or camera, preview them, or remove before saving.',
        attachTo: '.reg-card-docs',
        position: 'bottom',
      },
      {
        id: 'reg-save',
        titleAr: 'حفظ الاشتراك',
        titleEn: 'Save Membership',
        textAr: 'بعد استكمال البيانات اضغط هنا لحفظ الاشتراك الجديد أو تحديث الاشتراك الحالي.',
        textEn: 'Once complete, click here to save the new membership or update an existing one.',
        attachTo: '.reg-btn-submit',
        position: 'top',
      },
      {
        id: 'reg-list',
        titleAr: 'قائمة الاشتراكات',
        titleEn: 'Memberships List',
        textAr:
          'تستطيع استعراض جميع الاشتراكات المسجلة وتعديلها أو حذفها والتحكم في عدد الصفوف والتنقل بين الصفحات.',
        textEn:
          'Review all registered memberships, edit or delete records, change page size, and paginate.',
        attachTo: '.reg-card-memberships',
        position: 'top',
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
