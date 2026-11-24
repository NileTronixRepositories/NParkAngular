import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, map, throwError } from 'rxjs';

import { CalculateSalaryResponse } from '../../Domain/tickets/tickets.model';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class TicketSalaryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly ticketUrl = `${this.baseUrl}/Ticket`;

  private logError(operation: string, error: unknown): void {
    console.error(`[TicketSalaryService] ${operation} failed`, error);
  }

  private endpoint(path: string): string {
    return `${this.ticketUrl}/${path}`;
  }

  /** Ticket salary calculation with sanctions */
  calculateTicketSalary(
    ticketId: string,
    sanctionIds?: string[],
  ): Observable<CalculateSalaryResponse | null> {
    const trimmed = ticketId?.trim();
    if (!trimmed) return of(null);

    const body: Record<string, unknown> = {
      TicketId: trimmed,
      SanctionIds: sanctionIds && sanctionIds.length > 0 ? sanctionIds : [],
    };

    return this.http
      .post<any>(this.endpoint('CalculateQrCodeTicketSalary'), body)
      .pipe(
        map((res) => (res ? this.normalizeSalaryResponse(res) : null)),
        catchError((err) => {
          this.logError('POST /Ticket/CalculateQrCodeTicketSalary', err);
          return throwError(() => err);
        }),
      );
  }

  /** Subscriber card salary */
  calculateSubscriberSalary(
    cardNumber: string,
    _sanctionIds?: string[],
  ): Observable<CalculateSalaryResponse | null> {
    const trimmed = cardNumber?.trim();
    if (!trimmed) return of(null);

    const body = { CardNumber: trimmed };

    return this.http
      .post<any>(this.endpoint('CalculateSalaryForSubscriberCommand'), body)
      .pipe(
        map((res) => (res ? this.normalizeSalaryResponse(res) : null)),
        catchError((err) => {
          this.logError('POST /Ticket/CalculateSalaryForSubscriberCommand', err);
          return throwError(() => err);
        }),
      );
  }

  private normalizeSalaryResponse(res: any): CalculateSalaryResponse {
    const basePrice = Number(res?.basePrice ?? res?.BasePrice ?? res?.totalSalary ?? res?.TotalSalary ?? 0);
    const exceedPrice = Number(res?.exceedPrice ?? res?.ExceedPrice ?? 0);
    const totalPrice = Number(res?.totalPrice ?? res?.TotalPrice ?? basePrice + exceedPrice);
    const isExitValid = !!(res?.isExitValid ?? res?.IsExitValid ?? res?.isValidForExit ?? res?.IsValidForExit);

    return {
      ticketId: String(res?.ticketId ?? res?.TicketId ?? ''),
      enterDate: String(res?.enterDate ?? res?.EnterDate ?? ''),
      totalSalary: Number(res?.totalSalary ?? res?.TotalSalary ?? basePrice),
      basePrice,
      exceedPrice,
      totalPrice,
      paidAmount: Number(res?.paidAmount ?? res?.PaidAmount ?? 0),
      outstandingAmount: Number(res?.outstandingAmount ?? res?.OutstandingAmount ?? 0),
      quotedSanctions: Number(res?.quotedSanctions ?? res?.QuotedSanctions ?? 0),
      requiredOvernightAmount: Number(
        res?.requiredOvernightAmount ?? res?.RequiredOvernightAmount ?? 0,
      ),
      validExitDate: String(res?.validExitDate ?? res?.ValidExitDate ?? ''),
      reasonCode: String(res?.reasonCode ?? res?.ReasonCode ?? ''),
      requiresOvernightPenalty: !!(
        res?.requiresOvernightPenalty ?? res?.RequiresOvernightPenalty
      ),
      isExitValid,
      isValidForExit: !!(res?.isValidForExit ?? res?.IsValidForExit ?? isExitValid),
      isCollectByCashier: !!(res?.isCollectByCashier ?? res?.IsCollectByCashier),
    };
  }
}
