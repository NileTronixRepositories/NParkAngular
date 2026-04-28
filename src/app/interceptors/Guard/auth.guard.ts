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

  // If no roles specified, allow access (generic protected route)
  if (!allowedRoles || !allowedRoles.length) {
    return true;
  }

  // Check if user has one of the allowed roles
  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  // Fallback: Redirect based on role
  const defaultRoute = getRoleDefaultRoute(auth, userRole);
  router.navigate([defaultRoute]);
  return false;
};

/**
 * Returns the default home route for a given user role.
 */
function getRoleDefaultRoute(auth: AuthService, role: string | null): string {
  switch (role) {
    case 'Admin':
      return '/overview';
    case 'Supervisor': {
      const gateType = Number(auth.getGateData()?.gateType ?? 0);
      if (gateType === 1) return '/tickets/entry';
      if (gateType === 2) return '/tickets/exit';
      return '/gate-selection';
    }
    case 'EntranceCashier':
      return '/tickets/entry';
    case 'ExitCashier':
      return '/tickets/exit';
    default:
      return '/login';
  }
}
