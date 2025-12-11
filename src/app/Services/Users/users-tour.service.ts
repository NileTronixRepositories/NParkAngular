import { Injectable, Injector, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../../Services/i18n/language-service';

type Placement = 'top' | 'bottom' | 'left' | 'right';

interface UsersTourOptions {
  ensureFormOpen?: () => void;
}

@Injectable({ providedIn: 'root' })
export class UsersTourService {
  private tour: any | null = null;

  private readonly lang = inject(LanguageService);
  private readonly injector = inject(Injector);

  private options: UsersTourOptions = {};

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
      { injector: this.injector }
    );
  }

  private get isRTL(): boolean {
    return this.lang.isRTL();
  }

  private t(ar: string, en: string): string {
    return this.isRTL ? ar : en;
  }

  private pos(base: Placement): Placement {
    if (!this.isRTL) return base;
    if (base === 'left') return 'right';
    if (base === 'right') return 'left';
    return base;
  }

  // ===== Public API =====
  startTour(options?: UsersTourOptions): void {
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

    // 1) عنوان الصفحة
    this.addStep({
      id: 'users-header',
      titleAr: 'شاشة إدارة المستخدمين',
      titleEn: 'Users management screen',
      textAr:
        'من هذه الشاشة يمكنك استعراض المستخدمين الحاليين، وتعديل بيانات أي مستخدم، أو إضافة مستخدم جديد.',
      textEn: 'On this screen you can view existing users, edit their data, and add new users.',
      attachTo: '.users-header',
      position: 'bottom',
      hasBack: false,
    });

    // 2) زر التور
    this.addStep({
      id: 'users-help',
      titleAr: 'زر شرح الشاشة',
      titleEn: 'Help tour button',
      textAr: 'يمكنك تشغيل هذا الشرح التفاعلي للشاشة في أي وقت من هذا الزر.',
      textEn: 'You can launch this interactive tour any time from this button.',
      attachTo: '.btn-help-tour-users',
      position: 'bottom',
      hasBack: false,
    });

    // 3) جدول المستخدمين
    this.addStep({
      id: 'users-table',
      titleAr: 'قائمة المستخدمين',
      titleEn: 'Users table',
      textAr:
        'هنا تظهر قائمة المستخدمين المسجَّلين مع عرض الاسم والبريد الإلكتروني والدور لكل مستخدم.',
      textEn: 'Here you can see the registered users with their username, email and role.',
      attachTo: '.users-table-card',
      position: 'top',
    });

    // 4) زر إضافة مستخدم
    this.addStep({
      id: 'users-add-btn',
      titleAr: 'إضافة مستخدم جديد',
      titleEn: 'Add new user',
      textAr: 'من هذا الزر يمكنك فتح نموذج إضافة مستخدم جديد وإدخال بياناته الأساسية وحقوقه.',
      textEn:
        'Use this button to open the form for adding a new user and setting their basic data and role.',
      attachTo: '.btn-users-add',
      position: this.pos('left'),
    });

    // 5) نموذج المستخدم
    this.addStep({
      id: 'users-form',
      titleAr: 'نموذج المستخدم',
      titleEn: 'User form',
      textAr:
        'في هذا النموذج تقوم بكتابة اسم المستخدم، البريد الإلكتروني، وتحديد الدور الذي يحدد صلاحياته. عند الإضافة لأول مرة يُطلب أيضًا كلمة المرور والجوال والهوية.',
      textEn:
        'In this form you enter the username, email address, and select the user role which defines their permissions. When creating a user you also need password, phone and national ID.',
      attachTo: '.users-form-card',
      position: 'top',
      beforeShow: () => {
        // ⬅ هنا بنعتمد على الـ callback اللي هييجي من الكومبوننت
        this.options.ensureFormOpen?.();
      },
      waitForSelector: '.users-form-card',
    });

    // 6) اختيار الدور
    this.addStep({
      id: 'users-role',
      titleAr: 'تحديد الدور',
      titleEn: 'Select role',
      textAr:
        'من هذه القائمة تختار الدور المرتبط بالمستخدم مثل مشرف أو أمين صندوق. الدور يتحكم في الصلاحيات داخل النظام.',
      textEn:
        'From this dropdown you select the user role, such as Admin or Cashier. The role controls the permissions inside the system.',
      attachTo: '.users-role-select',
      position: 'bottom',
      waitForSelector: '.users-role-select',
    });

    // 7) حفظ النموذج
    this.addStep({
      id: 'users-save',
      titleAr: 'حفظ البيانات',
      titleEn: 'Save user',
      textAr:
        'بعد استكمال البيانات اضغط هنا لحفظ المستخدم الجديد أو تحديث المستخدم الحالي. في حال وجود أخطاء سيظهر تنبيه بالتفاصيل.',
      textEn:
        'Once all fields are valid, click here to save the new user or update the existing one. Validation errors will be shown as notifications.',
      attachTo: '.users-btn-save',
      position: 'top',
      waitForSelector: '.users-btn-save',
      isLast: true,
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
