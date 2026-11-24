import { Injectable, inject } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { Observable, of, catchError, map, throwError } from 'rxjs';

import {
  TicketDto,
  IssuedTicketResponse,
  TicketDetailsDto,
  ParkingCardSummaryDto,
  AddTicketRequest,
  CollectDailyTicketsResponse,
  CalculateSalaryResponse,
  MembershipCheckResponse,
  CardMembershipCheckResponse,
  ValidateExitByVehicleNumberResponse,
  ValidateExitByTextRequest,
  ValidateExitByTextResponse,
  SearchTicketRequest,
  SearchTicketResponse,
  TicketDetailsFilterRequest,
  TicketDetailsItemDto,
  normalizeEntryConfirmationStatus,
} from '../../Domain/tickets/tickets.model';
import { GateOperationResponse } from '../../Domain/Gate/gate-operation.models';
import { PagedResult } from '../../Domain/PageResult/PagedResult';

import {
  TicketCoreService,
  TicketsForGateResult,
  UncollectedEnterTicketsResult,
} from './ticket-core.service';
import { TicketSalaryService } from './ticket-salary.service';
import { MembershipCardService } from './membership-card.service';
import {
  SupervisorEntryCollectSession,
  TicketSupervisorService,
} from './ticket-supervisor.service';
import { GateType } from '../../Domain/Auth/auth.models';

@Injectable({
  providedIn: 'root',
})
export class TicketsServices {
  private readonly core = inject(TicketCoreService);
  private readonly salary = inject(TicketSalaryService);
  private readonly membership = inject(MembershipCardService);
  private readonly supervisor = inject(TicketSupervisorService);

  // ========= helpers (for logging unified under facade) =========

  private logError(operation: string, error: unknown): void {
    console.error(`[TicketsServices] ${operation} failed`, error);
  }

  // ========= Same public API as before =========

  getTicketsForEntry(
    startDate: string,
    ticketNumber: string = '',
  ): Observable<TicketsForGateResult> {
    return this.core.getTicketsForEntry(startDate, ticketNumber);
  }

  getTicketsForExit(
    startDate: string,
    ticketNumber: string = '',
  ): Observable<TicketsForGateResult> {
    return this.core.getTicketsForExit(startDate, ticketNumber);
  }

  getUncollectedEnterTickets(): Observable<UncollectedEnterTicketsResult> {
    return this.core.getUncollectedEnterTickets();
  }

  // --- Add Ticket ---

  addTicket(req: AddTicketRequest): Observable<IssuedTicketResponse | null> {
    const formData = new FormData();
    const imageFiles = [
      req.scannedFile ?? null,
      ...(req.ticketsImages ?? []),
      ...(req.vehicleImages ?? []),
    ].filter((file): file is File => !!file);

    formData.append('IsSubscriber', String(req.isSubscriber));

    const vehicleNumber = req.vehicleNumber?.trim();
    const cardNumber = req.cardNumber?.trim();

    if (vehicleNumber) {
      formData.append('VehicleNumber', vehicleNumber);
    }

    if (cardNumber) {
      formData.append('CardNumber', cardNumber);
    }

    if (req.pricingSchemaId?.trim()) {
      formData.append('PricingSchemaId', req.pricingSchemaId.trim());
    }

    if (req.scannerPhoto) {
      formData.append('ScannerPhoto', req.scannerPhoto, req.scannerPhoto.name);
    }

    Array.from(new Set(imageFiles)).forEach((file) => {
      formData.append('TicketsImages', file, file.name);
    });

    return this.core.addTicket(formData).pipe(
      map((res: any): IssuedTicketResponse | null => {
        if (!res || typeof res !== 'object') return null;

        const ticketId = String(res.ticketId ?? res.TicketId ?? '').trim();
        if (!ticketId) return null;

        return {
          success: true,
          ticketId,
          createdAt: String(res.createdAt ?? res.CreatedAt ?? ''),
          price: Number(res.price ?? res.Price ?? 0),
          qrCode:
            res.qrCode ??
            res.QrCode ??
            res.qRCode ??
            res.QRCode ??
            res.qr ??
            res.Qr ??
            res.qrImage ??
            res.QrImage ??
            res.qrCodeBase64 ??
            res.QrCodeBase64 ??
            '',
          ticketInfo: res.ticketInfo ?? res.TicketInfo,
          vehicleNumber: res.vehicleNumber ?? res.VehicleNumber,
          validExitDate: String(res.validExitDate ?? res.ValidExitDate ?? ''),
          entryConfirmationStatus: normalizeEntryConfirmationStatus(
            res.entryConfirmationStatus ?? res.EntryConfirmationStatus ?? 'Pending',
          ),
          isCashierCollected: !!(res.isCashierCollected ?? res.IsCashierCollected),
        };
      }),
      catchError((err) => {
        this.logError('addTicket', err);
        return throwError(() => err);
      }),
    );
  }

