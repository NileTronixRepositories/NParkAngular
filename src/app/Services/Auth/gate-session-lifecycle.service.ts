import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth-service';

@Injectable({ providedIn: 'root' })
export class GateSessionLifecycleService {
  private auth = inject(AuthService);
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === 'undefined') return;

    this.initialized = true;
    // Do not auto-logout on pagehide/beforeunload: browsers fire these events on refresh too.
    // Logging out here makes a normal reload clear the cashier session and forces login again.
  }
}
