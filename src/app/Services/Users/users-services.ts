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

  private mapSystemToDto(row: UserSystemResponse): UserDto {
    return {
      id: row.id,
      name: row.name ?? row.userName ?? row.username ?? '',
      email: row.email,
      roleId: row.roleId,
      roleName: row.roleName,
      phoneNumber: row.phoneNumber,
      nationalId: row.nationalId,
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
          id: r.roleId,
          name: r.roleName,
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
      password: u.password || undefined,
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
