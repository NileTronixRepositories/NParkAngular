import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, of, map, catchError, throwError } from 'rxjs';

import {
  TicketDto,
  TicketDetailsDto,
  TicketEntryDto,
  TicketAction,
  TicketTableResponseDto,
  CollectDailyTicketsResponse,
  CollectEnterTicketsResponse,
  UncollectedEnterTicketsResponse,
  ValidateExitByVehicleNumberResponse,
  ValidateExitByTextRequest,
  ValidateExitByTextResponse,
  SearchTicketRequest,
  SearchTicketResponse,
  TicketDetailsFilterRequest,
  TicketDetailsItemDto,
  normalizeEntryConfirmationStatus,
  normalizeExitEligibility,
} from '../../Domain/tickets/tickets.model';
import {
  GateOperationResponse,
  generateGateRequestId,
  normalizeGateOperationResponse,
} from '../../Domain/Gate/gate-operation.models';
import { PagedResult } from '../../Domain/PageResult/PagedResult';
import { environment } from '../../Shared/environment/environment';

export interface TicketsForGateResult {
  items: TicketDto[];
  totalPrice: number;
}

export interface UncollectedEnterTicketsResult extends TicketsForGateResult {
  gateId: string;
  totalTicketsCount: number;
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

  // ========= Scan Ticket (New Flow) =========

