import { inject, Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, tap, catchError } from 'rxjs';
import { GateDevicePeripheral, GateType } from '../../Domain/Auth/auth.models';
import { ToastServices } from '../Toster/toast-services';
import { TicketsServices } from '../Tickets/tickets-services';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = 'http://192.168.1.10/api/auth';

export interface StoredUser {
  role: string;
  permissions?: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
  gateId?: number | null;
}

export interface AuthResponse {
  token: string;
  roleName: string;
  permissions: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
  gateId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private toast = inject(ToastServices);

  private gateData: GateDevicePeripheral | null = null;
  private collectLoading = false;

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

  // ========= LOGIN =========
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
      })
    );
  }

  loginFirstTime(newPassword: string): Observable<any> {
    return this.http.post<any>(`${API_BASE}/loginFirstTime`, { newPassword });
  }

  // ========= CHECK GATE =========
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
      })
    );
  }

  // ========= SELECT GATE =========
  selectGate(gateId: number, gateType: GateType): Observable<AuthResponse> {
    const body = { gateId, gateType };

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
      })
    );
  }

  // ========= TOKEN & USER =========
  updateToken(token: string) {
    if (!token) return;
    const store = this.detectStorage();
    store.setItem(TOKEN_KEY, token);
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
    console.log('Role:', this.getStoredUser()?.role);
    const user = this.getStoredUser();
    return user?.role ?? null;
  }

  getGateData(): GateDevicePeripheral | null {
    if (this.gateData) return this.gateData;

    const user = this.getStoredUser();
    this.gateData = user?.gateDevicePeripheral ?? null;
    return this.gateData;
  }

  getGateId(): number | null {
    const user = this.getStoredUser();
    return user?.gateId ?? null;
  }

  updateGateData(gp: GateDevicePeripheral | null) {
    this.gateData = gp;

    const store = this.detectStorage();
    const current = this.getStoredUser();

    const updated: StoredUser = {
      role: current?.role ?? '',
      permissions: current?.permissions ?? [],
      gateDevicePeripheral: gp,
      gateId: current?.gateId ?? null,
    };

    store.setItem(USER_KEY, JSON.stringify(updated));
  }

  // ========= LOGOUT =========
  logout(): Observable<void> {
    const token = this.token;

    if (!token) {
      console.warn('Logout: no token in storage, treating as already logged out');
      return of(void 0);
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.post<void>(`${API_BASE}/logout`, {}, { headers }).pipe(
      tap(() => {
        console.log('Logout API success');
      }),
      catchError((err) => {
        if (err?.status === 404 && err?.error?.detail === 'Token not found') {
          console.warn('Logout: token not found on server, treating as already logged out');
          return of(void 0);
        }

        console.error('Logout API failed', err);
        return of(void 0);
      })
    );
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

  collectDailyForGate() {
    if (this.collectLoading) return;
    this.collectLoading = true;

    const ticketService = inject(TicketsServices);

    ticketService.collectDailyTickets().subscribe({
      next: (res: any) => {
        const total = res?.totalAmount ?? res?.total ?? res?.amount ?? null;

        if (total != null) {
          this.toast.success(`تم تحصيل ${total} من هذه البوابة لليوم.`);
        } else {
          this.toast.success('تم تحصيل كل التذاكر لليوم لهذه البوابة.');
        }

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        ticketService.getTicketsForEntry(startOfDay.toISOString()).subscribe();
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
