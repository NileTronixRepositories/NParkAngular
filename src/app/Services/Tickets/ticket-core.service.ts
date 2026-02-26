import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, throwError } from 'rxjs';

import {
  TicketDto,
  TicketDetailsDto,
  TicketEntryDto,
  TicketAction,
  TicketTableResponseDto,
  CollectDailyTicketsResponse,
} from '../../Domain/tickets/tickets.model';
import { environment } from '../../Shared/environment/environment';

export interface TicketsForGateResult {
  items: TicketDto[];
  totalPrice: number;
}

@Injectable({
  providedIn: 'root',
})
export class TicketCoreService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly ticketUrl = `${this.baseUrl}/Ticket`;

  // ========= Helpers =========

  private logError(operation: string, error: unknown): void {
    console.error(`[TicketCoreService] ${operation} failed`, error);
  }

  private endpoint(path: string): string {
    return `${this.ticketUrl}/${path}`;
  }

  private normalizeDateTime(value: unknown): string {
    if (typeof value === 'string') return value;
    return new Date(value as any).toISOString();
  }

  // ========= Basic list =========

  getAll(): Observable<TicketDto[]> {
    return this.http.get<any[]>(this.ticketUrl).pipe(
      map((rows) =>
        (rows ?? []).map((r) => ({
          id: r.id ?? r.Id,
          plate: r.plate ?? r.Plate ?? '',
          action: (r.action ?? r.Action ?? '') as TicketDto['action'],
          time: (r.time ?? r.Time ?? r.dateTime ?? r.DateTime) as string,
          gate: r.gate ?? r.Gate ?? '',
        })),
      ),
      catchError((err) => {
        this.logError('GET /Ticket', err);
        return of([]);
      }),
    );
  }

  // ========= Scan Ticket (New Flow) =========

  scanTicket(qrCode: string): Observable<any> {
    const body = { qrCode: qrCode.trim() };
    return this.http.post<any>(this.endpoint('ScanTicket'), body).pipe(
      catchError((err) => {
        this.logError('POST /Ticket/ScanTicket', err);
        return throwError(() => err);
      }),
    );
  }

  // ========= Ticket by QR =========

  //   getTicketByQr(code: string): Observable<TicketDetailsDto> {
  //     const params = new HttpParams().set('code', code);

  //     return this.http.get<any>(this.endpoint('GetByQr'), { params }).pipe(
  //       map((res) => {
  //         const dateTime =
  //           res.dateTime ?? res.DateTime ?? res.start ?? res.Start ?? res.startDate ?? res.StartDate;

  //         const endDate =
  //           res.endDate ?? res.EndDate ?? res.end ?? res.End ?? res.finish ?? res.Finish;

  //         const price = Number(res.price ?? res.Price ?? 0);
  //         const exceedPrice = Number(res.exceedPrice ?? res.ExceedPrice ?? 0);
  //         const total =
  //           res.totalPrice ?? res.TotalPrice ?? Math.round((price + exceedPrice) * 100) / 100;

  //         return {
  //           id: res.id ?? res.Id,
  //           plate: res.plate ?? res.Plate ?? '',
  //           dateTime: this.normalizeDateTime(dateTime),
  //           endDate: this.normalizeDateTime(endDate),
  //           price,
  //           exceedPrice,
  //           totalPrice: Number(total),
  //         } as TicketDetailsDto;
  //       }),
  //       catchError((err) => {
  //         this.logError('GET /Ticket/GetByQr', err);
  //         return throwError(() => err);
  //       })
  //     );
  //   }

  // ========= Add / Exit / Collect =========

  addTicket(body: any): Observable<any> {
    return this.http.post<any>(this.endpoint('AddTicket'), body).pipe(
      catchError((err) => {
        this.logError('POST /Ticket/AddTicket', err);
        return throwError(() => err);
      }),
    );
  }

  collect(id: number | string): Observable<boolean> {
    const ticketId = String(id);
    return this.http.post<any>(this.endpoint('CollectCashier'), { ticketId }).pipe(
      map(() => true),
      catchError((err) => {
        this.logError('POST /Ticket/CollectCashier', err);
        return throwError(() => err);
      }),
    );
  }

  collectCashier(ticketId: string): Observable<boolean> {
    return this.http.post<any>(this.endpoint('CollectCashier'), { ticketId }).pipe(
      map(() => true),
      catchError((err) => {
        this.logError('POST /Ticket/CollectCashier', err);
        return throwError(() => err);
      }),
    );
  }

  addExitTicket(ticketId: string): Observable<boolean> {
    const body = { ticketId };

    return this.http.post<any>(this.endpoint('ExitTicket'), body).pipe(
      map(() => true),
      catchError((err) => {
        this.logError('POST /Ticket/ExitTicket', err);
        return throwError(() => err);
      }),
    );
  }

  // ========= Entry / Exit lists =========

  private mapEntryToTicketDto(r: TicketEntryDto | any, action: TicketAction | ''): TicketDto {
    const customerName: string | null =
      r.customerName ?? r.CustomerName ?? r.name ?? r.Name ?? null;

    const phone: string | null = r.phone ?? r.Phone ?? null;
    const cardNumber: string | null = r.cardNumber ?? r.CardNumber ?? null;
    const plate: string = r.plate ?? r.Plate ?? '';

    let info: string | undefined = r.ticketInfo ?? r.TicketInfo ?? r.info ?? r.Info ?? undefined;

    if (!info) {
      const parts: string[] = [];

      if (customerName) parts.push(customerName);
      if (phone) parts.push(phone);
      if (cardNumber) {
        parts.push(cardNumber);
      } else if (plate) {
        parts.push(plate);
      }

      if (parts.length) {
        info = parts.join(' | ');
      }
    }

    const time: string =
      r.startDate ?? r.StartDate ?? r.dateTime ?? r.DateTime ?? new Date().toISOString();

    const internalId: string | number =
      r.id ?? r.Id ?? r.ticketId ?? r.TicketId ?? r.ticketNumber ?? r.TicketNumber ?? '';

    const displayId: string = r.ticketNumber ?? r.TicketNumber ?? r.id ?? r.Id ?? plate ?? '';

    return {
      id: internalId,
      ticketNumber: displayId,
      plate,
      action,
      time,
      gate: r.gate ?? r.Gate ?? '',
      price: Number(r.price ?? r.Price ?? 0),
      isCollectedByCashier: !!(r.isCollectedByCashier ?? r.IsCollectedByCashier),
      info,
      customerName,
      phone,
      cardNumber,
    };
  }

  getTicketsForEntry(
    startDate: string,
    ticketNumber: string = '',
  ): Observable<TicketsForGateResult> {
    return this.http
      .get<TicketTableResponseDto>(this.endpoint('GetTicketForEntry'), {
        params: { startDate, ticketNumber },
      })
      .pipe(
        map((res): TicketsForGateResult => {
          const rows = res?.ticketInfo ?? [];
          const items: TicketDto[] = rows.map((r) => this.mapEntryToTicketDto(r, 'IN'));

          return {
            items,
            totalPrice: res?.totalPrice ?? 0,
          };
        }),
        catchError((err) => {
          this.logError('GET /Ticket/GetTicketForEntry', err);
          return of({ items: [] as TicketDto[], totalPrice: 0 });
        }),
      );
  }

  getTicketsForExit(
    startDate: string,
    ticketNumber: string = '',
  ): Observable<TicketsForGateResult> {
    return this.http
      .get<TicketTableResponseDto>(this.endpoint('GetTicketForExit'), {
        params: { startDate, ticketNumber },
      })
      .pipe(
        map((res): TicketsForGateResult => {
          const rows = res?.ticketInfo ?? [];
          const items: TicketDto[] = rows.map((r) => this.mapEntryToTicketDto(r, 'OUT'));

          return {
            items,
            totalPrice: res?.totalPrice ?? 0,
          };
        }),
        catchError((err) => {
          this.logError('GET /Ticket/GetTicketForExit', err);
          return of({ items: [] as TicketDto[], totalPrice: 0 });
        }),
      );
  }

  // ========= Daily Collect (normal user / gate) =========

  collectDailyTickets(body: any = {}): Observable<CollectDailyTicketsResponse> {
    return this.http.post<CollectDailyTicketsResponse>(this.endpoint('CollectDailyTickets'), body);
  }

  // ========= Manual LPR capture =========

  captureManualPlate(plate: string): Observable<boolean> {
    const body = { vehicleNumber: plate.trim().toUpperCase() };

    return this.http.post<any>(this.endpoint('CaptureManualPlate'), body).pipe(
      map(() => true),
      catchError((err) => {
        this.logError('POST /Ticket/CaptureManualPlate', err);
        return throwError(() => err);
      }),
    );
  }

  // ========= Search Tickets (FAKE ENDPOINT - TODO: Replace when backend ready) =========

  /**
   * FAKE ENDPOINT - Replace with real API when ready
   * Real endpoint will be: GET /Ticket/Search?query={query}
   *
   * TODO: When backend is ready, replace with:
   * return this.http.get<TicketDto[]>(this.endpoint('Search'), { params: { query } });
   */
  searchTickets(query: string): Observable<TicketDto[]> {
    const trimmed = query?.trim();

    if (!trimmed) {
      return of([]);
    }

    const params = new HttpParams().set('SearchText', trimmed);

    return this.http.get<TicketEntryDto[]>(this.endpoint('SearchTicket'), { params }).pipe(
      map((rows) => {
        const list = rows ?? [];

        return list.map((r) => this.mapEntryToTicketDto(r, ''));
      }),
      catchError((err) => {
        this.logError('GET /Ticket/SearchTicket', err);
        return of([]);
      }),
    );
  }
}
