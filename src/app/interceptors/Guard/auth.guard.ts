import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../Services/Auth/auth-service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const allowedRoles = route.data?.['roles'] as string[] | undefined;
  const userRole = auth.role;

  if (!allowedRoles || !allowedRoles.length) {
    return true;
  }

  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  router.navigate(['/overview']);
  return false;
};
