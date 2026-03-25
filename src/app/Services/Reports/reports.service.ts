import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import { ReportTicketsResponse } from '../../Domain/Reports/reports.model';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly ticketUrl = `${this.baseUrl}/Ticket`;

  getReport(fromDate: string, toDate: string, searchTerm: string = ''): Observable<ReportTicketsResponse[]> {
    const params = new HttpParams()
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('SearchTerm', searchTerm);

    return this.http.get<ReportTicketsResponse[]>(`${this.ticketUrl}/Report`, { params }).pipe(
      catchError((err) => {
        console.error('[ReportsService] getReport failed', err);
        return throwError(() => err);
      })
    );
  }
}
