import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { inject } from '@angular/core/primitives/di';
import { environment } from '../../Shared/environment/environment';
import { Observable } from 'rxjs';
import {
  DashboardDto,
  TicketInsideParkDto,
  TicketTodayDto,
  TicketAdminDto,
} from '../../Domain/OverView/overview.model';

@Injectable({
  providedIn: 'root',
})
export class OverviewServices {
  private baseUrl = `${environment.baseUrl}`;

  constructor(private readonly http: HttpClient) {}

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
}
