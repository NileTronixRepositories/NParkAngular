import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import {
  LoginRequest,
  LoginResponse,
  LoginFirstTimeRequest,
  GateDevicePeripheral,
  GateType,
} from '../../Domain/Auth/auth.models';
import {} from 'rxjs/operators';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const API_BASE = 'http://192.168.1.8:80/api/auth';

export interface StoredUser {
  role: string;
  permissions?: string[];
  gateDevicePeripheral?: GateDevicePeripheral | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  private gateData: any = null;

  private storage(remember: boolean) {
    return remember ? localStorage : sessionStorage;
  }

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  get user(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }

  get role(): string | null {
    return this.user?.role ?? null;
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  hasRole(...roles: string[]): boolean {
    const r = this.role;
    if (!r) return false;
    return roles.includes(r);
  }

  saveSession(resp: LoginResponse, remember: boolean) {
    if (!resp?.token) throw new Error('No token in response');

    const store = this.storage(remember);
    store.setItem(TOKEN_KEY, resp.token);

    store.setItem(
      USER_KEY,
      JSON.stringify(<StoredUser>{
        role: resp.roleName || 'User',
        permissions: resp.permissions ?? [],
        gateDevicePeripheral: resp.gateDevicePeripheral ?? null,
      })
    );

    const other = remember ? sessionStorage : localStorage;
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);
  }

  login(dto: LoginRequest & { remember?: boolean }): Observable<LoginResponse> {
    const remember = !!dto.remember;
    const payload = { ...dto };
    delete (payload as any).remember;

    return this.http
      .post<LoginResponse>(`${API_BASE}/login`, payload)
      .pipe(tap((resp) => this.saveSession(resp, remember)));
  }

  loginFirstTime(dto: LoginFirstTimeRequest & { remember?: boolean }): Observable<LoginResponse> {
    const remember = !!dto.remember;
    const payload = { ...dto };
    delete (payload as any).remember;

    return this.http
      .post<LoginResponse>(`${API_BASE}/loginfirsttime`, payload)
      .pipe(tap((resp) => this.saveSession(resp, remember)));
  }

  logout(): Observable<object> {
    const token = this.token;

    if (!token) {
      this.clearSession();
      return of(); // إرجاع Observable<void> بدون قيمة
    }

    return this.http
      .post(`${API_BASE}/Logout`, {}) // إرسال الطلب إلى الـ API
      .pipe(
        tap(() => {
          // استخدام tap لتنفيذ الإجراء دون التأثير على البيانات
          this.clearSession(); // مسح الـ Token من التخزين
        }),
        catchError((err) => {
          console.warn('Logout error (ignored):', err);
          return of(); // إرجاع Observable<void> في حالة الخطأ
        }),
        finalize(() => {
          // التأكد من مسح الـ Token حتى في حالة النجاح أو الفشل
          this.clearSession();
        })
      );
  }
  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  private currentRemember(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  selectGate(gateId: number, gateType: GateType) {
    const remember = this.currentRemember();

    return this.http
      .post<LoginResponse>(`${API_BASE}/selectgate`, { gateId, gateType })
      .pipe(tap((resp) => this.saveSession(resp, remember)));
  }

  checkGate(gateNumber: number) {
    return this.http.post<any>('http://192.168.1.8/api/auth/CheckGate', { gateNumber });
  }

  updateToken(token: string): Observable<any> {
    const remember = this.currentRemember();
    const store = remember ? localStorage : sessionStorage;

    store.setItem(TOKEN_KEY, token);

    const user = this.user;
    if (user) {
      store.setItem(USER_KEY, JSON.stringify(user));
    }

    const other = remember ? sessionStorage : localStorage;
    other.removeItem(TOKEN_KEY);
    other.removeItem(USER_KEY);

    return of({ token });
  }

  updateGateData(gateData: any): void {
    this.gateData = gateData;
    localStorage.setItem('gate_data', JSON.stringify(gateData));
  }

  getGateData(): any {
    return this.gateData || JSON.parse(localStorage.getItem('gate_data') || '{}');
  }
}
