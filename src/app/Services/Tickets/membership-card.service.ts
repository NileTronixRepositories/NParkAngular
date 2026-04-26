import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, map, catchError, throwError } from 'rxjs';

import {
  CardMembershipCheckResponse,
  MembershipCheckResponse,
  ParkingCardSummaryDto,
} from '../../Domain/tickets/tickets.model';
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

  getCardSummaryByVehicleNumber(vehicleNumber: string): Observable<ParkingCardSummaryDto | null> {
    const trimmed = vehicleNumber?.trim();
    if (!trimmed) return of(null);

    const params = new HttpParams().set('VehicleNumber', trimmed);

    return this.http.get<any>(`${this.membershipsUrl}/GetCardSummary`, { params }).pipe(
      map((res: any) => res as ParkingCardSummaryDto),
      catchError((err) => {
        this.logError('GET /ParkingMemberships/GetCardSummary by vehicle number', err);
        return of(null);
      }),
    );
  }

  checkMembershipByCardNumber(cardNumber: string): Observable<CardMembershipCheckResponse> {
    const trimmed = cardNumber?.trim();
    if (!trimmed) {
      return of({ isMember: false });
    }

    const params = new HttpParams().set('cardNumber', trimmed);

    return this.http
      .get<any>(`${this.membershipsUrl}/check-by-card-number`, { params })
      .pipe(
        map((res: any): CardMembershipCheckResponse => ({
          isMember: !!(res?.isMember ?? res?.IsMember),
        })),
        catchError((err) => {
          this.logError('GET /ParkingMemberships/check-by-card-number', err);
          return throwError(() => err);
        }),
      );
  }

  isMembership(vehicleNumber: string): Observable<MembershipCheckResponse> {
    const trimmed = vehicleNumber?.trim();
    if (!trimmed) {
      return of({ isExist: false });
    }

    const params = new HttpParams().set('VehicleNumber', trimmed);

    return this.http.get<any>(`${this.membershipsUrl}/IsMemberShip`, { params }).pipe(
      map((res: any): MembershipCheckResponse => {
        const summary = this.extractSummary(res);
        const rawSummary = summary as any;

        return {
          isExist: !!(res?.isExist ?? res?.IsExist ?? res?.exists ?? res?.Exists),
          cardNumber:
            res?.cardNumber ??
            res?.CardNumber ??
            rawSummary?.cardNumber ??
            rawSummary?.CardNumber ??
            null,
          vehicleNumber:
            res?.vehicleNumber ??
            res?.VehicleNumber ??
            rawSummary?.vehicleNumber ??
            rawSummary?.VehicleNumber ??
            trimmed,
          summary,
        };
      }),
      catchError((err) => {
        this.logError('GET /ParkingMemberships/IsMemberShip', err);
        return throwError(() => err);
      }),
    );
  }

  private extractSummary(res: any): ParkingCardSummaryDto | null {
    return (res?.summary ?? res?.Summary ?? res?.membership ?? res?.Membership ?? res?.data ?? res?.Data ?? null) as
      | ParkingCardSummaryDto
      | null;
  }
}
