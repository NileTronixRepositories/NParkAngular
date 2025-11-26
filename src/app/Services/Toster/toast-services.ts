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

  private defaultTitles = {
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

  fromProblem(err: any) {
    const lang = this.currentLang();
    const t = this.defaultTitles[lang];

    try {
      const pd = err?.error;
      if (!pd) {
        this.error(t.unexpected);
        return;
      }

      const title = pd.title || t.error;
      const detail = pd.detail || pd.message || '';

      const errors = pd.errors;

      // errors: [{ code, message, ... }]
      if (Array.isArray(errors) && errors.length) {
        for (const e of errors) {
          this.error(e.message || e.code || detail || title, title);
        }
        return;
      }

      if (errors && typeof errors === 'object') {
        for (const key of Object.keys(errors)) {
          const msgs = errors[key];
          if (Array.isArray(msgs)) {
            msgs.forEach((m: any) => this.error(m || detail || title, key));
          } else if (msgs) {
            this.error(msgs.toString(), key);
          }
        }
        return;
      }

      if (detail) {
        this.error(detail, title);
      } else {
        this.error(title);
      }
    } catch {
      this.error(t.unknown);
    }
  }
}
