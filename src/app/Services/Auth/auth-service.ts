import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { GateDevicePeripheral, GateType } from '../../Domain/Auth/auth.models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = 'http://192.168.1.8/api/auth';

export interface StoredUser {
  role: string;
  permissions?: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
}

export interface AuthResponse {
  token: string;
  roleName: string;
  permissions: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private gateData: GateDevicePeripheral | null = null;

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

  // ========== LOGIN ==========
  // زي ما كنا عاملين قبل كده: بارامتر واحد dto وفيه remember
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
        };
        store.setItem(USER_KEY, JSON.stringify(user));

        this.gateData = user.gateDevicePeripheral ?? null;
      })
    );
  }

  // لو عندك loginFirstTime خليه زي كده
  loginFirstTime(newPassword: string): Observable<any> {
    return this.http.post<any>(`${API_BASE}/loginFirstTime`, { newPassword });
  }

  // ========== CHECK GATE (من الباك) ==========
  checkGate(): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_BASE}/CheckGate`, {}).pipe(
      tap((res) => {
        // حدّث التوكن
        this.updateToken(res.token);

        // حدّث بيانات اليوزر + الأجهزة
        const store = this.detectStorage();
        const current = this.getStoredUser();

        const updated: StoredUser = {
          role: res.roleName ?? current?.role ?? '',
          permissions: res.permissions ?? current?.permissions ?? [],
          gateDevicePeripheral: res.gateDevicePeripheral ?? null,
        };

        store.setItem(USER_KEY, JSON.stringify(updated));
        this.gateData = updated.gateDevicePeripheral ?? null;
      })
    );
  }

  // ========== SELECT GATE (اختيار بوابة) ==========
  // TicketComponent بيناديها بـ (selectedGateId, GateType.Entrance)
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
        };

        store.setItem(USER_KEY, JSON.stringify(updated));
        this.gateData = updated.gateDevicePeripheral ?? null;
      })
    );
  }

  // ========== TOKEN & USER & GATE DATA ==========

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
    const user = this.getStoredUser();
    return user?.role ?? null;
  }

  getGateData(): GateDevicePeripheral | null {
    if (this.gateData) return this.gateData;

    const user = this.getStoredUser();
    this.gateData = user?.gateDevicePeripheral ?? null;
    return this.gateData;
  }

  updateGateData(gp: GateDevicePeripheral | null) {
    this.gateData = gp;

    const store = this.detectStorage();
    const current = this.getStoredUser();

    const updated: StoredUser = {
      role: current?.role ?? '',
      permissions: current?.permissions ?? [],
      gateDevicePeripheral: gp,
    };

    store.setItem(USER_KEY, JSON.stringify(updated));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.gateData = null;
  }
}
