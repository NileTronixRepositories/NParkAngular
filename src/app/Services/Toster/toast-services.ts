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

    const backendMessage = this.extractBackendMessage(err);

    if (backendMessage) {
      this.error(backendMessage, t.error);
      return;
    }

    const status = err?.status;

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
        t.error
      );
      return;
    }

    this.error(t.unexpected, t.error);
  }

  // ================== PRIVATE HELPERS ==================
  private extractBackendMessage(err: any): string | null {
    // Angular HttpErrorResponse => err.error OR custom throwError(() => error)
    let raw = err?.error ?? err;

    // لو السيرفر رجّع Blob / ProgressEvent ملناش رسالة نظيفة
    if (raw instanceof ProgressEvent) {
      return null;
    }

    // لو string: ممكن يكون JSON string أو رسالة مباشرة
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return null;

      // جرّب تفكّه كـ JSON
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          raw = JSON.parse(trimmed);
        } catch {
          // مش JSON، اعتبرها رسالة وخلاص
          return trimmed;
        }
      } else {
        // رسالة نصية مباشرة من الباك
        return trimmed;
      }
    }

    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const response: any = raw;
    const messages: string[] = [];

    // 1) detail (RFC 7807 ProblemDetails)
    if (typeof response.detail === 'string' && response.detail.trim()) {
      messages.push(response.detail.trim());
    }

    // 2) errors
    const errors = response.errors;
    if (errors) {
      if (Array.isArray(errors)) {
        for (const e of errors) {
          if (!e) continue;

          if (typeof e === 'string' && e.trim()) {
            messages.push(e.trim());
          } else if (typeof e === 'object') {
            const m =
              (e as any).message || (e as any).description || (e as any).error || (e as any).title;
            if (typeof m === 'string' && m.trim()) {
              messages.push(m.trim());
            }
          }
        }
      }

      if (!Array.isArray(errors) && typeof errors === 'object') {
        for (const key of Object.keys(errors)) {
          const fieldErrors = (errors as any)[key];
          if (Array.isArray(fieldErrors)) {
            for (const msg of fieldErrors) {
              if (typeof msg === 'string' && msg.trim()) {
                messages.push(msg.trim());
              }
            }
          }
        }
      }
    }

    if (messages.length > 0) {
      return Array.from(new Set(messages)).join('\n');
    }

    const possibleKeys = ['message', 'Message', 'error', 'title', 'description'];

    for (const key of possibleKeys) {
      const val = response[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }

    if (typeof err?.statusText === 'string' && err.statusText.trim()) {
      return err.statusText.trim();
    }

    return null;
  }
}
