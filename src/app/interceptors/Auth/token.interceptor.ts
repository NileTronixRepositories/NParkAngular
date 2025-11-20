import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../Services/Auth/auth-service';
import { environment } from '../../Shared/environment/environment';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  const isApiCall = req.url.startsWith(environment.baseUrl);
  const isAuthCall =
    req.url.includes('/api/auth/login') || req.url.includes('/api/auth/loginfirsttime');

  if (!isApiCall || !token || isAuthCall) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authReq);
};
