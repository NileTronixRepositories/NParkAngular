import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';

import {
  CollectDailyTicketsResponse,
  CollectEnterTicketsResponse,
  UncollectedEnterTicketsResponse,
} from '../../Domain/tickets/tickets.model';
import { AuthResponse, AuthService } from '../Auth/auth-service';
import { TicketCoreService } from './ticket-core.service';
import { LanguageService } from '../i18n/language-service';
import { environment } from '../../Shared/environment/environment';
import { GateType } from '../../Domain/Auth/auth.models';

export interface SupervisorEntryCollectSession {
  token: string;
  summary: CollectDailyTicketsResponse;
}

@Injectable({
  providedIn: 'root',
})
export class TicketSupervisorService {
  private readonly httpBackend = inject(HttpBackend);
  private readonly core = inject(TicketCoreService);
  private readonly i18n = inject(LanguageService);
  private readonly auth = inject(AuthService);

  private readonly baseUrl = environment.baseUrl;
  private readonly authUrl = `${this.baseUrl}/auth`;
  private readonly ticketUrl = `${this.baseUrl}/Ticket`;

  private _rawHttp?: HttpClient;
  private get rawHttp(): HttpClient {
    if (!this._rawHttp) {
      this._rawHttp = new HttpClient(this.httpBackend);
    }
    return this._rawHttp;
  }

  private logError(operation: string, error: unknown): void {
    console.error(`[TicketSupervisorService] ${operation} failed`, error);
  }

  private languageHeaders(): HttpHeaders {
    return new HttpHeaders().set('Accept-Language', this.i18n.current ?? 'ar');
  }

  private authHeaders(token: string): HttpHeaders {
    return this.languageHeaders().set('Authorization', `Bearer ${token}`);
  }

  collectEnterTicketsAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateId: string | number | null;
    gateType: GateType | null;
    gateNumber: number | null;
  }): Observable<CollectDailyTicketsResponse> {
    return this.startEntryCollectAsSupervisor(credentials).pipe(
      switchMap((session) => this.collectEnterTicketsWithSupervisorToken(session.token)),
    );
  }

  startEntryCollectAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateId: string | number | null;
    gateType: GateType | null;
    gateNumber: number | null;
  }): Observable<SupervisorEntryCollectSession> {
    if (!credentials.gateId) {
      return throwError(() => new Error('Gate id is required for supervisor collection'));
    }

    const loginBody = {
      userName: credentials.userName,
      password: credentials.password,
      gateType: credentials.gateType,
      gateNumber: credentials.gateNumber,
    };

    return this.rawHttp
      .post<AuthResponse>(`${this.authUrl}/SuperVisorLogin`, loginBody, {
        headers: this.languageHeaders(),
      })
      .pipe(
        switchMap((loginRes) => {
          if (!loginRes?.token) {
            throw new Error('No token returned from supervisor login');
          }

          this.auth.updateToken(loginRes.token);

          return this.loadUncollectedWithToken(loginRes.token).pipe(
            map((uncollected) => ({
              token: loginRes.token,
              summary: this.core.mapUncollectedEnterResponseToSummary(uncollected),
            })),
          );
        }),
        catchError((err) => {
          this.logError('startEntryCollectAsSupervisor', err);
          return throwError(() => err);
        }),
      );
  }

  private loadUncollectedWithToken(token: string): Observable<UncollectedEnterTicketsResponse> {
    return this.rawHttp.get<UncollectedEnterTicketsResponse>(
      `${this.ticketUrl}/uncollected-enter-tickets`,
      { headers: this.authHeaders(token) },
    );
  }

  collectEnterTicketsWithSupervisorToken(token: string): Observable<CollectDailyTicketsResponse> {
    return this.collectEnterTicketsWithToken(token);
  }

  private collectEnterTicketsWithToken(token: string): Observable<CollectDailyTicketsResponse> {
    return this.rawHttp
      .post<CollectEnterTicketsResponse>(
        `${this.ticketUrl}/collect-enter-tickets`,
        {},
        { headers: this.authHeaders(token) },
      )
      .pipe(map((res) => this.core.mapCollectEnterResponseToSummary(res)));
  }

  collectDailyTicketsAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateType: GateType | null;
    gateNumber: number | null;
  }): Observable<CollectDailyTicketsResponse> {
    const loginBody = {
      userName: credentials.userName,
      password: credentials.password,
      gateType: credentials.gateType,
      gateNumber: credentials.gateNumber,
    };
    const gateId = this.auth.getGateId();

    return this.rawHttp
      .post<AuthResponse>(`${this.authUrl}/SuperVisorLogin`, loginBody, {
        headers: this.languageHeaders(),
      })
      .pipe(
        switchMap((authRes) => {
          if (!authRes?.token) {
            throw new Error('No token returned from supervisor login');
          }

          this.auth.updateToken(authRes.token);
          return this.core.collectDailyTickets({ gateId });
        }),
        catchError((err) => {
          this.logError('collectDailyTicketsAsSupervisor', err);
          return throwError(() => err);
        }),
      );
  }
}
