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

  // -------- private helpers --------

  private getInitialLang(): AppLang {
    const saved = localStorage.getItem(this.LS_KEY) as AppLang | null;

    const initial: AppLang =
      saved ?? (navigator.language && navigator.language.startsWith('ar') ? 'ar' : 'en');

    // Apply direction on init (setTimeout to ensure DOM is ready)
    setTimeout(() => this.applyDomDirection(initial), 0);
    return initial;
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
