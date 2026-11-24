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
  DashboardApiResponse,
} from '../../Domain/OverView/overview.model';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class OverviewServices {
  private readonly baseUrl = `${environment.baseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // ===== Dashboard =====

  getDashboard(from?: string, to?: string): Observable<DashboardDto> {
    let params = new HttpParams();
    if (from) {
      params = params.set('from', from);
    }
    if (to) {
      params = params.set('to', to);
    }

    return this.http
      .get<any>(`${this.baseUrl}/dashboard`, { params })
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
      `${this.baseUrl}/ParkingMemberships/GetActiveMembership`,
    );
  }

  getInactiveMemberships(): Observable<InactiveMembershipDto[]> {
    return this.http.get<InactiveMembershipDto[]>(
      `${this.baseUrl}/ParkingMemberships/GetInactiveMembership`,
    );
  }

  getMembershipsExpireNextSevenDays(): Observable<ExpiringMembershipDto[]> {
    return this.http.get<ExpiringMembershipDto[]>(
      `${this.baseUrl}/ParkingMemberships/GetMembershipExpireNextSevenDays`,
    );
  }

  private normalizeDashboard(res: DashboardApiResponse & Record<string, any>): DashboardDto {
    const entryGates = this.dashboardArray(res, 'entryGates');
    const exitGates = this.dashboardArray(res, 'exitGates');
    const recentTickets = this.dashboardArray(res, 'recentTickets');

    return {
      date: this.dashboardString(res, 'date'),
      fromDate: this.dashboardString(res, 'fromDate'),
      toDate: this.dashboardString(res, 'toDate'),
      subscriptionCount: this.dashboardNumber(res, 'subscriptionCount'),
      activeSubscriptionCount: this.dashboardNumber(res, 'activeSubscriptionCount'),
      inactiveSubscriptionCount: this.dashboardNumber(res, 'inactiveSubscriptionCount'),
      membershipsExpiringNext7Days: this.dashboardNumber(res, 'membershipsExpiringNext7Days'),
      ticketEnterToday: this.dashboardNumber(res, 'ticketEnterToday', 'enterTicketsCount'),
      ticketEnterNotTodayButNotExitYet: this.dashboardNumber(
        res,
        'ticketEnterNotTodayButNotExitYet',
      ),
      exitTicketsCount: this.dashboardNumber(res, 'exitTicketsCount'),
      ticketsIssuedInPeriod: this.dashboardNumber(res, 'ticketsIssuedInPeriod'),
      pendingEntryCount: this.dashboardNumber(res, 'pendingEntryCount'),
      unresolvedExitCount: this.dashboardNumber(res, 'unresolvedExitCount'),
      acknowledgedExitAwaitingArchiveCount: this.dashboardNumber(
        res,
        'acknowledgedExitAwaitingArchiveCount',
      ),
      currentVehiclesInside: this.dashboardNumber(res, 'currentVehiclesInside'),
      activeTicketsCount: this.dashboardNumber(res, 'activeTicketsCount'),
      occupancyPercentage: this.dashboardNumber(res, 'occupancyPercentage'),
      estimatedFreeSlots: this.dashboardNumber(res, 'estimatedFreeSlots'),
      totalRevenue: this.dashboardNumber(res, 'totalRevenue'),
      collectedRevenue: this.dashboardNumber(res, 'collectedRevenue'),
      pendingRevenue: this.dashboardNumber(res, 'pendingRevenue'),
      ticketBaseRevenue: this.dashboardNumber(res, 'ticketBaseRevenue'),
      collectedTicketBaseRevenue: this.dashboardNumber(res, 'collectedTicketBaseRevenue'),
      pendingTicketBaseRevenue: this.dashboardNumber(res, 'pendingTicketBaseRevenue'),
      membershipTicketsCount: this.dashboardNumber(res, 'membershipTicketsCount'),
      walkInTicketsCount: this.dashboardNumber(res, 'walkInTicketsCount'),
      membershipRelatedRevenue: this.dashboardNumber(res, 'membershipRelatedRevenue'),
      walkInRevenue: this.dashboardNumber(res, 'walkInRevenue'),
      averageDurationMinutes: this.dashboardNumber(res, 'averageDurationMinutes'),
      maxDurationMinutes: this.dashboardNumber(res, 'maxDurationMinutes'),
      exceededTicketsCount: this.dashboardNumber(res, 'exceededTicketsCount'),
      exceedTransactionsCount: this.dashboardNumber(res, 'exceedTransactionsCount'),
      collectedExceedTransactionsCount: this.dashboardNumber(
        res,
        'collectedExceedTransactionsCount',
      ),
      pendingExceedTransactionsCount: this.dashboardNumber(res, 'pendingExceedTransactionsCount'),
      totalExceedRevenue: this.dashboardNumber(res, 'totalExceedRevenue'),
      collectedExceedRevenue: this.dashboardNumber(res, 'collectedExceedRevenue'),
      pendingExceedRevenue: this.dashboardNumber(res, 'pendingExceedRevenue'),
      averageExceedPerTicket: this.dashboardNumber(res, 'averageExceedPerTicket'),
      averageExceedPerTransaction: this.dashboardNumber(res, 'averageExceedPerTransaction'),
      busiestGateNumber: this.dashboardNumber(res, 'busiestGateNumber'),
      busiestGateTicketsCount: this.dashboardNumber(res, 'busiestGateTicketsCount'),
      topCollectorName: this.dashboardValue<string | null>(res, 'topCollectorName') ?? null,
      topCollectorAmount: this.dashboardNumber(res, 'topCollectorAmount'),
      topCollectorTicketsCount: this.dashboardNumber(res, 'topCollectorTicketsCount'),
      topExceedCollectorName:
        this.dashboardValue<string | null>(res, 'topExceedCollectorName') ?? null,
      topExceedCollectorAmount: this.dashboardNumber(res, 'topExceedCollectorAmount'),
      topExceedCollectorTransactionsCount: this.dashboardNumber(
        res,
        'topExceedCollectorTransactionsCount',
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

  private dashboardNumber(
    source: DashboardApiResponse & Record<string, any>,
    key: keyof DashboardApiResponse | string,
    ...aliases: string[]
  ): number {
    return Number(this.dashboardValue(source, key, ...aliases) ?? 0);
  }

  private dashboardString(
    source: DashboardApiResponse & Record<string, any>,
    key: keyof DashboardApiResponse | string,
  ): string {
    return String(this.dashboardValue(source, key) ?? '');
  }

  private dashboardArray(
    source: DashboardApiResponse & Record<string, any>,
    key: keyof DashboardApiResponse | string,
  ): any[] {
    const value = this.dashboardValue<any[]>(source, key);
    return Array.isArray(value) ? value : [];
  }

  private dashboardValue<T = any>(
    source: DashboardApiResponse & Record<string, any>,
    key: keyof DashboardApiResponse | string,
    ...aliases: string[]
  ): T | undefined {
    return this.pick<T>(source, String(key), this.pascalCase(String(key)), ...aliases);
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

  private pascalCase(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
