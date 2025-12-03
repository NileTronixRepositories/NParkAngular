import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError } from 'rxjs';

import { ParkingCardSummaryDto } from '../../Domain/tickets/tickets.model';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class MembershipCardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly membershipsUrl = `${this.baseUrl}/ParkingMemberships`;

  private logError(operation: string, error: unknown): void {
    console.error(`[MembershipCardService] ${operation} failed`, error);
  }

  getCardSummary(cardNumber: string): Observable<ParkingCardSummaryDto | null> {
    const trimmed = cardNumber?.trim();
    if (!trimmed) return of(null);

    const params = new HttpParams().set('CardNumber', trimmed);

    return this.http.get<any>(`${this.membershipsUrl}/GetCardSummary`, { params }).pipe(
      map((res: any) => res as ParkingCardSummaryDto),
      catchError((err) => {
        this.logError('GET /ParkingMemberships/GetCardSummary', err);
        return of(null);
      })
    );
  }
}
