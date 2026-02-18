import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../Services/Auth/auth-service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.clearUserData();

        router.navigate(['/login'], {
          queryParams: {
            returnUrl: router.url,
            sessionExpired: 'true',
          },
        });
      }

      if (error.status === 403) {
        router.navigate(['/overview']);
      }

      return throwError(() => error);
    }),
  );
};
