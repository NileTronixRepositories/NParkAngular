import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import { ReportTicketsResponse } from '../../Domain/Reports/reports.model';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly ticketUrl = `${this.baseUrl}/Ticket`;

  getReport(
    fromDate: string,
    toDate: string,
    searchTerm: string = '',
  ): Observable<ReportTicketsResponse[]> {
    const normalizedSearchTerm = searchTerm.trim();
    const params = new HttpParams()
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('SearchTerm', normalizedSearchTerm);

    return this.http.get<ReportTicketsResponse[]>(`${this.ticketUrl}/Report`, { params }).pipe(
      map((items) => (items ?? []).map((item) => this.normalizeReportTicket(item as any))),
      catchError((err) => {
        console.error('[ReportsService] getReport failed', err);
        return throwError(() => err);
      }),
    );
  }

  private normalizeReportTicket(item: any): ReportTicketsResponse {
    return {
      ticketId: this.string(item, 'ticketId', 'TicketId', 'id', 'Id'),
      enterDate: this.string(item, 'enterDate', 'EnterDate', 'startDate', 'StartDate'),
      exitDate: this.value<string | null>(item, 'exitDate', 'ExitDate', 'endDate', 'EndDate') ?? null,
      vehicleNumber:
        this.value<string | null>(item, 'vehicleNumber', 'VehicleNumber', 'plate', 'Plate') ?? null,
      isSubscribed: this.boolean(item, 'isSubscribed', 'IsSubscribed', 'isSubscriber', 'IsSubscriber'),
      price: this.number(item, 'price', 'Price'),
      collectorName: this.string(item, 'collectorName', 'CollectorName'),
      ticketNumber: this.string(item, 'ticketNumber', 'TicketNumber'),
      exceedPrice: this.number(item, 'exceedPrice', 'ExceedPrice'),
      isInsideParking: this.boolean(item, 'isInsideParking', 'IsInsideParking'),
      ticketStatus: this.string(item, 'ticketStatus', 'TicketStatus'),
      createdByUserId: this.string(item, 'createdByUserId', 'CreatedByUserId'),
      createdByUserName: this.string(item, 'createdByUserName', 'CreatedByUserName'),
      entryGateNumber: this.nullableNumber(item, 'entryGateNumber', 'EntryGateNumber'),
      exitGateNumber: this.nullableNumber(item, 'exitGateNumber', 'ExitGateNumber'),
      attachments: this.attachments(item),
    };
  }

  private attachments(item: any): ReportTicketsResponse['attachments'] {
    const value = this.value<any[]>(item, 'attachments', 'Attachments');
    return Array.isArray(value) ? value : [];
  }

  private string(source: any, ...keys: string[]): string {
    return String(this.value(source, ...keys) ?? '');
  }

  private number(source: any, ...keys: string[]): number {
    return Number(this.value(source, ...keys) ?? 0);
  }

  private nullableNumber(source: any, ...keys: string[]): number | null {
    const value = this.value(source, ...keys);
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  private boolean(source: any, ...keys: string[]): boolean {
    const value = this.value(source, ...keys);
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private value<T = any>(source: any, ...keys: string[]): T | undefined {
    for (const key of keys) {
      if (source?.[key] !== undefined) return source[key] as T;
    }
    return undefined;
  }
}
