import { Injectable, Injector, effect, inject } from '@angular/core';
import Shepherd from 'shepherd.js';
import { LanguageService } from '../../Services/i18n/language-service';

@Injectable({
  providedIn: 'root',
})
export class RegistrationTourService {
  private tour: any | null = null;

  private readonly lang = inject(LanguageService);
  private readonly injector = inject(Injector);

  constructor() {
    // إعادة بناء التور لو اللغة اتغيرت وهو شغال
    effect(
      () => {
        this.lang.currentSignal();

        if (this.tour && this.tour.isActive()) {
          const currentStepId = this.tour.getCurrentStep()?.id;
          this.tour.cancel();
          this.buildTour();
          this.tour.start();
          if (currentStepId) {
            this.tour.show(currentStepId);
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

  private pos(base: 'top' | 'bottom' | 'left' | 'right'): 'top' | 'bottom' | 'left' | 'right' {
    // نستخدم bottom في المنتصف دايماً عشان محاذاة أدق في العربي والإنجليزي
    if (base === 'top' || base === 'bottom') return 'bottom' as any;

    if (!this.isRTL) return base;

    if (base === 'left') return 'right';
    if (base === 'right') return 'left';

    return base;
  }

  // ===== API =====
  startTour(): void {
    if (this.tour && this.tour.isActive()) {
      this.tour.cancel();
    }

    // نضمن إن الـ DOM جاهز
    setTimeout(() => {
      this.buildTour();
      this.tour?.start();
    }, 0);
  }

  cancelTour(): void {
    this.tour?.cancel();
  }

  // ===== Build Steps =====
  private buildTour(): void {
    const stepClass = this.isRTL ? 'np-shepherd-step np-shepherd-rtl' : 'np-shepherd-step';

    this.tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        arrow: true,
        modalOverlayOpeningPadding: 6,
        modalOverlayOpeningRadius: 6,
        scrollTo: { behavior: 'smooth', block: 'center' },
        cancelIcon: { enabled: true },
        canClickTarget: false,
        classes: stepClass,
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

    this.addStep({
      id: 'reg-header',
      titleAr: 'شاشة إدارة الاشتراكات',
      titleEn: 'Membership management screen',
      textAr:
        'هذه الشاشة مخصصة لإضافة اشتراك جديد أو تعديل اشتراك قائم، بالإضافة إلى استعراض جميع الاشتراكات المسجلة.',
      textEn:
        'This screen is dedicated to creating new memberships, editing existing ones, and reviewing the full memberships list.',
      attachTo: '.btn-help-tour-registration',
      position: 'bottom',
      hasBack: false,
    });

    this.addStep({
      id: 'reg-help',
      titleAr: 'زر شرح الشاشة',
      titleEn: 'Help & guided tour button',
      textAr:
        'من هذا الزر يمكنك تشغيل شرح تفاعلي للشاشة في أي وقت لشرح خطوات التسجيل واستعراض البيانات.',
      textEn:
        'From this help button you can start an interactive guided tour explaining how to register and manage memberships.',
      attachTo: '.registration-header',
      position: 'bottom',
      hasBack: false,
    });

    this.addStep({
      id: 'reg-subscriber-card',
      titleAr: 'بيانات المشترك',
      titleEn: 'Subscriber details',
      textAr:
        'هنا تُسجَّل بيانات صاحب الاشتراك: لوحة المركبة، الاسم، رقم الهاتف، والرقم القومي. تأكد من استكمال اللوحة بشكل صحيح لتحقيق الربط مع حركة التذاكر.',
      textEn:
        'Here you enter the subscriber data: vehicle plate, name, phone number, and national ID. Make sure the plate is completed correctly to link with tickets.',
      attachTo: '.reg-card-subscriber',
      position: 'top',
    });

    this.addStep({
      id: 'reg-schema-card',
      titleAr: 'نوع الاشتراك',
      titleEn: 'Subscription type',
      textAr:
        'من هذا القسم تختار نوع الاشتراك المربوط بنظام التسعير (Pricing Schema)، مثل اشتراك شهري أو ساعات محددة. هذا الاختيار يؤثر على سعر الاشتراك وفترة الصلاحية.',
      textEn:
        'In this section you choose the subscription type linked to a Pricing Schema, e.g. monthly or hourly. This affects the price and validity period.',
      attachTo: '.reg-card-schema',
      position: 'top',
    });

    this.addStep({
      id: 'reg-card-read',
      titleAr: 'قراءة الكارت (NFC)',
      titleEn: 'Read card (NFC)',
      textAr:
        'بالضغط على زر "قراءة الكارت" يتم قراءة رقم الكارت من قارئ الـ NFC تلقائيًا وتعبئته في الحقل المخصص. استخدمه لتجنب الأخطاء اليدوية.',
      textEn:
        'Clicking "Read card" reads the card UID from the NFC reader and auto-fills the field, which helps to avoid manual input errors.',
      attachTo: '.reg-btn-read-card',
      position: 'bottom',
    });

    this.addStep({
      id: 'reg-docs-card',
      titleAr: 'المستندات المرفقة',
      titleEn: 'Attached documents',
      textAr:
        'يمكنك هنا رفع المستندات المتعلقة باشتراك المركبة (مثل رخصة السيارة أو البطاقة) من الملفات أو بالكاميرا، مع إمكانية معاينتها وحذف أي مستند قبل الحفظ.',
      textEn:
        'Here you can upload documents related to the membership (e.g. vehicle license or ID), either from files or camera, preview them, and delete any file before saving.',
      attachTo: '.reg-card-docs',
      position: 'top',
    });

    this.addStep({
      id: 'reg-save',
      titleAr: 'حفظ أو تحديث الاشتراك',
      titleEn: 'Save or update membership',
      textAr:
        'بعد استكمال البيانات واختيار نوع الاشتراك وربط الكارت والمستندات، اضغط على هذا الزر لحفظ اشتراك جديد أو تحديث اشتراك قائم. في وضع التعديل يظهر زر إضافي لإلغاء التعديل والرجوع.',
      textEn:
        'Once you complete the data, choose the subscription type, link the card, and attach docs, click here to save a new membership or update an existing one. In edit mode a cancel button appears to discard changes.',
      attachTo: '.reg-btn-submit',
      position: 'top',
    });

    this.addStep({
      id: 'reg-list',
      titleAr: 'قائمة الاشتراكات',
      titleEn: 'Memberships list',
      textAr:
        'أسفل النموذج تجد جدولًا يعرض كل الاشتراكات الحالية مع أهم البيانات: الاسم، الهاتف، الرقم القومي، رقم المركبة، رقم الكارت، وتواريخ الإنشاء والانتهاء.',
      textEn:
        'Below the form, the table shows all existing memberships with key data: name, phone, national ID, vehicle number, card number, and creation/end dates.',
      attachTo: '.reg-card-memberships',
      position: 'top',
    });

    this.addStep({
      id: 'reg-row-actions',
      titleAr: 'إجراءات التعديل والحذف',
      titleEn: 'Edit & delete actions',
      textAr:
        'من هذه الأزرار يمكن تعديل اشتراك موجود أو حذفه. زر التعديل ينقل بيانات السطر إلى النموذج بالأعلى، وزر الحذف يطلب تأكيد قبل إزالة الاشتراك.',
      textEn:
        'These buttons let you edit or delete an existing membership. Edit will load the row data into the form above; delete will ask for confirmation before removing it.',
      attachTo: '.reg-row-actions',
      position: this.pos('left'),
    });

    this.addStep({
      id: 'reg-page-size',
      titleAr: 'حجم الصفحة',
      titleEn: 'Page size',
      textAr:
        'يمكنك تغيير عدد الاشتراكات المعروضة في الصفحة من هنا (5، 10، 25، 50). عند تغيير القيمة يتم إعادة تحميل البيانات تلقائيًا.',
      textEn:
        'You can change how many memberships are shown per page here (5, 10, 25, 50). Changing this will reload the data automatically.',
      attachTo: '.reg-page-size-select',
      position: this.pos('left'),
    });

    this.addStep({
      id: 'reg-pagination',
      titleAr: 'التنقل بين الصفحات',
      titleEn: 'Pagination controls',
      textAr:
        'في أسفل الجدول تستطيع التنقل بين الصفحات (الأولى، السابقة، التالية، الأخيرة) مع عرض إجمالي عدد الاشتراكات ورقم الصفحة الحالية.',
      textEn:
        'At the bottom of the table you can navigate between pages (first, previous, next, last) while seeing the total memberships count and current page.',
      attachTo: '.reg-pagination-footer',
      position: 'top',
      isLast: true,
    });
  }

  private addStep(config: {
    id: string;
    titleAr: string;
    titleEn: string;
    textAr: string;
    textEn: string;
    attachTo: string;
    position: 'top' | 'bottom' | 'left' | 'right';
    hasBack?: boolean;
    isLast?: boolean;
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

    this.tour?.addStep({
      id: config.id,
      title: this.t(config.titleAr, config.titleEn),
      text: this.t(config.textAr, config.textEn),
      attachTo: {
        element: config.attachTo,
        on: this.pos(config.position),
      },
      buttons,
      beforeShowPromise: () => this.waitForElement(config.attachTo).catch(() => undefined),
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
