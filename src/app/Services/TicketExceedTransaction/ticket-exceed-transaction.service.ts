import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  CollectExceedTransactionDetail,
  CollectExceedTransactionsResponse,
  CreateTicketExceedTransactionRequest,
  CreateTicketExceedTransactionResponse,
} from '../../Domain/TicketExceedTransaction/ticket-exceed-transaction.models';
import { GateType } from '../../Domain/Auth/auth.models';
import { AuthResponse } from '../Auth/auth-service';
import { LanguageService } from '../i18n/language-service';

@Injectable({ providedIn: 'root' })
export class TicketExceedTransactionService {
  private readonly http = inject(HttpClient);
  private readonly httpBackend = inject(HttpBackend);
  private readonly i18n = inject(LanguageService);
  private readonly base = `${environment.baseUrl}/TicketExceedTransaction`;
  private readonly authUrl = `${environment.baseUrl}/auth`;

  private _rawHttp?: HttpClient;
  private get rawHttp(): HttpClient {
    if (!this._rawHttp) {
      this._rawHttp = new HttpClient(this.httpBackend);
    }
    return this._rawHttp;
  }

  create(
    request: CreateTicketExceedTransactionRequest,
  ): Observable<CreateTicketExceedTransactionResponse> {
    return this.http.post<CreateTicketExceedTransactionResponse>(`${this.base}/Create`, request).pipe(
      map((res) => this.normalizeResponse(res)),
    );
  }

  collectExceedTransactions(): Observable<CollectExceedTransactionsResponse> {
    return this.http
      .post<any>(`${this.base}/collect-exceed-transactions`, {})
      .pipe(map((res) => this.normalizeCollectResponse(res)));
  }

  collectExceedTransactionsAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateNumber: number | null;
    gateType: GateType | null;
  }): Observable<CollectExceedTransactionsResponse> {
    return this.startExceedCollectAsSupervisor(credentials).pipe(
      switchMap((token) => this.collectExceedTransactionsWithToken(token)),
    );
  }

  startExceedCollectAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateNumber: number | null;
    gateType: GateType | null;
  }): Observable<string> {
    const loginBody = {
      userName: credentials.userName,
      password: credentials.password,
      gateNumber: credentials.gateNumber,
      gateType: credentials.gateType,
    };

    return this.rawHttp
      .post<AuthResponse>(`${this.authUrl}/SuperVisorLogin`, loginBody, {
        headers: this.languageHeaders(),
      })
      .pipe(
        map((loginRes) => {
          if (!loginRes?.token) {
            throw new Error('No token returned from supervisor login');
          }

          return loginRes.token;
        }),
        catchError((err) => throwError(() => err)),
      );
  }

  collectExceedTransactionsWithToken(token: string): Observable<CollectExceedTransactionsResponse> {
    return this.rawHttp
      .post<any>(
        `${this.base}/collect-exceed-transactions`,
        {},
        { headers: this.authHeaders(token) },
      )
      .pipe(map((res) => this.normalizeCollectResponse(res)));
  }

  private languageHeaders(): HttpHeaders {
    return new HttpHeaders().set('Accept-Language', this.i18n.current ?? 'ar');
  }

  private authHeaders(token: string): HttpHeaders {
    return this.languageHeaders().set('Authorization', `Bearer ${token}`);
  }

  private normalizeResponse(res: any): CreateTicketExceedTransactionResponse {
    return {
      ticketExceedTransactionId:
        res?.ticketExceedTransactionId ?? res?.TicketExceedTransactionId ?? '',
      ticketId: res?.ticketId ?? res?.TicketId ?? '',
      exceedAmount: Number(res?.exceedAmount ?? res?.ExceedAmount ?? 0),
      ticketPrice: Number(res?.ticketPrice ?? res?.TicketPrice ?? 0),
      totalPriceAfterExceed: Number(
        res?.totalPriceAfterExceed ?? res?.TotalPriceAfterExceed ?? 0,
      ),
      gateId: res?.gateId ?? res?.GateId ?? '',
      userCollectId: res?.userCollectId ?? res?.UserCollectId ?? '',
      superVisorCollectorId: res?.superVisorCollectorId ?? res?.SuperVisorCollectorId ?? null,
      sanctionIds: res?.sanctionIds ?? res?.SanctionIds ?? [],
      createdAt: res?.createdAt ?? res?.CreatedAt ?? '',
    };
  }

  private normalizeCollectResponse(res: any): CollectExceedTransactionsResponse {
    const details = res?.ticketExceedCollectDetails ?? res?.TicketExceedCollectDetails ?? [];

    return {
      totalExceedAmountCollected: Number(
        res?.totalExceedAmountCollected ?? res?.TotalExceedAmountCollected ?? 0,
      ),
      totalTransactionsCollected: Number(
        res?.totalTransactionsCollected ?? res?.TotalTransactionsCollected ?? 0,
      ),
      ticketExceedCollectDetails: Array.isArray(details)
        ? details.map((item) => this.normalizeCollectDetail(item))
        : [],
    };
  }

  private normalizeCollectDetail(item: any): CollectExceedTransactionDetail {
    return {
      transactionId: item?.transactionId ?? item?.TransactionId ?? '',
      ticketIdSnapshot: item?.ticketIdSnapshot ?? item?.TicketIdSnapshot ?? '',
      ticketUniqueCode: item?.ticketUniqueCode ?? item?.TicketUniqueCode ?? '',
      transactionCreatedAt: item?.transactionCreatedAt ?? item?.TransactionCreatedAt ?? '',
      supervisorCollectedAt: item?.supervisorCollectedAt ?? item?.SupervisorCollectedAt ?? '',
      ticketPrice: Number(item?.ticketPrice ?? item?.TicketPrice ?? 0),
      ticketOldExceedPrice: Number(
        item?.ticketOldExceedPrice ?? item?.TicketOldExceedPrice ?? 0,
      ),
      exceedAmount: Number(item?.exceedAmount ?? item?.ExceedAmount ?? 0),
      totalPriceAfterExceed: Number(
        item?.totalPriceAfterExceed ?? item?.TotalPriceAfterExceed ?? 0,
      ),
      vehicleNumber: item?.vehicleNumber ?? item?.VehicleNumber ?? null,
      cardNumber: item?.cardNumber ?? item?.CardNumber ?? null,
      isSubscriber: !!(item?.isSubscriber ?? item?.IsSubscriber),
      gateNumber:
        item?.gateNumber != null || item?.GateNumber != null
          ? Number(item?.gateNumber ?? item?.GateNumber)
          : null,
      gateType: item?.gateType ?? item?.GateType ?? null,
    };
  }
}
