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

  /** QR Ticket salary */
  calculateTicketSalary(qrCode: string): Observable<CalculateSalaryResponse | null> {
    const trimmed = qrCode?.trim();
    if (!trimmed) return of(null);

    const body = { qrCode: trimmed };

    return this.http
      .post<CalculateSalaryResponse>(this.endpoint('CalculateQrCodeTicketSalary'), body)
      .pipe(
        catchError((err) => {
          this.logError('POST /Ticket/CalculateQrCodeTicketSalary', err);
          return throwError(() => err);
        })
      );
  }

  /** Subscriber card salary */
  calculateSubscriberSalary(cardNumber: string): Observable<CalculateSalaryResponse | null> {
    const trimmed = cardNumber?.trim();
    if (!trimmed) return of(null);

    const body = { cardNumber: trimmed };

    return this.http
      .post<CalculateSalaryResponse>(this.endpoint('CalculateSalaryForSubscriberCommand'), body)
      .pipe(
        catchError((err) => {
          this.logError('POST /Ticket/CalculateSalaryForSubscriberCommand', err);
          return throwError(() => err);
        })
      );
  }

  /** Calculate salary by ticket number (uses QR code endpoint but passes ticket number) */
  calculateSalaryByTicketNumber(ticketNumber: string): Observable<CalculateSalaryResponse | null> {
    const trimmed = ticketNumber?.trim();
    if (!trimmed) return of(null);

    // Try with ticketNumber parameter first
    const body = { ticketNumber: trimmed };

    return this.http
      .post<CalculateSalaryResponse>(this.endpoint('CalculateTicketNumberSalary'), body)
      .pipe(
        catchError((err) => {
          this.logError('POST /Ticket/CalculateTicketNumberSalary', err);
          // Fallback: try with qrCode parameter (ticket number might be the QR content)
          return this.calculateTicketSalary(trimmed);
        })
      );
  }
}
