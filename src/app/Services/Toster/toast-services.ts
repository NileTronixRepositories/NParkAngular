import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { LanguageService, AppLang } from '../i18n/language-service';

@Injectable({
  providedIn: 'root',
})
export class ToastServices {
  private toastr = inject(ToastrService);
  private lang = inject(LanguageService);

  constructor() {}

  private currentLang(): AppLang {
    return this.lang.current ?? 'ar';
  }

  private readonly defaultTitles: Record<
    AppLang,
    {
      success: string;
      warn: string;
      error: string;
      unexpected: string;
      unknown: string;
    }
  > = {
    ar: {
      success: 'تم بنجاح',
      warn: 'تحذير',
      error: 'خطأ',
      unexpected: 'حدث خطأ غير متوقع',
      unknown: 'خطأ غير معروف',
    },
    en: {
      success: 'Success',
      warn: 'Warning',
      error: 'Error',
      unexpected: 'Unexpected error occurred',
      unknown: 'Unknown error',
    },
  };

  // ========== BASIC TOASTS ==========
  success(message: string, title?: string) {
    const lang = this.currentLang();
    this.toastr.success(message, title ?? this.defaultTitles[lang].success);
  }

  warn(message: string, title?: string) {
    const lang = this.currentLang();
    this.toastr.warning(message, title ?? this.defaultTitles[lang].warn);
  }

  error(message: string, title?: string) {
    const lang = this.currentLang();
    this.toastr.error(message, title ?? this.defaultTitles[lang].error);
  }

  // ========== UNIFIED ERROR HANDLER ==========

  fromProblem(err: any) {
    const lang = this.currentLang();
    const t = this.defaultTitles[lang];

    if (!err) {
      this.error(t.unexpected, t.error);
      return;
    }

    const backendMessage = this.extractBackendMessage(err);

    if (backendMessage) {
      this.toastr.error(backendMessage, t.error);
      return;
    }

    const status = err?.status;

    if (status === 0) {
      this.error(lang === 'ar' ? 'لا يوجد اتصال بالخادم' : 'Cannot connect to server', t.error);
      return;
    }

    if (status >= 500) {
      this.error(lang === 'ar' ? 'حدث خطأ في الخادم' : 'Server error occurred', t.error);
      return;
    }

    if (status === 404) {
      this.error(
        lang === 'ar' ? 'لم يتم العثور على البيانات المطلوبة' : 'Requested resource not found',
        t.error
      );
      return;
    }

    this.error(t.unexpected, t.error);
  }

  // ========== PRIVATE HELPERS ==========

  private extractBackendMessage(err: any): string | null {
    const response = err?.error ?? err;

    if (!response || typeof response !== 'object') {
      return null;
    }

    if (typeof response.detail === 'string' && response.detail.trim()) {
      return response.detail.trim();
    }

    // 2) errors:
    if (Array.isArray(response.errors) && response.errors.length > 0) {
      const first = response.errors[0];

      if (typeof first === 'string' && first.trim()) {
        return first.trim();
      }

      if (first && typeof first === 'object') {
        const msgFromErrorObj =
          (first.message && String(first.message).trim()) ||
          (first.description && String(first.description).trim());

        if (msgFromErrorObj) {
          return msgFromErrorObj;
        }
      }
    }

    const possibleKeys = ['message', 'Message', 'error', 'title', 'description'];

    for (const key of possibleKeys) {
      const val = (response as any)[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }

    return null;
  }
}
