import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpBackend } from '@angular/common/http';
import { Observable, of, map, catchError, switchMap, throwError, tap } from 'rxjs';
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
  CalculateSalaryResponse,
} from '../../Domain/tickets/tickets.model';
import { environment } from '../../Shared/environment/environment';
import { AuthResponse, AuthService } from '../Auth/auth-service';
import { GateType } from '../../Domain/Auth/auth.models';

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
  private httpBackend = inject(HttpBackend);
  private _rawHttp?: HttpClient;

  private get rawHttp(): HttpClient {
    if (!this._rawHttp) {
      this._rawHttp = new HttpClient(this.httpBackend);
    }
    return this._rawHttp;
  }

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

  /** QR Ticket salary */
  calculateTicketSalary(qrCode: string): Observable<CalculateSalaryResponse | null> {
    const trimmed = qrCode?.trim();
    if (!trimmed) return of(null);

    const body = { qrCode: trimmed };

    return this.http
      .post<CalculateSalaryResponse>(`${this.base}/Ticket/CalculateQrCodeTicketSalary`, body)
      .pipe(
        catchError((err) => {
          console.error('POST /Ticket/CalculateQrCodeTicketSalary failed', err);
          return of(null);
        })
      );
  }

  /** Subscriber card salary */
  calculateSubscriberSalary(cardNumber: string): Observable<CalculateSalaryResponse | null> {
    const trimmed = cardNumber?.trim();
    if (!trimmed) return of(null);

    const body = { cardNumber: trimmed };

    return this.http
      .post<CalculateSalaryResponse>(
        `${this.base}/Ticket/CalculateSalaryForSubscriberCommand`,
        body
      )
      .pipe(
        catchError((err) => {
          console.error('POST /Ticket/CalculateSalaryForSubscriberCommand failed', err);
          return of(null);
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

  // ========= Helper: map row to TicketDto =========
// ========= Helper: map row to TicketDto =========
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

  const id: string | number = r.ticketNumber ?? r.TicketNumber ?? r.id ?? r.Id ?? plate ?? '';

  return {
    id,
    plate,
    action,
    time,
    gate: r.gate ?? r.Gate ?? '',
    price: Number(r.price ?? r.Price ?? 0),

    // ✅ API راجع bool باسم isCollectedByCashier → نستخدمه زي ما هو
    isCollectedByCashier: !!(r.isCollectedByCashier ?? r.IsCollectedByCashier),

    info,
    customerName,
    phone,
    cardNumber,
  };
}
  

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

          const items: TicketDto[] = rows.map((r) => this.mapEntryToTicketDto(r, 'IN'));

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

          const items: TicketDto[] = rows.map((r) => this.mapEntryToTicketDto(r, 'OUT'));

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

  collectCashier(ticketId: string): Observable<boolean> {
    // 👈 POST على نفس الـ Route بدون Baram في الـ URL
    return this.http
      .post<any>(`${this.base}/Ticket/CollectCashier`, { ticketId }) // body => { ticketId: "guid" }
      .pipe(
        map(() => true),
        catchError((err) => {
          console.error('POST /Ticket/CollectCashier failed', err);
          return of(false);
        })
      );
  }
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
    return this.http.post<CollectDailyTicketsResponse>(
      `${this.base}/Ticket/CollectDailyTickets`,
      {}
    );
  }

  captureManualPlate(plate: string): Observable<boolean> {
    const body = { vehicleNumber: plate.trim().toUpperCase() };

    return this.http.post<any>(`${this.base}/Ticket/CaptureManualPlate`, body).pipe(
      map(() => true),
      catchError((err) => {
        console.error('POST /Ticket/CaptureManualPlate failed', err);
        return of(false);
      })
    );
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

    return this.rawHttp.post<AuthResponse>(`${this.base}/auth/SuperVisorLogin`, loginBody).pipe(
      tap((authRes) => {
        if (!authRes?.token) {
          throw new Error('No token returned from supervisor login');
        }
        this.auth.updateToken(authRes.token);
      }),
      switchMap(() => {
        const collectBody = { gateId };
        return this.http.post<CollectDailyTicketsResponse>(
          `${this.base}/Ticket/CollectDailyTickets`,
          collectBody
        );
      }),
      catchError((err) => {
        console.error('collectDailyTicketsAsSupervisor failed', err);
        return throwError(() => err);
      })
    );
  }
}
