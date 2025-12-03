import { HttpClient, HttpBackend } from '@angular/common/http';
import { Observable, switchMap, tap, catchError, throwError } from 'rxjs';

import { CollectDailyTicketsResponse } from '../../Domain/tickets/tickets.model';
import { AuthService, AuthResponse } from '../Auth/auth-service';
import { TicketCoreService } from './ticket-core.service';
import { environment } from '../../Shared/environment/environment';
import { GateType } from '../../Domain/Auth/auth.models';
import { Injectable, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TicketSupervisorService {
  private readonly http = inject(HttpClient);
  private readonly httpBackend = inject(HttpBackend);
  private readonly auth = inject(AuthService);
  private readonly core = inject(TicketCoreService);

  private readonly baseUrl = environment.baseUrl;
  private readonly authUrl = `${this.baseUrl}/auth`;

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

    return this.rawHttp.post<AuthResponse>(`${this.authUrl}/SuperVisorLogin`, loginBody).pipe(
      tap((authRes) => {
        if (!authRes?.token) {
          throw new Error('No token returned from supervisor login');
        }
        this.auth.updateToken(authRes.token);
      }),
      switchMap(() => {
        const collectBody = { gateId };
        return this.core.collectDailyTickets(collectBody);
      }),
      catchError((err) => {
        this.logError('collectDailyTicketsAsSupervisor', err);
        return throwError(() => err);
      })
    );
  }
}
