import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DashboardDto,
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
    return this.http.get<DashboardDto>(`${this.baseUrl}/Dashboard`);
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
}
