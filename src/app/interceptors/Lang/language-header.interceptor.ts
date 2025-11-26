import { Injectable, inject } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LanguageService } from '../../Services/i18n/language-service';

@Injectable()
export class LanguageHeaderInterceptor implements HttpInterceptor {
  private lang = inject(LanguageService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const currentLang = this.lang.current ?? 'ar';

    const cloned = req.clone({
      setHeaders: {
        'Accept-Language': currentLang,
      },
    });

    return next.handle(cloned);
  }
}
