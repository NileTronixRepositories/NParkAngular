import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DashboardDto,
  EntryGateSummaryDto,
  ExitGateSummaryDto,
  GateCollectorSummaryDto,
  GateSupervisorSummaryDto,
  OverviewTicketDto,
  TicketInsideParkDto,
  TicketAdminDto,
  ActiveMembershipDto,
  InactiveMembershipDto,
  ExpiringMembershipDto,
} from '../../Domain/OverView/overview.model';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class OverviewServices {
  private readonly baseUrl = `${environment.baseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // ===== Dashboard =====

  getDashboard(date?: string): Observable<DashboardDto> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }

    return this.http
      .get<any>(`${this.baseUrl}/Dashboard`, { params })
      .pipe(map((res) => this.normalizeDashboard(res)));
  }

  getTicketsInsidePark(): Observable<TicketInsideParkDto[]> {
    return this.http.get<TicketInsideParkDto[]>(`${this.baseUrl}/Ticket/TicketsInsidePark`);
  }

  getTicketsForEntryAdmin(): Observable<TicketAdminDto[]> {
    return this.http.get<TicketAdminDto[]>(`${this.baseUrl}/Ticket/GetTicketsForEntryAdmin`);
  }

  getTicketsForExitAdmin(): Observable<TicketAdminDto[]> {
    return this.http.get<TicketAdminDto[]>(`${this.baseUrl}/Ticket/GetTicketsForExitAdmin`);
  }

  // ===== Memberships =====

  getActiveMemberships(): Observable<ActiveMembershipDto[]> {
    return this.http.get<ActiveMembershipDto[]>(
      `${this.baseUrl}/ParkingMemberships/GetActiveMembership`
    );
  }

  getInactiveMemberships(): Observable<InactiveMembershipDto[]> {
    return this.http.get<InactiveMembershipDto[]>(
      `${this.baseUrl}/ParkingMemberships/GetInactiveMembership`
    );
  }

  getMembershipsExpireNextSevenDays(): Observable<ExpiringMembershipDto[]> {
    return this.http.get<ExpiringMembershipDto[]>(
      `${this.baseUrl}/ParkingMemberships/GetMembershipExpireNextSevenDays`
    );
  }

  private normalizeDashboard(res: any): DashboardDto {
    const entryGates = this.pick<any[]>(res, 'entryGates', 'EntryGates') ?? [];
    const exitGates = this.pick<any[]>(res, 'exitGates', 'ExitGates') ?? [];
    const recentTickets = this.pick<any[]>(res, 'recentTickets', 'RecentTickets') ?? [];

    return {
      date: this.pick<string>(res, 'date', 'Date') ?? '',
      subscriptionCount: this.number(res, 'subscriptionCount', 'SubscriptionCount'),
      activeSubscriptionCount: this.number(
        res,
        'activeSubscriptionCount',
        'ActiveSubscriptionCount',
      ),
      inactiveSubscriptionCount: this.number(
        res,
        'inactiveSubscriptionCount',
        'InactiveSubscriptionCount',
      ),
      membershipsExpiringNext7Days: this.number(
        res,
        'membershipsExpiringNext7Days',
        'MembershipsExpiringNext7Days',
      ),
      ticketEnterToday: this.number(
        res,
        'ticketEnterToday',
        'TicketEnterToday',
        'enterTicketsCount',
        'EnterTicketsCount',
      ),
      ticketEnterNotTodayButNotExitYet: this.number(
        res,
        'ticketEnterNotTodayButNotExitYet',
        'TicketEnterNotTodayButNotExitYet',
      ),
      exitTicketsCount: this.number(res, 'exitTicketsCount', 'ExitTicketsCount'),
      currentVehiclesInside: this.number(res, 'currentVehiclesInside', 'CurrentVehiclesInside'),
      activeTicketsCount: this.number(res, 'activeTicketsCount', 'ActiveTicketsCount'),
      occupancyPercentage: this.number(res, 'occupancyPercentage', 'OccupancyPercentage'),
      estimatedFreeSlots: this.number(res, 'estimatedFreeSlots', 'EstimatedFreeSlots'),
      totalRevenue: this.number(res, 'totalRevenue', 'TotalRevenue'),
      collectedRevenue: this.number(res, 'collectedRevenue', 'CollectedRevenue'),
      pendingRevenue: this.number(res, 'pendingRevenue', 'PendingRevenue'),
      ticketBaseRevenue: this.number(res, 'ticketBaseRevenue', 'TicketBaseRevenue'),
      collectedTicketBaseRevenue: this.number(
        res,
        'collectedTicketBaseRevenue',
        'CollectedTicketBaseRevenue',
      ),
      pendingTicketBaseRevenue: this.number(
        res,
        'pendingTicketBaseRevenue',
        'PendingTicketBaseRevenue',
      ),
      membershipTicketsCount: this.number(res, 'membershipTicketsCount', 'MembershipTicketsCount'),
      walkInTicketsCount: this.number(res, 'walkInTicketsCount', 'WalkInTicketsCount'),
      membershipRelatedRevenue: this.number(
        res,
        'membershipRelatedRevenue',
        'MembershipRelatedRevenue',
      ),
      walkInRevenue: this.number(res, 'walkInRevenue', 'WalkInRevenue'),
      averageDurationMinutes: this.number(
        res,
        'averageDurationMinutes',
        'AverageDurationMinutes',
      ),
      maxDurationMinutes: this.number(res, 'maxDurationMinutes', 'MaxDurationMinutes'),
      exceededTicketsCount: this.number(res, 'exceededTicketsCount', 'ExceededTicketsCount'),
      exceedTransactionsCount: this.number(
        res,
        'exceedTransactionsCount',
        'ExceedTransactionsCount',
      ),
      collectedExceedTransactionsCount: this.number(
        res,
        'collectedExceedTransactionsCount',
        'CollectedExceedTransactionsCount',
      ),
      pendingExceedTransactionsCount: this.number(
        res,
        'pendingExceedTransactionsCount',
        'PendingExceedTransactionsCount',
      ),
      totalExceedRevenue: this.number(res, 'totalExceedRevenue', 'TotalExceedRevenue'),
      collectedExceedRevenue: this.number(
        res,
        'collectedExceedRevenue',
        'CollectedExceedRevenue',
      ),
      pendingExceedRevenue: this.number(res, 'pendingExceedRevenue', 'PendingExceedRevenue'),
      averageExceedPerTicket: this.number(
        res,
        'averageExceedPerTicket',
        'AverageExceedPerTicket',
      ),
      averageExceedPerTransaction: this.number(
        res,
        'averageExceedPerTransaction',
        'AverageExceedPerTransaction',
      ),
      busiestGateNumber: this.number(res, 'busiestGateNumber', 'BusiestGateNumber'),
      busiestGateTicketsCount: this.number(
        res,
        'busiestGateTicketsCount',
        'BusiestGateTicketsCount',
      ),
      topCollectorName: this.pick<string | null>(res, 'topCollectorName', 'TopCollectorName') ?? null,
      topCollectorAmount: this.number(res, 'topCollectorAmount', 'TopCollectorAmount'),
      topCollectorTicketsCount: this.number(
        res,
        'topCollectorTicketsCount',
        'TopCollectorTicketsCount',
      ),
      topExceedCollectorName:
        this.pick<string | null>(res, 'topExceedCollectorName', 'TopExceedCollectorName') ?? null,
      topExceedCollectorAmount: this.number(
        res,
        'topExceedCollectorAmount',
        'TopExceedCollectorAmount',
      ),
      topExceedCollectorTransactionsCount: this.number(
        res,
        'topExceedCollectorTransactionsCount',
        'TopExceedCollectorTransactionsCount',
      ),
      entryGates: entryGates.map((item) => this.normalizeEntryGateSummary(item)),
      exitGates: exitGates.map((item) => this.normalizeExitGateSummary(item)),
      chartHours: this.numberArray(res, 'chartHours', 'ChartHours'),
      chartIn: this.numberArray(res, 'chartIn', 'ChartIn'),
      chartOut: this.numberArray(res, 'chartOut', 'ChartOut'),
      recentTickets: recentTickets.map((item) => this.normalizeRecentTicket(item)),
    };
  }

  private normalizeEntryGateSummary(item: any): EntryGateSummaryDto {
    const collectors = this.pick<any[]>(item, 'collectors', 'Collectors') ?? [];

    return {
      gateId: this.pick<string>(item, 'gateId', 'GateId') ?? '',
      gateNumber: this.number(item, 'gateNumber', 'GateNumber'),
      ticketsCount: this.number(item, 'ticketsCount', 'TicketsCount'),
      totalPrice: this.number(item, 'totalPrice', 'TotalPrice'),
      collectedPrice: this.number(item, 'collectedPrice', 'CollectedPrice'),
      pendingPrice: this.number(item, 'pendingPrice', 'PendingPrice'),
      collectors: Array.isArray(collectors)
        ? collectors.map((collector) => this.normalizeGateCollector(collector))
        : [],
    };
  }

  private normalizeGateCollector(item: any): GateCollectorSummaryDto {
    return {
      collectorId: this.pick<string>(item, 'collectorId', 'CollectorId') ?? '',
      collectorName: this.pick<string>(item, 'collectorName', 'CollectorName') ?? '',
      ticketsCount: this.number(item, 'ticketsCount', 'TicketsCount'),
      collectedAmount: this.number(item, 'collectedAmount', 'CollectedAmount'),
    };
  }

  private normalizeExitGateSummary(item: any): ExitGateSummaryDto {
    const supervisors = this.pick<any[]>(item, 'supervisors', 'Supervisors') ?? [];

    return {
      gateId: this.pick<string>(item, 'gateId', 'GateId') ?? '',
      gateNumber: this.number(item, 'gateNumber', 'GateNumber'),
      exitedTicketsCount: this.number(item, 'exitedTicketsCount', 'ExitedTicketsCount'),
      exceedTransactionsCount: this.number(
        item,
        'exceedTransactionsCount',
        'ExceedTransactionsCount',
      ),
      collectedExceedTransactionsCount: this.number(
        item,
        'collectedExceedTransactionsCount',
        'CollectedExceedTransactionsCount',
      ),
      pendingExceedTransactionsCount: this.number(
        item,
        'pendingExceedTransactionsCount',
        'PendingExceedTransactionsCount',
      ),
      totalExceedAmount: this.number(item, 'totalExceedAmount', 'TotalExceedAmount'),
      collectedExceedAmount: this.number(item, 'collectedExceedAmount', 'CollectedExceedAmount'),
      pendingExceedAmount: this.number(item, 'pendingExceedAmount', 'PendingExceedAmount'),
      supervisors: Array.isArray(supervisors)
        ? supervisors.map((supervisor) => this.normalizeGateSupervisor(supervisor))
        : [],
    };
  }

  private normalizeGateSupervisor(item: any): GateSupervisorSummaryDto {
    return {
      supervisorId: this.pick<string>(item, 'supervisorId', 'SupervisorId') ?? '',
      supervisorName: this.pick<string>(item, 'supervisorName', 'SupervisorName') ?? '',
      transactionsCount: this.number(item, 'transactionsCount', 'TransactionsCount'),
      collectedAmount: this.number(item, 'collectedAmount', 'CollectedAmount'),
    };
  }

  private normalizeRecentTicket(item: any): OverviewTicketDto {
    return {
      id: this.number(item, 'id', 'Id'),
      plate: this.pick<string>(item, 'plate', 'Plate', 'vehicleNumber', 'VehicleNumber') ?? '',
      action: this.pick<any>(item, 'action', 'Action') === 'OUT' ? 'OUT' : 'IN',
      gate: this.pick<string>(item, 'gate', 'Gate') ?? '',
      time: this.pick<string>(item, 'time', 'Time', 'createdAt', 'CreatedAt') ?? '',
    };
  }

  private number(source: any, ...keys: string[]): number {
    return Number(this.pick(source, ...keys) ?? 0);
  }

  private numberArray(source: any, ...keys: string[]): number[] {
    const value = this.pick<any[]>(source, ...keys);
    return Array.isArray(value) ? value.map((item) => Number(item ?? 0)) : [];
  }

  private pick<T = any>(source: any, ...keys: string[]): T | undefined {
    for (const key of keys) {
      if (source?.[key] !== undefined) return source[key] as T;
    }
    return undefined;
  }
}
