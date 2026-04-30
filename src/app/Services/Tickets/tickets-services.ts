import { Injectable, inject } from '@angular/core';
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
} from '../../Domain/tickets/tickets.model';

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

  getAll(): Observable<TicketDto[]> {
    return this.core.getAll();
  }

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
    const imageFiles = [req.scannedFile ?? null, ...(req.vehicleImages ?? [])].filter(
      (file): file is File => !!file,
    );

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

    imageFiles.forEach((file) => {
      formData.append('TicketsImages', file, file.name);
    });

    return this.core.addTicket(formData).pipe(
      map((res: any) => {
        if (!res) return null;
        if (res === true) {
          return {
            success: true,
            qrCode: '',
            ticketId: '',
            createdAt: new Date().toISOString(),
            price: 0,
          } as IssuedTicketResponse;
        }

        return {
          success: !!(
            res.success ??
            res.Success ??
            res.isSuccess ??
            res.IsSuccess ??
            res.succeeded ??
            res.Succeeded ??
            res.ticketId ??
            res.TicketId
          ),
          ticketId: res.ticketId ?? res.TicketId,
          createdAt: res.createdAt ?? res.CreatedAt,
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
        } as IssuedTicketResponse;
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

  calculateSalaryByTicketNumber(
    ticketNumber: string,
    sanctionIds?: string[],
  ): Observable<CalculateSalaryResponse | null> {
    return this.salary.calculateSalaryByTicketNumber(ticketNumber, sanctionIds);
  }

  // --- Collect / Exit ---

  collect(id: number | string): Observable<boolean> {
    return this.core.collect(id);
  }

  collectCashier(ticketId: string): Observable<boolean> {
    return this.core.collectCashier(ticketId);
  }

  addExitTicket(ticketId: string): Observable<boolean> {
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

  // --- Manual plate capture ---

  captureManualPlate(plate: string): Observable<boolean> {
    return this.core.captureManualPlate(plate);
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

  validateExitByVehicleNumber(vehicleNumber: string): Observable<ValidateExitByVehicleNumberResponse> {
    return this.core.validateExitByVehicleNumber(vehicleNumber);
  }

  validateExitByText(body: ValidateExitByTextRequest): Observable<ValidateExitByTextResponse> {
    return this.core.validateExitByText(body);
  }
}
