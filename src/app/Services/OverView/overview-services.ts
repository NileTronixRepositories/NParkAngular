import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  DashboardDto,
  GateTicketsSummaryDto,
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

  getDashboard(): Observable<DashboardDto> {
    return this.http.get<any>(`${this.baseUrl}/Dashboard`).pipe(map((res) => this.normalizeDashboard(res)));
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
      enterTicketsCount: this.number(res, 'enterTicketsCount', 'EnterTicketsCount'),
      exitTicketsCount: this.number(res, 'exitTicketsCount', 'ExitTicketsCount'),
      totalRevenue: this.number(res, 'totalRevenue', 'TotalRevenue'),
      collectedRevenue: this.number(res, 'collectedRevenue', 'CollectedRevenue'),
      pendingRevenue: this.number(res, 'pendingRevenue', 'PendingRevenue'),
      currentVehiclesInside: this.number(res, 'currentVehiclesInside', 'CurrentVehiclesInside'),
      occupancyPercentage: this.number(res, 'occupancyPercentage', 'OccupancyPercentage'),
      estimatedFreeSlots: this.number(res, 'estimatedFreeSlots', 'EstimatedFreeSlots'),
      activeTicketsCount: this.number(res, 'activeTicketsCount', 'ActiveTicketsCount'),
      membershipTicketsCount: this.number(res, 'membershipTicketsCount', 'MembershipTicketsCount'),
      walkInTicketsCount: this.number(res, 'walkInTicketsCount', 'WalkInTicketsCount'),
      membershipRelatedRevenue: this.number(
        res,
        'membershipRelatedRevenue',
        'MembershipRelatedRevenue',
      ),
      walkInRevenue: this.number(res, 'walkInRevenue', 'WalkInRevenue'),
      membershipsExpiringNext7Days: this.number(
        res,
        'membershipsExpiringNext7Days',
        'MembershipsExpiringNext7Days',
      ),
      averageDurationMinutes: this.number(
        res,
        'averageDurationMinutes',
        'AverageDurationMinutes',
      ),
      maxDurationMinutes: this.number(res, 'maxDurationMinutes', 'MaxDurationMinutes'),
      exceededTicketsCount: this.number(res, 'exceededTicketsCount', 'ExceededTicketsCount'),
      totalExceedRevenue: this.number(res, 'totalExceedRevenue', 'TotalExceedRevenue'),
      averageExceedPerTicket: this.number(
        res,
        'averageExceedPerTicket',
        'AverageExceedPerTicket',
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
      entryGates: entryGates.map((item) => this.normalizeGateSummary(item)),
      exitGates: exitGates.map((item) => this.normalizeGateSummary(item)),
      chartHours: this.numberArray(res, 'chartHours', 'ChartHours'),
      chartIn: this.numberArray(res, 'chartIn', 'ChartIn'),
      chartOut: this.numberArray(res, 'chartOut', 'ChartOut'),
      recentTickets: recentTickets.map((item) => this.normalizeRecentTicket(item)),
    };
  }

  private normalizeGateSummary(item: any): GateTicketsSummaryDto {
    return {
      gateId: this.pick<string>(item, 'gateId', 'GateId') ?? '',
      gateNumber: this.number(item, 'gateNumber', 'GateNumber'),
      ticketsCount: this.number(item, 'ticketsCount', 'TicketsCount'),
      totalPrice: this.number(item, 'totalPrice', 'TotalPrice'),
      collectedPrice: this.number(item, 'collectedPrice', 'CollectedPrice'),
      supervisorName: this.pick<string | null>(item, 'supervisorName', 'SupervisorName') ?? null,
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
