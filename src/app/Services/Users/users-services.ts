import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import {
  UserDto,
  UserCreateDto,
  UserUpdateDto,
  UserSystemResponse,
  RoleDto,
  RoleSystemResponse,
} from '../../Domain/Users/user.model';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class UsersServices {
  private http = inject(HttpClient);
  private base = environment.baseUrl;

  private toApiTimeSpan(value: string | null | undefined): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (match) return `${match[1]}:${match[2]}:${match[3] ?? '00'}`;

    return raw;
  }

  private mapSystemToDto(row: UserSystemResponse): UserDto {
    return {
      id: row.id ?? row.Id ?? '',
      name: row.name ?? row.userName ?? row.username ?? row.Username ?? '',
      email: row.email ?? row.Email ?? '',
      roleId: row.roleId ?? row.RoleId ?? '',
      roleName: row.roleName ?? row.RoleName ?? '',
      phoneNumber: row.phoneNumber ?? row.PhoneNumber,
      nationalId: row.nationalId ?? row.NationalId,
      shiftStartTime: row.shiftStartTime ?? row.ShiftStartTime ?? null,
      shiftEndTime: row.shiftEndTime ?? row.ShiftEndTime ?? null,
    };
  }


  // ========= GET USERS =========
  getAll(): Observable<UserDto[]> {
    return this.http.get<UserSystemResponse[]>(`${this.base}/User/GetUserSystem`).pipe(
      map((rows) => (rows ?? []).map((r) => this.mapSystemToDto(r))),
      catchError((err) => {
        console.error('GET /User/GetUserSystem failed', err);
        return of([] as UserDto[]);
      }),
    );
  }

  // ========= GET ROLES =========
  getRoles(): Observable<RoleDto[]> {
    return this.http.get<RoleSystemResponse[]>(`${this.base}/Role/GetAll`).pipe(
      map((rows) =>
        (rows ?? []).map((r) => ({
          id: r.roleId ?? (r as any).RoleId ?? '',
          name: r.roleName ?? (r as any).RoleName ?? '',
        })),
      ),
      catchError((err) => {
        console.error('GET /Role/GetAll failed', err);
        return of([] as RoleDto[]);
      }),
    );
  }

  // ========= ADD =========
  add(u: UserCreateDto): Observable<UserDto | null> {
    const body = {
      name: u.name,
      email: u.email,
      userName: u.userName,
      password: u.password,
      phoneNumber: u.phoneNumber,
      nationalId: u.nationalId,
      roleId: u.roleId,
      shiftStartTime: this.toApiTimeSpan(u.shiftStartTime),
      shiftEndTime: this.toApiTimeSpan(u.shiftEndTime),
    };

    return this.http.post<UserSystemResponse | null>(`${this.base}/User/Create`, body).pipe(
      map((r) => (r ? this.mapSystemToDto(r) : null)),
      catchError((err) => {
        console.error('POST /User/Create failed', err);
        console.error('Server error body:', err?.error);
        return throwError(() => err);
      }),
    );
  }

  // ========= UPDATE =========
  update(u: UserUpdateDto): Observable<any> {
    const body = {
      email: u.email,
      userName: u.userName,
      roleId: u.roleId,
      id: u.id,
      password: u.password?.trim() || null,
      shiftStartTime: this.toApiTimeSpan(u.shiftStartTime),
      shiftEndTime: this.toApiTimeSpan(u.shiftEndTime),
    };

    return this.http.put<any>(`${this.base}/User/Update`, body).pipe(
      catchError((err) => {
        console.error('PUT /User/Update failed', err);
        return throwError(() => err);
      }),
    );
  }

  // ========= DELETE =========
  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.base}/User?UserId=${id}`).pipe(
      catchError((err) => {
        console.error('DELETE /api/User failed', err);
        return throwError(() => err);
      }),
    );
  }

  // ========= GET CASHIER BY GATE TYPE =========
  getCashiers(gateType: number): Observable<UserDto[]> {
    return this.http
      .get<UserSystemResponse[]>(`${this.base}/User/GetCashier?GateType=${gateType}`)
      .pipe(
        map((rows) => (rows ?? []).map((r) => this.mapSystemToDto(r))),
        catchError((err) => {
          console.error(`GET /User/GetCashier?GateType=${gateType} failed`, err);
          return of([] as UserDto[]);
        }),
      );
  }
}