  scanTicket(qrCode: string): Observable<any> {
    return this.core.scanTicket(qrCode);
  }

  calculateTicketSalary(
    ticketId: string,
    sanctionIds?: string[],
  ): Observable<CalculateSalaryResponse | null> {
    return this.salary.calculateTicketSalary(ticketId, sanctionIds);
  }

  calculateSubscriberSalary(
    cardNumber: string,
    sanctionIds?: string[],
  ): Observable<CalculateSalaryResponse | null> {
    return this.salary.calculateSubscriberSalary(cardNumber, sanctionIds);
  }

  // --- Collect / Exit ---

  collect(id: number | string, expectedBasePrice?: number): Observable<boolean> {
    return this.core.collect(id, expectedBasePrice);
  }

  collectCashier(ticketId: string, expectedBasePrice?: number): Observable<boolean> {
    return this.core.collectCashier(ticketId, expectedBasePrice);
  }

  addExitTicket(ticketId: string): Observable<HttpResponse<GateOperationResponse>> {
    return this.core.addExitTicket(ticketId);
  }

  // --- Card summary ---

  getCardSummary(cardNumber: string): Observable<ParkingCardSummaryDto | null> {
    return this.membership.getCardSummary(cardNumber);
  }

  getCardSummaryByVehicleNumber(vehicleNumber: string): Observable<ParkingCardSummaryDto | null> {
    return this.membership.getCardSummaryByVehicleNumber(vehicleNumber);
  }

  checkMembershipByCardNumber(cardNumber: string): Observable<CardMembershipCheckResponse> {
    return this.membership.checkMembershipByCardNumber(cardNumber);
  }

  membershipExists(searchValue: string): Observable<MembershipCheckResponse> {
    return this.membership.membershipExists(searchValue);
  }

  isMembership(vehicleNumber: string): Observable<MembershipCheckResponse> {
    return this.membership.isMembership(vehicleNumber);
  }

  // --- Daily collect (normal gate) ---

  collectDailyTickets(): Observable<CollectDailyTicketsResponse> {
    return this.core.collectDailyTickets();
  }

  collectEnterTickets(): Observable<CollectDailyTicketsResponse> {
    return this.core.collectEnterTickets();
  }

  collectEnterTicketsAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateId: string | number | null;
    gateType: GateType | null;
    gateNumber: number | null;
  }): Observable<CollectDailyTicketsResponse> {
    return this.supervisor.collectEnterTicketsAsSupervisor(credentials);
  }

  startEntryCollectAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateId: string | number | null;
    gateType: GateType | null;
    gateNumber: number | null;
  }): Observable<SupervisorEntryCollectSession> {
    return this.supervisor.startEntryCollectAsSupervisor(credentials);
  }

  collectEnterTicketsWithSupervisorToken(token: string): Observable<CollectDailyTicketsResponse> {
    return this.supervisor.collectEnterTicketsWithSupervisorToken(token);
  }

  collectDailyTicketsAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateType: GateType | null;
    gateNumber: number | null;
  }): Observable<CollectDailyTicketsResponse> {
    return this.supervisor.collectDailyTicketsAsSupervisor(credentials);
  }

  searchTickets(query: string): Observable<TicketDto[]> {
    return this.core.searchTickets(query);
  }

  searchTicketLookup(request: SearchTicketRequest): Observable<SearchTicketResponse[]> {
    return this.core.searchTicketLookup(request);
  }

  validateExitByVehicleNumber(
    vehicleNumber: string,
  ): Observable<ValidateExitByVehicleNumberResponse> {
    return this.core.validateExitByVehicleNumber(vehicleNumber);
  }

  validateExitByText(body: ValidateExitByTextRequest): Observable<ValidateExitByTextResponse> {
    return this.core.validateExitByText(body);
  }

  getTicketDetails(
    filter: TicketDetailsFilterRequest = {},
  ): Observable<PagedResult<TicketDetailsItemDto>> {
    return this.core.getTicketDetails(filter);
  }
}
