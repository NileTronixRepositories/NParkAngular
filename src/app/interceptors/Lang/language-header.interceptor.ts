import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { LanguageService, AppLang, APP_LANG_LS_KEY } from '../../Services/i18n/language-service';

export const languageHeaderInterceptor: HttpInterceptorFn = (req, next) => {
  const langService = inject(LanguageService);

  const storedLang = localStorage.getItem(APP_LANG_LS_KEY) as AppLang | null;
  const serviceLang = langService.current;
  const currentLang: AppLang = storedLang ?? serviceLang ?? 'ar';

  const cloned = req.clone({
    setHeaders: {
      'Accept-Language': currentLang,
    },
  });

  return next(cloned);
};
