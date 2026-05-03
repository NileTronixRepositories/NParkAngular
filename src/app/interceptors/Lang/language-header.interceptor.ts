import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { LanguageService, AppLang, APP_LANG_LS_KEY } from '../../Services/i18n/language-service';

export const languageHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  const langService = inject(LanguageService);

  const storedLangValue = localStorage.getItem(APP_LANG_LS_KEY) as AppLang | null;
  const storedLang = storedLangValue === 'ar' || storedLangValue === 'en' ? storedLangValue : null;
  const serviceLang = langService.current;
  const currentLang: AppLang = storedLang ?? serviceLang ?? 'ar';

  const cloned = req.clone({
    setHeaders: {
      'Accept-Language': currentLang,
    },
  });

  return next(cloned);
};
