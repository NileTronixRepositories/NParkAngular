import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, throwError } from 'rxjs';

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

    const body: any = { TicketId: trimmed };
    if (sanctionIds && sanctionIds.length > 0) {
      body.SanctionIds = sanctionIds;
    } else {
      body.SanctionIds = [];
    }

    return this.http
      .post<CalculateSalaryResponse>(this.endpoint('CalculateQrCodeTicketSalary'), body)
      .pipe(
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
      .post<CalculateSalaryResponse>(this.endpoint('CalculateSalaryForSubscriberCommand'), body)
      .pipe(
        catchError((err) => {
          this.logError('POST /Ticket/CalculateSalaryForSubscriberCommand', err);
          return throwError(() => err);
        }),
      );
  }
}
