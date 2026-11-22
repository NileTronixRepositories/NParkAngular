import { Injectable, Injector, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { animateShepherdStep } from '../Shared/tour-animation.helper';
import { LanguageService } from '../i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

@Injectable({ providedIn: 'root' })
export class UsersByRoleTourService {
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

  private isElementVisible(selector: string): boolean {
    if (typeof document === 'undefined') return false;
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

    const allSteps: Array<{
      id: string;
      titleAr: string;
      titleEn: string;
      textAr: string;
      textEn: string;
      attachTo: string;
      position: Placement;
    }> = [
      {
        id: 'ubr-role-select',
        titleAr: 'اختيار الدور',
        titleEn: 'Select Role',
        textAr: 'اختر الدور المطلوب من القائمة لعرض جميع المستخدمين التابعين له وتقاريرهم.',
        textEn: 'Select a role from the dropdown to display all assigned users and their reports.',
        attachTo: '.users-role-report .role-select-wrap',
        position: 'bottom',
      },
      {
        id: 'ubr-filters',
        titleAr: 'البحث وعدد الصفوف',
        titleEn: 'Search & Page Size',
        textAr: 'ابحث بالاسم أو البريد أو الهاتف أو الرقم القومي، وحدد عدد الصفوف المعروضة في كل صفحة.',
        textEn: 'Search by name, email, phone, or national ID, and adjust rows displayed per page.',
        attachTo: '.users-role-report .ubr-filters-card',
        position: 'bottom',
      },
      {
        id: 'ubr-results',
        titleAr: 'قائمة المستخدمين والتقارير',
        titleEn: 'Users List & Reports',
        textAr: 'تعرض المستخدمين التابعين للدور المختار مع إمكانية فتح تقرير التذاكر أو التحصيلات لكل مستخدم.',
        textEn: 'Lists users for the selected role with quick access to ticket or collection reports.',
        attachTo: this.isElementVisible('.users-role-report .ubr-table-card')
          ? '.users-role-report .ubr-table-card'
          : '.users-role-report .empty-state-card',
        position: 'top',
      },
    ];

    const visibleSteps = allSteps.filter((s) => this.isElementVisible(s.attachTo));
    const stepsToUse = visibleSteps.length > 0 ? visibleSteps : allSteps;
    const total = stepsToUse.length;

    stepsToUse.forEach((step, idx) => {
      const stepNum = idx + 1;
      const isFirst = idx === 0;
      const isLast = idx === total - 1;
      const badge = `<span class="step-badge" dir="ltr">${stepNum}/${total}</span>`;

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
        title: `<span class="step-title-text">${this.t(step.titleAr, step.titleEn)}</span> ${badge}`,
        text: this.t(step.textAr, step.textEn),
        attachTo: { element: step.attachTo, on: this.resolvePlacement(step.position) },
        buttons,
      });
    });
  }
}
