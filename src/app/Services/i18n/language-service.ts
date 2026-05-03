import { Injectable, signal, computed } from '@angular/core';

export type AppLang = 'ar' | 'en';
type Lang = AppLang;

type Dict = Record<string, string>;
type I18nDict = Record<AppLang, Dict>;

export const APP_LANG_LS_KEY = 'app.lang';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly LS_KEY = APP_LANG_LS_KEY;

  // ===== Reactive signals =====
  private readonly _current = signal<AppLang>(this.getInitialLang());

  /** Current language as signal (reactive) */
  readonly currentSignal = this._current.asReadonly();

  /** Current language (getter for backwards compatibility) */
  get current(): AppLang {
    return this._current();
  }

  /** Computed signal for RTL check */
  readonly isRTL = computed(() => this._current() === 'ar');

  /** Computed signal for direction */
  readonly dir = computed(() => (this._current() === 'ar' ? 'rtl' : 'ltr'));

  set(lang: AppLang) {
    if (lang === this._current()) return;

    this._current.set(lang);
    localStorage.setItem(this.LS_KEY, lang);
    this.applyDomDirection(lang);
  }

  toggle() {
    this.set(this._current() === 'ar' ? 'en' : 'ar');
  }

  translate(dict: Partial<I18nDict> | null | undefined, key: string, fallback?: string): string {
    const normalizedKey = String(key ?? '').trim();
    if (!normalizedKey) return '';

    const currentText = dict?.[this.current]?.[normalizedKey];
    if (this.hasText(currentText)) return currentText;

    const arText = dict?.ar?.[normalizedKey];
    if (this.hasText(arText)) return arText;

    const enText = dict?.en?.[normalizedKey];
    if (this.hasText(enText)) return enText;

    if (this.hasText(fallback)) return fallback;

    return this.fallbackText(normalizedKey);
  }

  fallbackText(key: string): string {
    return String(key ?? '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // -------- private helpers --------

  private getInitialLang(): AppLang {
    const saved = localStorage.getItem(this.LS_KEY) as AppLang | null;

    const initial: AppLang = saved === 'ar' || saved === 'en' ? saved : 'ar';

    // Apply direction on init immediately
    this.applyDomDirection(initial);
    return initial;
  }

  private hasText(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
  }

  private applyDomDirection(lang: AppLang) {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
    document.body.setAttribute('dir', dir);
    document.body.classList.toggle('rtl', lang === 'ar');
    document.body.classList.toggle('ltr', lang === 'en');
  }
}
