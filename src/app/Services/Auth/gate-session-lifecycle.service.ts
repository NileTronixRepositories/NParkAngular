import { Injectable, inject } from '@angular/core';

import { AuthService } from './auth-service';

@Injectable({ providedIn: 'root' })
export class GateSessionLifecycleService {
  private auth = inject(AuthService);
  private initialized = false;

  init(): void {
    if (this.initialized || typeof window === 'undefined') return;

    this.initialized = true;
    window.addEventListener('beforeunload', this.onBeforeUnload);
    window.addEventListener('pagehide', this.onPageHide);
  }

  private onBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (!this.auth.hasActiveGateSession()) return;

    event.preventDefault();
    event.returnValue = 'Please logout before closing this window.';
  };

  private onPageHide = (): void => {
    this.auth.logoutOnPageExit();
  };
}
