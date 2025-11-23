import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';
import {
  TicketDto,
  IssuedTicketResponse,
  TicketDetailsDto,
  TicketEntryDto,
  TicketAction,
  CollectCashierRequest,
} from '../../Domain/tickets/tickets.model';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class TicketsServices {
  private http = inject(HttpClient);
  private base = environment.baseUrl;

  getAll(): Observable<TicketDto[]> {
    return this.http.get<any[]>(`${this.base}/Ticket`).pipe(
      map((rows) =>
        (rows ?? []).map((r) => ({
          id: r.id ?? r.Id,
          plate: r.plate ?? r.Plate ?? '',
          action: (r.action ?? r.Action ?? '') as TicketDto['action'],
          time: (r.time ?? r.Time ?? r.dateTime ?? r.DateTime) as string,
          gate: r.gate ?? r.Gate ?? '',
        }))
      ),
      catchError((err) => {
        console.error('GET /Ticket failed', err);
        return of([] as TicketDto[]);
      })
    );
  }

  // ============ AddTicket   DTO   ============
  addTicket(): Observable<IssuedTicketResponse | null> {
    return this.http.post<IssuedTicketResponse>(`${this.base}/Ticket/AddTicket`, {}).pipe(
      catchError((err) => {
        console.error('POST /Ticket/AddTicket failed', err);
        return of(null);
      })
    );
  }

  getTicketByQr(code: string): Observable<TicketDetailsDto> {
    const params = new HttpParams().set('code', code);

    return this.http.get<any>(`${this.base}/Ticket/GetByQr`, { params }).pipe(
      map((res) => {
        const dateTime =
          res.dateTime ?? res.DateTime ?? res.start ?? res.Start ?? res.startDate ?? res.StartDate;
        const endDate =
          res.endDate ?? res.EndDate ?? res.end ?? res.End ?? res.finish ?? res.Finish;

        const price = Number(res.price ?? res.Price ?? 0);
        const exceedPrice = Number(res.exceedPrice ?? res.ExceedPrice ?? 0);
        const total =
          res.totalPrice ?? res.TotalPrice ?? Math.round((price + exceedPrice) * 100) / 100;

        return {
          id: res.id ?? res.Id,
          plate: res.plate ?? res.Plate ?? '',
          dateTime: typeof dateTime === 'string' ? dateTime : new Date(dateTime).toISOString(),
          endDate: typeof endDate === 'string' ? endDate : new Date(endDate).toISOString(),
          price,
          exceedPrice,
          totalPrice: Number(total),
        } as TicketDetailsDto;
      }),
      catchError((err) => {
        console.error('GET /Ticket/GetByQr failed', err);
        return of(null as unknown as TicketDetailsDto);
      })
    );
  }

  collect(id: number | string): Observable<boolean> {
    const realId = Number(id);
    return this.http.post<any>(`${this.base}/Ticket/Collect/${realId}`, {}).pipe(
      map(() => true),
      catchError((err) => {
        console.error('POST /Ticket/Collect/{id} failed', err);
        return of(false);
      })
    );
  }

  // ============ GetTicketForEntry   ============
  getTicketsForEntry(startDate: string, ticketNumber: string = ''): Observable<TicketDto[]> {
    return this.http
      .get<TicketEntryDto[]>(`${this.base}/Ticket/GetTicketForEntry`, {
        params: { startDate, ticketNumber },
      })
      .pipe(
        map((rows): TicketDto[] =>
          (rows ?? []).map(
            (r): TicketDto => ({
              id: r.ticketNumber,
              plate: '',
              action: '' as TicketDto['action'],
              time: r.startDate,
              gate: '',
              price: r.price,
              isCollectedByCashier: r.isCollectedByCashier,
            })
          )
        ),
        catchError((err) => {
          console.error('GET /Ticket/GetTicketForEntry failed', err);
          return of([] as TicketDto[]);
        })
      );
  }

  getTicketsForExit(startDate: string, ticketNumber: string = ''): Observable<TicketDto[]> {
    return this.http
      .get<TicketEntryDto[]>(`${this.base}/Ticket/GetTicketForExit`, {
        params: { startDate, ticketNumber },
      })
      .pipe(
        map((rows): TicketDto[] =>
          (rows ?? []).map(
            (r): TicketDto => ({
              id: r.ticketNumber,
              plate: '',
              action: 'OUT' as TicketAction,
              time: r.startDate,
              gate: '',
            })
          )
        ),
        catchError((err) => {
          console.error('GET /Ticket/GetTicketForExit failed', err);
          return of([] as TicketDto[]);
        })
      );
  }

  // ============ CollectCashier ============
  collectCashier(ticketId: string): Observable<boolean> {
    const body: CollectCashierRequest = { ticketId };

    return this.http.post<any>(`${this.base}/Ticket/CollectCashier`, body).pipe(
      map(() => true),
      catchError((err) => {
        console.error('POST /Ticket/CollectCashier failed', err);
        return of(false);
      })
    );
  }
}
