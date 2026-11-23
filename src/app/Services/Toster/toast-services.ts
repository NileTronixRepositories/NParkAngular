import { inject, Injectable, signal } from '@angular/core';
import { LanguageService, AppLang } from '../i18n/language-service';
import { ErrorExtractorService } from '../Shared/error-extractor.service';

export type ToastTone = 'success' | 'warn' | 'error' | 'info';

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
  duration: number;
  leaving?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToastServices {
  private readonly lang = inject(LanguageService);
  private readonly errorExtractor = inject(ErrorExtractorService);
  private readonly handledErrors = new WeakSet<object>();

  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly remainingMs = new Map<number, number>();
  private readonly startedAt = new Map<number, number>();

  private readonly _toasts = signal<ToastItem[]>([]);
  readonly toasts = this._toasts.asReadonly();

  private readonly defaultTitles: Record<
    AppLang,
    {
      success: string;
      warn: string;
      error: string;
      info: string;
      unexpected: string;
      unknown: string;
    }
  > = {
    ar: {
      success: 'تم بنجاح',
      warn: 'تنبيه',
      error: 'خطأ',
      info: 'معلومة',
      unexpected: 'حدث خطأ غير متوقع',
      unknown: 'خطأ غير معروف',
    },
    en: {
      success: 'Success',
      warn: 'Warning',
      error: 'Error',
      info: 'Info',
      unexpected: 'Unexpected error occurred',
      unknown: 'Unknown error',
    },
  };

  private currentLang(): AppLang {
    return this.lang.current ?? 'ar';
  }

  // ================== BASIC TOASTS ==================
  success(message: string, title?: string, duration = 4000): void {
    const lang = this.currentLang();
    this.push('success', message, title ?? this.defaultTitles[lang].success, duration);
  }

  warn(message: string, title?: string, duration = 4500): void {
    const lang = this.currentLang();
    this.push('warn', message, title ?? this.defaultTitles[lang].warn, duration);
  }

  error(message: string, title?: string, duration = 5000): void {
    const lang = this.currentLang();
    this.push('error', message, title ?? this.defaultTitles[lang].error, duration);
  }

  info(message: string, title?: string, duration = 4000): void {
    const lang = this.currentLang();
    this.push('info', message, title ?? this.defaultTitles[lang].info, duration);
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this.remainingMs.delete(id);
    this.startedAt.delete(id);

    this._toasts.update((list) =>
      list.map((item) => (item.id === id ? { ...item, leaving: true } : item)),
    );

    setTimeout(() => {
      this._toasts.update((list) => list.filter((item) => item.id !== id));
    }, 220);
  }

  pause(id: number): void {
    const timer = this.timers.get(id);
    if (!timer) return;
    clearTimeout(timer);
    this.timers.delete(id);

    const started = this.startedAt.get(id);
    const currentRemaining = this.remainingMs.get(id) ?? 0;
    if (started != null) {
      const elapsed = Date.now() - started;
      this.remainingMs.set(id, Math.max(400, currentRemaining - elapsed));
    }
  }

  resume(id: number): void {
    const remaining = this.remainingMs.get(id);
    if (remaining == null || this.timers.has(id)) return;
    this.scheduleDismiss(id, remaining);
  }

  private push(tone: ToastTone, rawMessage: string, title: string, duration: number): void {
    const message = String(rawMessage ?? '').trim();
    if (!message) return;

    // Prevent exact duplicate active toasts
    const exists = this._toasts().some(
      (item) => !item.leaving && item.tone === tone && item.title === title && item.message === message,
    );
    if (exists) return;

    const id = this.nextId++;
    const item: ToastItem = { id, tone, title, message, duration };

    this._toasts.update((list) => [item, ...list].slice(0, 5));
    this.remainingMs.set(id, duration);
    this.scheduleDismiss(id, duration);
  }

  private scheduleDismiss(id: number, ms: number): void {
    this.clearTimer(id);
    this.startedAt.set(id, Date.now());
    const timer = setTimeout(() => this.dismiss(id), ms);
    this.timers.set(id, timer);
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  // ================== UNIFIED ERROR HANDLER ==================
  fromProblem(err: any): void {
    const lang = this.currentLang();
    const t = this.defaultTitles[lang];

    if (!err) {
      this.error(t.unexpected, t.error);
      return;
    }

    if (typeof err === 'object') {
      if (this.handledErrors.has(err)) {
        return;
      }
      this.handledErrors.add(err);
    }

    const status = err?.status;
    // Always prioritize the exact localized message returned by the backend server
    const backendMessage = this.extractBackendMessage(err);

    if (status === 401) {
      this.warn(
        backendMessage ||
          (lang === 'ar'
            ? 'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.'
            : 'Your session has expired. Please sign in again.'),
      );
      return;
    }

    if (backendMessage) {
      this.error(backendMessage, t.error);
      return;
    }

    if (status === 403) {
      this.error(
        lang === 'ar'
          ? 'ليس لديك صلاحية لتنفيذ هذا الإجراء'
          : 'You are not allowed to perform this action',
        t.error,
      );
      return;
    }

    if (status === 429) {
      this.warn(
        lang === 'ar'
          ? 'تم تجاوز الحد المسموح من الطلبات، حاول لاحقاً'
          : 'Too many requests. Please try again later.',
      );
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
  fromSuccess(res: any, fallback?: string): void {
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
