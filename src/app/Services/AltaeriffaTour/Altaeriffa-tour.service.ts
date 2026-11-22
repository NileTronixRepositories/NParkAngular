import { Injectable, Injector, afterNextRender, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import gsap from 'gsap';
import { LanguageService } from '../../Services/i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface TourStepDef {
  id: string;
  titleAr: string;
  titleEn: string;
  textAr: string;
  textEn: string;
  attachTo: string;
  position: Placement;
}

@Injectable({
  providedIn: 'root',
})
export class AltaeriffaTourService {
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

  private pos(base: Placement): Placement {
    if (typeof window !== 'undefined' && window.innerWidth < 992) {
      return base === 'top' ? 'top' : 'bottom';
    }
    if (base === 'top' || base === 'bottom') return base;
    if (!this.isRTL) return base;
    return base === 'left' ? 'right' : 'left';
  }

  startTour(): void {
    if (this.tour?.isActive()) {
      this.tour.cancel();
    }
    this.buildTour();
    this.startAfterRender();
  }

  cancelTour(): void {
    if (this.tour?.isActive()) {
      this.tour.cancel();
    }
  }

  private startAfterRender(stepId?: string): void {
    afterNextRender(
      () => {
        queueMicrotask(() => {
          if (!this.tour) return;
          this.tour.start();
          if (stepId) {
            const exists = this.tour.steps?.some((s: any) => s.id === stepId);
            if (exists) this.tour.show(stepId);
          }
        });
      },
      { injector: this.injector },
    );
  }

