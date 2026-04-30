import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, catchError, of, tap } from 'rxjs';
import {
  GateDevicePeripheral,
  GateType,
  LoginFirstTimeCommand,
} from '../../Domain/Auth/auth.models';
import { ToastServices } from '../Toster/toast-services';
import { TicketsServices } from '../Tickets/tickets-services';
import { environment } from '../../Shared/environment/environment';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = `${environment.baseUrl}/auth`;

export interface StoredUser {
  role: string;
  permissions?: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
  gateId?: string | number | null;
}

export interface AuthResponse {
  token: string;
  roleName: string;
  permissions: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
  gateId?: string | number | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private toast = inject(ToastServices);
  // private ticketsService = inject(TicketsServices);
  private gateData: GateDevicePeripheral | null = null;
  private collectLoading = false;
  private unloadLogoutStarted = false;

  private get logoutEndpoint(): string {
    return `${API_BASE}/Logout`;
  }

  // ================== STORAGE HELPERS ==================
  private storage(remember: boolean): Storage {
    return remember ? localStorage : sessionStorage;
  }

  private detectStorage(): Storage {
    if (localStorage.getItem(TOKEN_KEY)) return localStorage;
    if (sessionStorage.getItem(TOKEN_KEY)) return sessionStorage;
    return localStorage;
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  // ================== LOGIN ==================
  login(body: any): Observable<AuthResponse> {
    const remember = !!body.remember;

    return this.http.post<AuthResponse>(`${API_BASE}/login`, body).pipe(
      tap((res) => {
        const store = this.storage(remember);

        store.setItem(TOKEN_KEY, res.token);

        const user: StoredUser = {
          role: res.roleName,
          permissions: res.permissions ?? [],
          gateDevicePeripheral: res.gateDevicePeripheral ?? null,
          gateId: res.gateId ?? null,
        };
        store.setItem(USER_KEY, JSON.stringify(user));

        this.gateData = user.gateDevicePeripheral ?? null;
      }),
    );
  }

  // ================== LOGIN FIRST TIME ==================
  loginFirstTime(body: LoginFirstTimeCommand): Observable<HttpResponse<void>> {
    return this.http.post<void>(`${API_BASE}/loginfirsttime`, body, {
      observe: 'response',
    });
  }

  // ================== CHECK GATE ==================
  checkGate(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE}/CheckGate`, {}).pipe(
      tap((res) => {
        this.updateToken(res.token);

        const store = this.detectStorage();
        const current = this.getStoredUser();

        const updated: StoredUser = {
          role: res.roleName ?? current?.role ?? '',
          permissions: res.permissions ?? current?.permissions ?? [],
          gateDevicePeripheral: res.gateDevicePeripheral ?? null,
          gateId: res.gateId ?? current?.gateId ?? null,
        };

        store.setItem(USER_KEY, JSON.stringify(updated));
        this.gateData = updated.gateDevicePeripheral ?? null;
      }),
    );
  }

  // ================== SELECT GATE ==================
  selectGate(gateId: string | number, gateType: GateType): Observable<AuthResponse> {
    const body = { gateId };

    return this.http.post<AuthResponse>(`${API_BASE}/CheckGate`, body).pipe(
      tap((res) => {
        this.updateToken(res.token);

        const store = this.detectStorage();
        const current = this.getStoredUser();

        const updated: StoredUser = {
          role: res.roleName ?? current?.role ?? '',
          permissions: res.permissions ?? current?.permissions ?? [],
          gateDevicePeripheral: res.gateDevicePeripheral ?? null,
          gateId: gateId,
        };

        store.setItem(USER_KEY, JSON.stringify(updated));
        this.gateData = updated.gateDevicePeripheral ?? null;
      }),
    );
  }

  // ================== TOKEN & USER ==================
  updateToken(token: string) {
    if (!token) return;
    const store = this.detectStorage();
    store.setItem(TOKEN_KEY, token);

    const payload = this.decodeJwtPayload(token);
    if (!payload) return;

    const current = this.getStoredUser();
    const role =
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ??
      payload.role ??
      payload.Role ??
      current?.role ??
      '';
    const rawPermissions = payload.permission ?? payload.permissions ?? current?.permissions ?? [];
    const permissions = Array.isArray(rawPermissions)
      ? rawPermissions
      : rawPermissions
        ? [String(rawPermissions)]
        : [];
    const gateId = payload.gateId ?? payload.GateId ?? current?.gateId ?? null;

    const updated: StoredUser = {
      role: String(role),
      permissions,
      gateDevicePeripheral: current?.gateDevicePeripheral ?? this.gateData ?? null,
      gateId,
    };

    store.setItem(USER_KEY, JSON.stringify(updated));
  }

  private decodeJwtPayload(token: string): any | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) return null;

      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(
        normalized.length + ((4 - (normalized.length % 4)) % 4),
        '=',
      );
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  }

  getStoredUser(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }

  get role(): string | null {
    const user = this.getStoredUser();
    return user?.role ?? null;
  }

  get userName(): string | null {
    const token = this.token;
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.unique_name || payload.sub || payload.name || payload.Name || null;
    } catch {
      return null;
    }
  }

  getGateData(): GateDevicePeripheral | null {
    if (this.gateData) return this.gateData;

    const user = this.getStoredUser();
    this.gateData = user?.gateDevicePeripheral ?? null;
    return this.gateData;
  }

  getGateId(): string | number | null {
    const user = this.getStoredUser();
    return user?.gateId ?? null;
  }

  hasActiveGateSession(): boolean {
    return this.isLoggedIn() && !!this.getGateId();
  }

  updateGateData(gp: GateDevicePeripheral | null, gateId?: string | number | null) {
    this.gateData = gp;

    const store = this.detectStorage();
    const current = this.getStoredUser();

    const updated: StoredUser = {
      role: current?.role ?? '',
      permissions: current?.permissions ?? [],
      gateDevicePeripheral: gp,
      gateId: gateId ?? current?.gateId ?? null,
    };

    store.setItem(USER_KEY, JSON.stringify(updated));
  }

  // Clear gate data (used when cashier needs to explicitly select a gate)
  clearGateData(): void {
    const store = this.detectStorage();
    const user = this.getStoredUser();
    if (!user) return;

    const updated = {
      ...user,
      gateId: null,
      gateDevicePeripheral: null,
    };

    this.gateData = null;
    store.setItem(USER_KEY, JSON.stringify(updated));
  }

  // ================== LOGOUT ==================
  logout(): Observable<void> {
    const token = this.token;

    if (!token) {
      this.clearUserData();
      return of(void 0);
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post<void>(this.logoutEndpoint, {}, { headers }).pipe(
      catchError(() => of(void 0)),
      tap(() => this.clearUserData()),
    );
  }

  logoutOnPageExit(): void {
    if (this.unloadLogoutStarted || !this.hasActiveGateSession()) return;

    this.unloadLogoutStarted = true;
    const token = this.token;
    this.clearUserData();

    if (!token || typeof fetch !== 'function') return;

    void fetch(this.logoutEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      keepalive: true,
    }).catch(() => void 0);
  }

  clearUserData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

    this.gateData = null;
  }

  get isSupervisor(): boolean {
    return this.role === 'Supervisor';
  }

  // ================== HELPER: GET MESSAGE FROM BACKEND ==================
  private getBackendMessage(response: any, fallback: string): string {
    if (!response || typeof response !== 'object') {
      return fallback;
    }

    const possibleKeys = ['message', 'Message', 'msg', 'detail', 'title', 'error'];

    for (const key of possibleKeys) {
      const value = (response as any)[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }

    const errors = (response as any).errors;
    if (Array.isArray(errors) && errors.length > 0) {
      const first = errors[0];

      if (typeof first === 'string' && first.trim().length > 0) {
        return first;
      }

      if (first && typeof first === 'object') {
        if (typeof (first as any).description === 'string' && first.description.trim()) {
          return first.description;
        }
        if (typeof (first as any).message === 'string' && first.message.trim()) {
          return first.message;
        }
      }
    }

    return fallback;
  }

  // ================== COLLECT DAILY FOR GATE ==================
  collectDailyForGate() {
    if (this.collectLoading) return;
    this.collectLoading = true;

    // ✅ نحقن TicketsServices هنا بس → ما فيش Circular DI
    const ticketsService = inject(TicketsServices);

    ticketsService.collectEnterTickets().subscribe({
      next: (res: any) => {
        const total = res?.totalAmount ?? res?.total ?? res?.amount ?? null;

        const defaultMessage =
          total != null
            ? `تم تحصيل ${total} من هذه البوابة لليوم.`
            : 'تم تحصيل كل التذاكر لليوم لهذه البوابة.';

        const messageFromApi = this.getBackendMessage(res, defaultMessage);

        this.toast.success(messageFromApi);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        ticketsService.getTicketsForEntry(startOfDay.toISOString()).subscribe();
      },
      error: (err: any) => {
        console.error('collectDailyTickets error', err);
        this.collectLoading = false;
        this.toast.fromProblem(err);
      },
      complete: () => {
        this.collectLoading = false;
      },
    });
  }
}
