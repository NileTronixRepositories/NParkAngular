import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../Shared/environment/environment';
import { Subject, Observable } from 'rxjs';
import {
  TicketAddedNotification,
  TicketExitedNotification,
  TicketCollectedNotification,
} from '../../Domain/OverView/dashboard-notifications.model';

@Injectable({ providedIn: 'root' })
export class DashboardHubService {
  private hub?: signalR.HubConnection;

  private readonly ticketAddedSubject = new Subject<TicketAddedNotification>();
  private readonly ticketExitedSubject = new Subject<TicketExitedNotification>();
  private readonly ticketCollectedSubject = new Subject<TicketCollectedNotification>();

  readonly ticketAdded$: Observable<TicketAddedNotification> = this.ticketAddedSubject;
  readonly ticketExited$: Observable<TicketExitedNotification> = this.ticketExitedSubject;
  readonly ticketCollected$: Observable<TicketCollectedNotification> = this.ticketCollectedSubject;

  private buildConnection(): void {
    if (this.hub) {
      return;
    }

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        withCredentials: true,
        accessTokenFactory: () => localStorage.getItem('token') || '',
      })
      .withAutomaticReconnect()
      .build();

    // SignalR
    this.hub.on('TicketAdded', (data: TicketAddedNotification) => {
      console.log('SignalR: TICKET ADDED', data);
      this.ticketAddedSubject.next(data);
    });

    this.hub.on('TicketExited', (data: TicketExitedNotification) => {
      console.log('SignalR: TICKET EXITED', data);
      this.ticketExitedSubject.next(data);
    });

    this.hub.on('TicketCollected', (data: TicketCollectedNotification) => {
      console.log('SignalR: TICKET COLLECTED', data);
      this.ticketCollectedSubject.next(data);
    });
  }

  /** يبدأ الاتصال (idempotent) */
  async start(): Promise<void> {
    this.buildConnection();

    if (!this.hub) {
      return;
    }

    if (this.hub.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.hub.start();
      console.log('SignalR: Dashboard hub connected');
    } catch (error) {
      console.error('SignalR: failed to connect dashboard hub', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.hub) {
      return;
    }

    if (
      this.hub.state === signalR.HubConnectionState.Connected ||
      this.hub.state === signalR.HubConnectionState.Connecting
    ) {
      try {
        await this.hub.stop();
        console.log('SignalR: Dashboard hub stopped');
      } catch (error) {
        console.error('SignalR: failed to stop dashboard hub', error);
      }
    }
  }
}