  scanTicket(qrCode: string): Observable<any> {
    const body = { qrCode: qrCode.trim() };
    return this.http.post<any>(this.endpoint('ScanTicket'), body).pipe(
      map((res) => {
        if (!res) return res;
        const eligibility = normalizeExitEligibility(res?.eligibility ?? res?.Eligibility, res);
        return {
          ...res,
          validExitDate: res?.validExitDate ?? res?.ValidExitDate ?? eligibility?.validExitDate ?? null,
          isValidForExit: res?.isValidForExit ?? res?.IsValidForExit ?? eligibility?.isValidForExit,
          reasonCode: res?.reasonCode ?? res?.ReasonCode ?? eligibility?.reasonCode,
          reasonMessage: res?.reasonMessage ?? res?.ReasonMessage ?? eligibility?.reasonMessage,
          eligibility,
          failureReasons: eligibility?.failureReasons ?? [],
        };
      }),
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

  collect(id: number | string, expectedBasePrice?: number): Observable<boolean> {
    return this.collectCashier(String(id), expectedBasePrice);
  }

  collectCashier(ticketId: string, expectedBasePrice?: number): Observable<boolean> {
    const body: Record<string, unknown> = { ticketId };
    if (expectedBasePrice !== undefined && expectedBasePrice !== null && !Number.isNaN(expectedBasePrice)) {
      body['expectedBasePrice'] = expectedBasePrice;
    }

    return this.http.post<any>(this.endpoint('CollectCashier'), body).pipe(
      map(() => true),
      catchError((err) => {
        this.logError('POST /Ticket/CollectCashier', err);
        return throwError(() => err);
      }),
    );
  }

  addExitTicket(
    ticketId: string,
    requestId?: string,
  ): Observable<HttpResponse<GateOperationResponse>> {
    const body = {
      ticketId,
      requestId: requestId?.trim() || generateGateRequestId(),
    };

    return this.http
      .post<any>(this.endpoint('ExitTicket'), body, { observe: 'response' })
      .pipe(
        map(
          (res) =>
            res.clone({
              body: res.body ? normalizeGateOperationResponse(res.body) : null,
            }) as HttpResponse<GateOperationResponse>,
        ),
        catchError((err) => {
          this.logError('POST /Ticket/ExitTicket', err);
          return throwError(() => err);
        }),
      );
  }

  private isSuccessResponse(res: any): boolean {
    if (res == null || res === '') return true;
    if (res === true) return true;

    if (typeof res === 'string') {
      return res.trim().toLowerCase() === 'success';
    }

    const raw =
      res.success ??
      res.Success ??
      res.isSuccess ??
      res.IsSuccess ??
      res.succeeded ??
      res.Succeeded ??
      res.status ??
      res.Status ??
      res.result ??
      res.Result ??
      res.message ??
      res.Message;

    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') return raw.trim().toLowerCase() === 'success';

    return false;
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

    const rawEntryStatus = r.entryConfirmationStatus ?? r.EntryConfirmationStatus;
    const rawEligibility = r.eligibility ?? r.Eligibility;

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
      entryConfirmationStatus:
        rawEntryStatus !== undefined && rawEntryStatus !== null
          ? normalizeEntryConfirmationStatus(rawEntryStatus)
          : undefined,
      entryConfirmedAtUtc: r.entryConfirmedAtUtc ?? r.EntryConfirmedAtUtc ?? null,
      validExitDate: r.validExitDate ?? r.ValidExitDate ?? null,
      eligibility: rawEligibility ? normalizeExitEligibility(rawEligibility) : null,
    };
  }

  private mapUncollectedEnterTicketToTicketDto(r: any): TicketDto {
    const ticketId = r.ticketId ?? r.TicketId ?? '';
    const ticketNumber = r.ticketUniqueCode ?? r.TicketUniqueCode ?? ticketId;
    const vehicleNumber = r.vehicleNumber ?? r.VehicleNumber ?? '';
    const cardNumber = r.cardNumber ?? r.CardNumber ?? null;
    const source = r.source ?? r.Source ?? '';

    const info = [vehicleNumber, cardNumber, source].filter(Boolean).join(' | ');

    return {
      id: ticketId,
      ticketNumber,
      plate: vehicleNumber,
      action: 'IN',
      time: r.startDate ?? r.StartDate ?? new Date().toISOString(),
      gate: r.gateId ?? r.GateId ?? '',
      price: Number(r.originalPrice ?? r.OriginalPrice ?? 0),
      isCollectedByCashier: false,
      info,
      cardNumber,
      plateNumber: vehicleNumber,
    };
  }

  getUncollectedEnterTickets(): Observable<UncollectedEnterTicketsResult> {
    return this.http.get<UncollectedEnterTicketsResponse>(this.endpoint('uncollected-enter-tickets')).pipe(
      map((res: any): UncollectedEnterTicketsResult => {
        const rows = res?.tickets ?? res?.Tickets ?? [];

        return {
          gateId: res?.gateId ?? res?.GateId ?? '',
          totalTicketsCount: Number(res?.totalTicketsCount ?? res?.TotalTicketsCount ?? rows.length),
          totalPrice: Number(res?.totalOriginalPrice ?? res?.TotalOriginalPrice ?? 0),
          items: rows.map((row: any) => this.mapUncollectedEnterTicketToTicketDto(row)),
        };
      }),
      catchError((err) => {
        this.logError('GET /Ticket/uncollected-enter-tickets', err);
        return throwError(() => err);
      }),
    );
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
          const rows = res?.ticketInfo ?? (res as any)?.TicketInfo ?? [];
          const items: TicketDto[] = rows.map((r) => this.mapEntryToTicketDto(r, 'IN'));

          return {
            items,
            totalPrice: res?.totalPrice ?? (res as any)?.TotalPrice ?? 0,
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
          const rows = res?.ticketInfo ?? (res as any)?.TicketInfo ?? [];
          const items: TicketDto[] = rows.map((r) => this.mapEntryToTicketDto(r, 'OUT'));

          return {
            items,
            totalPrice: res?.totalPrice ?? (res as any)?.TotalPrice ?? 0,
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

  collectEnterTickets(): Observable<CollectDailyTicketsResponse> {
    return this.http.post<CollectEnterTicketsResponse>(this.endpoint('collect-enter-tickets'), {}).pipe(
      map((res) => this.mapCollectEnterResponseToSummary(res)),
      catchError((err) => {
        this.logError('POST /Ticket/collect-enter-tickets', err);
        return throwError(() => err);
      }),
    );
  }

  mapCollectEnterResponseToSummary(res: CollectEnterTicketsResponse | any): CollectDailyTicketsResponse {
    const tickets = res?.tickets ?? res?.Tickets ?? [];
    const collectedAt = res?.collectedAt ?? res?.CollectedAt ?? new Date().toISOString();
    const lines = (res?.lines ?? res?.Lines ?? []).map((line: any) => ({
      responsibleUserId: String(line?.responsibleUserId ?? line?.ResponsibleUserId ?? ''),
      responsibleUserName: String(line?.responsibleUserName ?? line?.ResponsibleUserName ?? ''),
      ticketsCount: Number(line?.ticketsCount ?? line?.TicketsCount ?? line?.itemsCount ?? 0),
      totalOriginalPrice: Number(
        line?.totalOriginalPrice ?? line?.TotalOriginalPrice ?? line?.totalAmount ?? 0,
      ),
    }));
    const responsibleNames = new Map(
      lines.map((line: any) => [line.responsibleUserId, line.responsibleUserName]),
    );

    return {
      transactionId: res?.transactionId ?? res?.TransactionId ?? null,
      gateId: res?.gateId ?? res?.GateId ?? '',
      gateName: null,
      collectedBy: res?.collectedBy ?? res?.CollectedBy ?? null,
      collectedName: res?.collectedName ?? res?.CollectedName ?? null,
      date: collectedAt,
      totalAmount: Number(
        res?.totalOriginalPriceCollected ?? res?.TotalOriginalPriceCollected ?? 0,
      ),
      totalPriceCollected: Number(
        res?.totalOriginalPriceCollected ?? res?.TotalOriginalPriceCollected ?? 0,
      ),
      totalTicketsCollected: Number(
        res?.totalTicketsCollected ?? res?.TotalTicketsCollected ?? tickets.length,
      ),
      lines,
      ticketCollectDetails: tickets.map((ticket: any) => ({
        ticketId: ticket?.ticketId ?? ticket?.TicketId ?? null,
        responsibleUserId: ticket?.responsibleUserId ?? ticket?.ResponsibleUserId ?? null,
        responsibleUserName:
          ticket?.responsibleUserName ??
          ticket?.ResponsibleUserName ??
          responsibleNames.get(ticket?.responsibleUserId ?? ticket?.ResponsibleUserId) ??
          null,
        collectedAt: ticket?.collectedAt ?? ticket?.CollectedAt ?? collectedAt,
        ticketNumber:
          ticket?.ticketUniqueCode ??
          ticket?.TicketUniqueCode ??
          ticket?.ticketId ??
          ticket?.TicketId ??
          '',
        source: ticket?.source ?? ticket?.Source ?? null,
        startDate: ticket?.startDate ?? ticket?.StartDate ?? null,
        endDate: ticket?.endDate ?? ticket?.EndDate ?? null,
        price: Number(ticket?.originalPrice ?? ticket?.OriginalPrice ?? 0),
        vehicleNumber: ticket?.vehicleNumber ?? ticket?.VehicleNumber ?? null,
        cardNumber: ticket?.cardNumber ?? ticket?.CardNumber ?? null,
        isSubscriber: !!(ticket?.isSubscriber ?? ticket?.IsSubscriber),
        gateId: ticket?.gateId ?? ticket?.GateId ?? null,
        gateNumber:
          ticket?.gateNumber != null || ticket?.GateNumber != null
            ? Number(ticket?.gateNumber ?? ticket?.GateNumber)
            : null,
        gateType: ticket?.gateType ?? ticket?.GateType ?? null,
        exitGateId: ticket?.exitGateId ?? ticket?.ExitGateId ?? null,
        extraFields: this.extractTicketExtraFields(ticket),
      })),
    };
  }

  mapUncollectedEnterResponseToSummary(res: UncollectedEnterTicketsResponse | any): CollectDailyTicketsResponse {
    const tickets = res?.tickets ?? res?.Tickets ?? [];
    const date = new Date().toISOString();

    return {
      gateId: res?.gateId ?? res?.GateId ?? '',
      gateName: null,
      date,
      totalAmount: Number(res?.totalOriginalPrice ?? res?.TotalOriginalPrice ?? 0),
      totalPriceCollected: Number(res?.totalOriginalPrice ?? res?.TotalOriginalPrice ?? 0),
      totalTicketsCollected: Number(
        res?.totalTicketsCount ?? res?.TotalTicketsCount ?? tickets.length,
      ),
      ticketCollectDetails: tickets.map((ticket: any) => ({
        ticketId: ticket?.ticketId ?? ticket?.TicketId ?? null,
        collectedAt: ticket?.startDate ?? ticket?.StartDate ?? date,
        ticketNumber:
          ticket?.ticketUniqueCode ??
          ticket?.TicketUniqueCode ??
          ticket?.ticketId ??
          ticket?.TicketId ??
          '',
        source: ticket?.source ?? ticket?.Source ?? null,
        startDate: ticket?.startDate ?? ticket?.StartDate ?? null,
        endDate: ticket?.endDate ?? ticket?.EndDate ?? null,
        price: Number(ticket?.originalPrice ?? ticket?.OriginalPrice ?? 0),
        vehicleNumber: ticket?.vehicleNumber ?? ticket?.VehicleNumber ?? null,
        cardNumber: ticket?.cardNumber ?? ticket?.CardNumber ?? null,
        isSubscriber: !!(ticket?.isSubscriber ?? ticket?.IsSubscriber),
        gateNumber:
          ticket?.gateNumber != null || ticket?.GateNumber != null
            ? Number(ticket?.gateNumber ?? ticket?.GateNumber)
            : null,
        gateType: ticket?.gateType ?? ticket?.GateType ?? null,
        exitGateId: ticket?.exitGateId ?? ticket?.ExitGateId ?? null,
        extraFields: this.extractTicketExtraFields(ticket),
      })),
    };
  }

  private extractTicketExtraFields(ticket: any): Record<string, unknown> {
    if (!ticket || typeof ticket !== 'object') return {};

    const known = new Set(
      [
        'ticketId',
        'ticketUniqueCode',
        'source',
        'startDate',
        'endDate',
        'collectedAt',
        'originalPrice',
        'vehicleNumber',
        'cardNumber',
        'isSubscriber',
        'gateNumber',
        'gateType',
        'gateId',
        'exitGateId',
      ].flatMap((key) => [key, key.charAt(0).toUpperCase() + key.slice(1)]),
    );

    return Object.entries(ticket).reduce(
      (acc, [key, value]) => {
        if (!known.has(key)) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  // ========= Search Tickets =========

  searchTicketLookup(request: SearchTicketRequest): Observable<SearchTicketResponse[]> {
    let params = new HttpParams()
      .set('orderSort', request.orderSort ?? 'Newest')
      .set('pageNumber', String(request.pageNumber ?? 1))
      .set('pageSize', String(request.pageSize ?? 10));

    const searchText = this.normalizeTicketSearchText(request.searchText);
    if (searchText) {
      params = params.set('searchText', searchText);
    }

    if (request.startDate) {
      params = params.set('startDate', request.startDate);
    }

    return this.http.get<SearchTicketResponse[]>(this.endpoint('search'), { params }).pipe(
      map((rows) =>
        (rows ?? []).map((r: any) => ({
          id: r.id ?? r.Id,
          startDate: r.startDate ?? r.StartDate,
          vehicleNumber: r.vehicleNumber ?? r.VehicleNumber ?? null,
          cardNumber: r.cardNumber ?? r.CardNumber ?? null,
          uniqueCode: r.uniqueCode ?? r.UniqueCode ?? '',
          isSubscribe: !!(r.isSubscribe ?? r.IsSubscribe),
          price: Number(r.price ?? r.Price ?? 0),
        })),
      ),
      catchError((err) => {
        this.logError('GET /Ticket/search', err);
        return throwError(() => err);
      }),
    );
  }

  private normalizeTicketSearchText(value: string | null | undefined): string {
    let text = String(value ?? '').replace(/[\r\n]+/g, '').trim();

    if (text.startsWith('=')) {
      text = text.slice(1).trim();
    }

    text = text.replace(/^[\s"'`“”«»]+/, '').replace(/[\s"'`“”«»]+$/, '').trim();

    let changed = true;
    while (changed && text.length >= 2) {
      changed = false;
      const first = text.charAt(0);
      const last = text.charAt(text.length - 1);
      if (
        (first === '"' && last === '"') ||
        (first === "'" && last === "'") ||
        (first === '`' && last === '`') ||
        (first === '“' && last === '”') ||
        (first === '«' && last === '»')
      ) {
        text = text.slice(1, -1).trim();
        changed = true;
      }
    }

    return text;
  }

  searchTickets(query: string): Observable<TicketDto[]> {
    return this.searchTicketLookup({
      searchText: query,
      orderSort: 'Newest',
      pageNumber: 1,
      pageSize: 10,
    }).pipe(
      map((rows) =>
        rows.map((r) => ({
          id: r.id,
          ticketNumber: r.uniqueCode,
          plate: r.vehicleNumber ?? '',
          action: '' as TicketDto['action'],
          time: r.startDate,
          gate: '',
          price: r.price,
          info: r.cardNumber ?? r.uniqueCode,
          cardNumber: r.cardNumber,
        })),
      ),
      catchError(() => of([])),
    );
  }

  // ========= Exit Validation (Unified Eligibility V2) =========

  validateExitByVehicleNumber(
    vehicleNumber: string,
  ): Observable<ValidateExitByVehicleNumberResponse> {
    const params = new HttpParams().set('vehicleNumber', vehicleNumber);
    return this.http
      .get<any>(this.endpoint('validate-exit-by-vehicle-number'), {
        params,
      })
      .pipe(
        map((res) => this.normalizeVehicleValidationResponse(res)),
        catchError((err) => {
          this.logError('GET /Ticket/validate-exit-by-vehicle-number', err);
          return throwError(() => err);
        }),
      );
  }

  validateExitByText(body: ValidateExitByTextRequest): Observable<ValidateExitByTextResponse> {
    return this.http
      .post<any>(this.endpoint('validate-exit-by-text'), body)
      .pipe(
        map((res) => this.normalizeTextValidationResponse(res)),
        catchError((err) => {
          this.logError('POST /Ticket/validate-exit-by-text', err);
          return throwError(() => err);
        }),
      );
  }

  private normalizeVehicleValidationResponse(res: any): ValidateExitByVehicleNumberResponse {
    const eligibility = normalizeExitEligibility(res?.eligibility ?? res?.Eligibility, res);
    return {
      ticketId: res?.ticketId ?? res?.TicketId ?? null,
      vehicleNumber: res?.vehicleNumber ?? res?.VehicleNumber ?? null,
      ticketNumber: res?.ticketNumber ?? res?.TicketNumber ?? null,
      cardNumber: res?.cardNumber ?? res?.CardNumber ?? null,
      startDate: res?.startDate ?? res?.StartDate ?? null,
      endDate: res?.endDate ?? res?.EndDate ?? null,
      isValidForExit: !!(res?.isValidForExit ?? res?.IsValidForExit),
      reasonCode: String(res?.reasonCode ?? res?.ReasonCode ?? eligibility?.reasonCode ?? ''),
      reasonMessage: String(
        res?.reasonMessage ?? res?.ReasonMessage ?? eligibility?.reasonMessage ?? '',
      ),
      validExitDate: res?.validExitDate ?? res?.ValidExitDate ?? eligibility?.validExitDate ?? null,
      requiresBasePayment: !!(
        res?.requiresBasePayment ??
        res?.RequiresBasePayment ??
        eligibility?.requiresBasePayment
      ),
      requiresOvernightPenalty: !!(
        res?.requiresOvernightPenalty ??
        res?.RequiresOvernightPenalty ??
        eligibility?.requiresOvernightPenalty
      ),
      hasOutstandingSanctions: !!(
        res?.hasOutstandingSanctions ??
        res?.HasOutstandingSanctions ??
        eligibility?.hasOutstandingSanctions
      ),
      outstandingAmount: Number(
        res?.outstandingAmount ?? res?.OutstandingAmount ?? eligibility?.outstandingAmount ?? 0,
      ),
      existingOperationId:
        res?.existingOperationId ??
        res?.ExistingOperationId ??
        eligibility?.existingOperationId ??
        null,
      eligibility,
      failureReasons: eligibility?.failureReasons ?? [],
    };
  }

  private normalizeTextValidationResponse(res: any): ValidateExitByTextResponse {
    const base = this.normalizeVehicleValidationResponse(res);
    return {
      ...base,
      inputText: String(res?.inputText ?? res?.InputText ?? ''),
      matchType: res?.matchType ?? res?.MatchType ?? null,
    };
  }

  // ========= Paginated Ticket Details =========

  getTicketDetails(
    filter: TicketDetailsFilterRequest = {},
  ): Observable<PagedResult<TicketDetailsItemDto>> {
    const pageNumber = Math.max(1, Number(filter.pageNumber ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(filter.pageSize ?? 10)));

    let params = new HttpParams()
      .set('PageNumber', String(pageNumber))
      .set('PageSize', String(pageSize))
      .set('OrderSort', filter.orderSort ?? 'Newest');

    const searchText = this.normalizeTicketSearchText(filter.searchText);
    if (searchText) params = params.set('SearchText', searchText);
    if (filter.fromDate) params = params.set('FromDate', filter.fromDate);
    if (filter.toDate) params = params.set('ToDate', filter.toDate);
    if (filter.gateId) params = params.set('GateId', filter.gateId);
    if (typeof filter.isCollected === 'boolean') {
      params = params.set('IsCollected', String(filter.isCollected));
    }
    if (typeof filter.isSubscriber === 'boolean') {
      params = params.set('IsSubscriber', String(filter.isSubscriber));
    }

    return this.http
      .get<PagedResult<TicketDetailsItemDto>>(this.endpoint('GetDetails'), { params })
      .pipe(
        catchError((err) => {
          this.logError('GET /Ticket/GetDetails', err);
          return throwError(() => err);
        }),
      );
  }
}
