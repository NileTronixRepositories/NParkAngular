import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, catchError, throwError } from 'rxjs';
import { AuthService } from '../../Services/Auth/auth-service';
import { ToastServices } from '../../Services/Toster/toast-services';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const toastService = inject(ToastServices);
  const isLoginRequest =
    req.url.includes('/api/auth/login') || req.url.includes('/api/auth/loginfirsttime');

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isLoginRequest) {
        authService.clearUserData();

        router.navigate(['/login'], {
          queryParams: {
            returnUrl: router.url,
            sessionExpired: 'true',
          },
        });

        return EMPTY;
      }

      if (error.status === 403) {
        router.navigate(['/overview']);
        return EMPTY;
      }

      if (error.status !== 401 && error.status !== 403) {
        toastService.fromProblem(error);
      }

      return throwError(() => error);
    }),
  );
};
