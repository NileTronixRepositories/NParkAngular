import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, throwError } from 'rxjs';
import {
  TicketDto,
  IssuedTicketResponse,
  TicketDetailsDto,
  TicketEntryDto,
  TicketAction,
  CollectCashierRequest,
  ParkingCardSummaryDto,
  AddTicketRequest,
  TicketTableResponseDto,
  CollectDailyTicketsResponse,
} from '../../Domain/tickets/tickets.model';
import { environment } from '../../Shared/environment/environment';
import { AuthService } from '../Auth/auth-service';

export interface TicketsForGateResult {
  items: TicketDto[];
  totalPrice: number;
}

@Injectable({
  providedIn: 'root',
})
export class TicketsServices {
  private http = inject(HttpClient);
  private base = environment.baseUrl;
  private auth = inject(AuthService);

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
      catchError(() => of([]))
    );
  }

  // ============ AddTicket ============

  addTicket(req: AddTicketRequest): Observable<IssuedTicketResponse | null> {
    const body: any = {
      isSubscriber: req.isSubscriber,
      vehicleNumber: req.vehicleNumber?.trim() || undefined,
      cardNumber: req.cardNumber?.trim() || undefined,
    };

    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    return this.http.post<IssuedTicketResponse>(`${this.base}/Ticket/AddTicket`, body).pipe(
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

  // ============ GetTicketForEntry ============
  getTicketsForEntry(
    startDate: string,
    ticketNumber: string = ''
  ): Observable<TicketsForGateResult> {
    return this.http
      .get<TicketTableResponseDto>(`${this.base}/Ticket/GetTicketForEntry`, {
        params: { startDate, ticketNumber },
      })
      .pipe(
        map((res): TicketsForGateResult => {
          const rows = res?.ticketInfo ?? [];

          const items: TicketDto[] = rows.map(
            (r): TicketDto => ({
              id: r.ticketNumber,
              plate: '',
              action: '' as TicketDto['action'],
              time: r.startDate,
              gate: '',
              price: r.price,
              isCollectedByCashier: r.isCollectedByCashier,
              info: r.ticketInfo ?? undefined,
            })
          );

          return {
            items,
            totalPrice: res?.totalPrice ?? 0,
          };
        }),
        catchError((err) => {
          console.error('GET /Ticket/GetTicketForEntry failed', err);
          return of({ items: [] as TicketDto[], totalPrice: 0 });
        })
      );
  }

  getTicketsForExit(
    startDate: string,
    ticketNumber: string = ''
  ): Observable<TicketsForGateResult> {
    return this.http
      .get<TicketTableResponseDto>(`${this.base}/Ticket/GetTicketForExit`, {
        params: { startDate, ticketNumber },
      })
      .pipe(
        map((res): TicketsForGateResult => {
          const rows = res?.ticketInfo ?? [];

          const items: TicketDto[] = rows.map(
            (r): TicketDto => ({
              id: r.ticketNumber,
              plate: '',
              action: 'OUT' as TicketAction,
              time: r.startDate,
              gate: '',
              price: r.price,
              isCollectedByCashier: r.isCollectedByCashier,
              info: r.ticketInfo ?? undefined,
            })
          );

          return {
            items,
            totalPrice: res?.totalPrice ?? 0,
          };
        }),
        catchError((err) => {
          console.error('GET /Ticket/GetTicketForExit failed', err);
          return of({ items: [] as TicketDto[], totalPrice: 0 });
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

  // ============ ParkingMemberships/GetCardSummary ============
  getCardSummary(cardNumber: string): Observable<ParkingCardSummaryDto | null> {
    const trimmed = cardNumber?.trim();
    if (!trimmed) return of(null);

    const params = new HttpParams().set('CardNumber', trimmed);

    return this.http.get<any>(`${this.base}/ParkingMemberships/GetCardSummary`, { params }).pipe(
      map((res: any) => res as ParkingCardSummaryDto),
      catchError((err) => {
        console.error('GET /ParkingMemberships/GetCardSummary failed', err);
        return of(null);
      })
    );
  }

  addExitTicket(ticketId: string): Observable<boolean> {
    const body = { ticketId };

    return this.http.post<any>(`${this.base}/Ticket/AddExitTicket`, body).pipe(
      map(() => true),
      catchError((err) => {
        console.error('POST /Ticket/AddExitTicket failed', err);
        return of(false);
      })
    );
  }

  collectDailyTickets(): Observable<CollectDailyTicketsResponse> {
    const gateData = this.auth.getGateData() as any;

    if (!gateData || !gateData.gateId) {
      return throwError(
        () => new Error('No gate selected or gateId missing in gateDevicePeripheral')
      );
    }

    const body = { gateId: gateData.gateId };

    return this.http.post<CollectDailyTicketsResponse>(
      `${this.base}/Ticket/CollectDailyTickets`,
      body
    );
  }
}
