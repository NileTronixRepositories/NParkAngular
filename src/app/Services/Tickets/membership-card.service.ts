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
  private readonly isMembershipUrl = `${this.baseUrl}/ParkingMemberships/IsMemberShip`;

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
      }),
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

    return this.http.get<any>(`${this.membershipsUrl}/check-by-card-number`, { params }).pipe(
      map(
        (res: any): CardMembershipCheckResponse => {
          const summary = this.extractSummary(res);
          const rawSummary = summary as any;

          return {
            isMember: !!(res?.isMember ?? res?.IsMember),
            cardNumber:
              res?.cardNumber ??
              res?.CardNumber ??
              rawSummary?.cardNumber ??
              rawSummary?.CardNumber ??
              trimmed,
            vehicleNumber:
              res?.vehicleNumber ??
              res?.VehicleNumber ??
              rawSummary?.vehicleNumber ??
              rawSummary?.VehicleNumber ??
              null,
            summary,
          };
        },
      ),
      catchError((err) => {
        this.logError('GET /ParkingMemberships/check-by-card-number', err);
        return throwError(() => err);
      }),
    );
  }

  membershipExists(searchValue: string): Observable<MembershipCheckResponse> {
    const trimmed = searchValue?.trim();
    if (!trimmed) {
      return of({ isExist: false });
    }

    const params = new HttpParams().set('searchValue', trimmed);

    return this.http.get<any>(`${this.membershipsUrl}/membership-exists`, { params }).pipe(
      map((res: any) => this.mapMembershipExistsResponse(res, trimmed)),
      catchError((err) => {
        this.logError('GET /ParkingMemberships/membership-exists', err);
        return throwError(() => err);
      }),
    );
  }

  isMembership(vehicleNumber: string): Observable<MembershipCheckResponse> {
    const trimmed = this.normalizeVehicleNumber(vehicleNumber);
    if (!trimmed) {
      return of({ isExist: false });
    }

    const fixedUrl = `${this.isMembershipUrl}?VehicleNumber=${encodeURIComponent(trimmed)}`;
    const fallbackParams = new HttpParams().set('VehicleNumber', trimmed);

    return this.http.get<any>(fixedUrl).pipe(
      map((res: any) => this.mapMembershipResponse(res, trimmed)),
      catchError((err) => {
        if (err?.status === 0) {
          return this.http
            .get<any>(`${this.membershipsUrl}/IsMemberShip`, { params: fallbackParams })
            .pipe(map((res: any) => this.mapMembershipResponse(res, trimmed)));
        }

        this.logError('GET /ParkingMemberships/IsMemberShip', err);
        return throwError(() => err);
      }),
    );
  }

  private extractSummary(res: any): ParkingCardSummaryDto | null {
    return (res?.summary ??
      res?.Summary ??
      res?.membership ??
      res?.Membership ??
      res?.data ??
      res?.Data ??
      null) as ParkingCardSummaryDto | null;
  }

  private mapMembershipResponse(res: any, vehicleNumber: string): MembershipCheckResponse {
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
        vehicleNumber,
      summary,
    };
  }

  private mapMembershipExistsResponse(res: any, searchValue: string): MembershipCheckResponse {
    if (typeof res === 'boolean') {
      return {
        isExist: res,
        vehicleNumber: res ? searchValue : null,
        cardNumber: null,
        summary: null,
      };
    }

    const summary = this.extractSummary(res);
    const rawSummary = summary as any;

    const isExist = !!(
      res?.isExist ??
      res?.IsExist ??
      res?.exists ??
      res?.Exists ??
      res?.isMember ??
      res?.IsMember ??
      res?.found ??
      res?.Found ??
      summary
    );

    return {
      isExist,
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
        (isExist ? searchValue : null),
      summary,
    };
  }

  private normalizeVehicleNumber(value: string | undefined | null): string {
    const compact = String(value ?? '')
      .replace(/[\s\u00a0\u2000-\u200f\u2028-\u202f\u205f\u3000]+/g, '')
      .trim()
      .toUpperCase();

    const letters: string[] = [];
    const suffix: string[] = [];

    for (const char of Array.from(compact)) {
      if (this.isVehicleLetter(char) && suffix.length === 0) {
        letters.push(char);
      } else {
        suffix.push(char);
      }
    }

    return [letters.join(' '), suffix.join('')].filter(Boolean).join(' ');
  }

  private isVehicleLetter(char: string): boolean {
    return /^[A-Z\u0600-\u06FF]$/.test(char);
  }
}
