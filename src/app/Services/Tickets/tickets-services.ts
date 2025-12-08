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
} from '../../Domain/tickets/tickets.model';

import { TicketCoreService, TicketsForGateResult } from './ticket-core.service';
import { TicketSalaryService } from './ticket-salary.service';
import { MembershipCardService } from './membership-card.service';
import { TicketSupervisorService } from './ticket-supervisor.service';
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

  // --- Lists ---

  getAll(): Observable<TicketDto[]> {
    return this.core.getAll();
  }

  getTicketsForEntry(
    startDate: string,
    ticketNumber: string = ''
  ): Observable<TicketsForGateResult> {
    return this.core.getTicketsForEntry(startDate, ticketNumber);
  }

  getTicketsForExit(
    startDate: string,
    ticketNumber: string = ''
  ): Observable<TicketsForGateResult> {
    return this.core.getTicketsForExit(startDate, ticketNumber);
  }

  // --- Add Ticket ---

  addTicket(req: AddTicketRequest): Observable<IssuedTicketResponse | null> {
    const body: any = {
      isSubscriber: req.isSubscriber,
      vehicleNumber: req.vehicleNumber?.trim() || undefined,
      cardNumber: req.cardNumber?.trim() || undefined,
    };

    Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

    return this.core.addTicket(body).pipe(
      map((res: any) => res as IssuedTicketResponse),
      catchError((err) => {
        this.logError('addTicket', err);
        return throwError(() => err);
      })
    );
  }

  calculateTicketSalary(qrCode: string): Observable<CalculateSalaryResponse | null> {
    return this.salary.calculateTicketSalary(qrCode);
  }

  calculateSubscriberSalary(cardNumber: string): Observable<CalculateSalaryResponse | null> {
    return this.salary.calculateSubscriberSalary(cardNumber);
  }

  calculateSalaryByTicketNumber(ticketNumber: string): Observable<CalculateSalaryResponse | null> {
    return this.salary.calculateSalaryByTicketNumber(ticketNumber);
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

  // --- Daily collect (normal gate) ---

  collectDailyTickets(): Observable<CollectDailyTicketsResponse> {
    return this.core.collectDailyTickets();
  }

  // --- Manual plate capture ---

  captureManualPlate(plate: string): Observable<boolean> {
    return this.core.captureManualPlate(plate);
  }

  collectDailyTicketsAsSupervisor(credentials: {
    userName: string;
    password: string;
    gateType: GateType | null;
    gateNumber: number | null;
  }): Observable<CollectDailyTicketsResponse> {
    return this.supervisor.collectDailyTicketsAsSupervisor(credentials);
  }

  // --- Search (FAKE endpoint) ---

  searchTickets(query: string): Observable<TicketDto[]> {
    return this.core.searchTickets(query);
  }
}