  private isElementVisible(selector: string): boolean {
    if (typeof document === 'undefined') return false;
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private animateStepElement(step: any): void {
    if (this.prefersReducedMotion()) return;
    const el = step?.getElement?.() as HTMLElement | null;
    if (!el) return;

    const content = el.querySelector('.shepherd-content');
    const text = el.querySelector('.shepherd-text');
    const footer = el.querySelector('.shepherd-footer');

    if (content) {
      gsap.fromTo(
        content,
        { opacity: 0, scale: 0.93, y: 12 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.32,
          ease: 'back.out(1.4)',
          clearProps: 'transform,opacity',
        },
      );
    }

    if (text) {
      gsap.fromTo(
        text,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.24, delay: 0.06, ease: 'power2.out', clearProps: 'transform,opacity' },
      );
    }

    if (footer) {
      gsap.fromTo(
        footer,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.22, delay: 0.1, ease: 'power2.out', clearProps: 'transform,opacity' },
      );
    }
  }

  private buildTour(): void {
    const stepClass = this.isRTL ? 'np-shepherd-step np-shepherd-rtl' : 'np-shepherd-step';

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      keyboardNavigation: true,
      defaultStepOptions: {
        arrow: true,
        modalOverlayOpeningPadding: 8,
        modalOverlayOpeningRadius: 10,
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        canClickTarget: false,
        classes: stepClass,
        when: {
          show: () => {
            this.animateStepElement(this.tour?.getCurrentStep());
          },
        },
        popperOptions: {
          strategy: 'fixed',
          modifiers: [
            {
              name: 'computeStyles',
              options: { gpuAcceleration: false },
            },
            {
              name: 'preventOverflow',
              options: { boundary: 'viewport', padding: 12 },
            },
            {
              name: 'flip',
              options: { padding: 12 },
            },
          ],
        },
      },
    } as any);

    const allSteps: TourStepDef[] = [
      {
        id: 'pricing-search',
        titleAr: 'البحث السريع في الشرائح',
        titleEn: 'Quick Search',
        textAr: 'ابحث بسرعة عن أي شريحة محاسبة باستخدام الاسم أو نوع المدة.',
        textEn: 'Quickly search any pricing scheme by name or duration type.',
        attachTo: '.altaeriffa-page .search-box',
        position: 'bottom',
      },
      {
        id: 'pricing-filters',
        titleAr: 'الفلاتر السريعة',
        titleEn: 'Quick Filters',
        textAr: 'صفّ القائمة فورًا حسب النوع: الكل، أسعار الدخول، ساعات، أيام، أو سنة.',
        textEn: 'Filter the list instantly by type: All, Entry prices, Hours, Days, or Year.',
        attachTo: '.altaeriffa-page .filter-chips',
        position: 'bottom',
      },
      {
        id: 'pricing-table',
        titleAr: 'قائمة شرائح المحاسبة',
        titleEn: 'Pricing Schemes List',
        textAr: 'تعرض كل الشرائح المسجلة مع النوع، الفترة الزمنية، السعر بالجنيه، والتنقل بين الصفحات.',
        textEn: 'Displays all pricing schemes with type, time window, price in EGP, and pagination.',
        attachTo: '.altaeriffa-page .pricing-list-panel',
        position: 'right',
      },
      {
        id: 'pricing-row-actions',
        titleAr: 'إجراءات التعديل والحذف',
        titleEn: 'Edit & Delete Actions',
        textAr: 'اضغط «تعديل» لتحميل الشريحة في النموذج الجانبي مع تمييز الصف، أو أيقونة الحذف لإزالتها بعد التأكيد.',
        textEn: 'Click Edit to load the scheme into the side form with row highlighting, or Delete to remove it after confirmation.',
        attachTo: '.altaeriffa-page .row-actions',
        position: 'left',
      },
      {
        id: 'pricing-form-tabs',
        titleAr: 'التبديل بين نوعي التسعير',
        titleEn: 'Pricing Mode Tabs',
        textAr: 'من هنا تتنقل بسهولة بين نموذج «شريحة المحاسبة» العادية ونموذج «سعر تذكرة الدخول» المباشر.',
        textEn: 'Switch seamlessly between the standard Pricing Scheme form and the dedicated Entry Ticket Price form.',
        attachTo: '.altaeriffa-page .form-tabs',
        position: 'bottom',
      },
      {
        id: 'pricing-duration',
        titleAr: 'اختيار نوع المدة',
        titleEn: 'Duration Type',
        textAr: 'اختر الحساب بالساعات أو بالأيام أو بالسنة، وستتغير الحقول المطلوبة تلقائيًا حسب اختيارك.',
        textEn: 'Choose Hours, Days, or Year; required fields adapt automatically to your selection.',
        attachTo: '.altaeriffa-page .subscription-duration-toggle',
        position: 'bottom',
      },
      {
        id: 'pricing-price',
        titleAr: 'تحديد السعر',
        titleEn: 'Scheme Price',
        textAr: 'أدخل سعر الشريحة بالجنيه المصري مع تحقق تلقائي من صحة القيمة قبل الحفظ.',
        textEn: 'Enter the scheme price in EGP with automatic validation before saving.',
        attachTo: '.altaeriffa-page .subscription-price-field',
        position: 'top',
      },
      {
        id: 'pricing-actions',
        titleAr: 'حفظ وإعادة ضبط',
        titleEn: 'Save & Reset',
        textAr: 'اضغط «حفظ» لإضافة الشريحة أو حفظ التعديلات، و«إعادة ضبط» لإلغاء التعديل وإفراغ الحقول.',
        textEn: 'Click Save to create or update the scheme, or Reset to clear the form and exit edit mode.',
        attachTo: '.altaeriffa-page .subscription-form-actions',
        position: 'top',
      },
    ];

    const visibleSteps = allSteps.filter((step) => this.isElementVisible(step.attachTo));
    const stepsToUse = visibleSteps.length > 0 ? visibleSteps : allSteps;
    const totalSteps = stepsToUse.length;

    stepsToUse.forEach((step, index) => {
      const stepNum = index + 1;
      const isFirst = index === 0;
      const isLast = index === totalSteps - 1;

      const progressBadge = `<span class="step-badge" dir="ltr">${stepNum}/${totalSteps}</span>`;
      const fullTitleAr = `<span class="step-title-text">${step.titleAr}</span> ${progressBadge}`;
      const fullTitleEn = `<span class="step-title-text">${step.titleEn}</span> ${progressBadge}`;

      this.addStep({
        id: step.id,
        title: this.t(fullTitleAr, fullTitleEn),
        text: this.t(step.textAr, step.textEn),
        attachTo: step.attachTo,
        position: step.position,
        isFirst,
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
    isFirst: boolean;
    isLast: boolean;
  }): void {
    const buttons: any[] = [];

    if (!config.isLast) {
      buttons.push({
        text: this.t('تخطي', 'Skip'),
        action: () => this.tour?.cancel(),
        classes: 'shepherd-button-skip',
      });
    }

    if (!config.isFirst) {
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

      buttons.push({
        text: finishText,
        action: () => this.tour?.complete(),
        classes: 'shepherd-button-finish',
      });
    } else {
      const nextText = this.isRTL
        ? `التالي <i class="fa-solid fa-arrow-left"></i>`
        : `Next <i class="fa-solid fa-arrow-right"></i>`;

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
