import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { LanguageService, AppLang } from '../i18n/language-service';
import { ErrorExtractorService } from '../Shared/error-extractor.service';

@Injectable({
  providedIn: 'root',
})
export class ToastServices {
  private toastr = inject(ToastrService);
  private lang = inject(LanguageService);
  private errorExtractor = inject(ErrorExtractorService);

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

  // ================== BASIC TOASTS ==================
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

  // ================== UNIFIED ERROR HANDLER ==================
  fromProblem(err: any) {
    const lang = this.currentLang();
    const t = this.defaultTitles[lang];

    if (!err) {
      this.error(t.unexpected, t.error);
      return;
    }

    const status = err?.status;

    if (status === 401) {
      this.warn(
        lang === 'ar'
          ? 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.'
          : 'Your session has expired. Please sign in again.',
      );
      return;
    }

    if (status === 403) {
      this.error(
        lang === 'ar' ? 'ليس لديك صلاحية لتنفيذ هذا الإجراء' : 'You are not allowed to perform this action',
        t.error,
      );
      return;
    }

    const backendMessage = this.extractBackendMessage(err);

    if (backendMessage) {
      this.error(backendMessage, t.error);
      return;
    }

    // Network error
    if (status === 0) {
      this.error(lang === 'ar' ? 'لا يوجد اتصال بالخادم' : 'Cannot connect to server', t.error);
      return;
    }

    // 5xx
    if (status >= 500) {
      this.error(lang === 'ar' ? 'حدث خطأ في الخادم' : 'Server error occurred', t.error);
      return;
    }

    // 404
    if (status === 404) {
      this.error(
        lang === 'ar' ? 'لم يتم العثور على البيانات المطلوبة' : 'Requested resource not found',
        t.error,
      );
      return;
    }

    this.error(t.unexpected, t.error);
  }

  // ================== UNIFIED SUCCESS HANDLER ==================
  fromSuccess(res: any, fallback?: string) {
    const lang = this.currentLang();
    const t = this.defaultTitles[lang];

    const message = this.errorExtractor.extractSuccessMessage(res, fallback);
    if (message && message.trim()) {
      this.success(message, t.success);
    }
  }

  // ================== PRIVATE HELPERS ==================
  private extractBackendMessage(err: any): string | null {
    const msg = this.errorExtractor.extractErrorMessage(err);
    return msg || null;
  }
}
