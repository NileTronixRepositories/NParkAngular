import { Injectable, inject } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

import {
  UserDto,
  UserCreateDto,
  UserUpdateDto,
  UserSystemResponse,
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
      userName: row.userName ?? row.username ?? '',
      email: row.email,
      roleId: row.roleId,
      roleName: row.roleName,
    };
  }

  // ========= GET =========
  getAll(): Observable<UserDto[]> {
    return this.http.get<UserSystemResponse[]>(`${this.base}/User/GetUserSystem`).pipe(
      map((rows) => (rows ?? []).map((r) => this.mapSystemToDto(r))),
      catchError((err) => {
        console.error('GET /User/GetUserSystem failed', err);
        return of([] as UserDto[]);
      })
    );
  }

  // ========= ADD =========
  add(u: UserCreateDto): Observable<UserDto> {
    const body = {
      name: u.name,
      email: u.email,
      userName: u.userName,
      password: u.password,
      phoneNumber: u.phoneNumber,
      nationalId: u.nationalId,
      roleId: u.roleId,
    };

    return this.http.post<UserSystemResponse>(`${this.base}/User/Create`, body).pipe(
      map((r) => this.mapSystemToDto(r)),
      catchError((err) => {
        console.error('POST /User/Create failed', err);
        console.error('Server error body:', err?.error);
        return throwError(() => err);
      })
    );
  }

  // ========= UPDATE =========
  update(u: UserUpdateDto): Observable<UserDto> {
    const body = {
      id: u.id,
      userName: u.userName,
      email: u.email,
      roleId: u.roleId,
    };

    return this.http.put<any>(`${this.base}/User/update`, body).pipe(
      map(() => ({
        id: u.id,
        userName: u.userName,
        email: u.email,
        roleId: u.roleId,
        roleName: '',
      })),
      catchError((err) => {
        console.error('PUT /User/update failed', err);
        return throwError(() => err);
      })
    );
  }
}
