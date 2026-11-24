import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../Shared/environment/environment';
import { Subject, Observable } from 'rxjs';
import { AuthService } from '../Auth/auth-service';
import {
  TicketAddedNotification,
  TicketExitedNotification,
  TicketCollectedNotification,
} from '../../Domain/OverView/dashboard-notifications.model';
import {
  GateOperationResponse,
  normalizeGateOperationResponse,
} from '../../Domain/Gate/gate-operation.models';

@Injectable({ providedIn: 'root' })
export class DashboardHubService {
  private readonly auth = inject(AuthService);
  private hub?: signalR.HubConnection;
  private connectedToken: string | null = null;

  private readonly ticketAddedSubject = new Subject<TicketAddedNotification>();
  private readonly ticketExitedSubject = new Subject<TicketExitedNotification>();
  private readonly ticketCollectedSubject = new Subject<TicketCollectedNotification>();
  private readonly gateOperationStatusChangedSubject = new Subject<GateOperationResponse>();
  private readonly reconnectedSubject = new Subject<void>();

  readonly ticketAdded$: Observable<TicketAddedNotification> = this.ticketAddedSubject.asObservable();
  readonly ticketExited$: Observable<TicketExitedNotification> =
    this.ticketExitedSubject.asObservable();
  readonly ticketCollected$: Observable<TicketCollectedNotification> =
    this.ticketCollectedSubject.asObservable();
  readonly gateOperationStatusChanged$: Observable<GateOperationResponse> =
    this.gateOperationStatusChangedSubject.asObservable();
  readonly reconnected$: Observable<void> = this.reconnectedSubject.asObservable();

  private buildConnection(): void {
    if (this.hub) {
      return;
    }

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(environment.hubUrl, {
        withCredentials: false,
        accessTokenFactory: () => this.auth.token ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.hub.on('TicketAdded', (data: TicketAddedNotification) => {
      this.ticketAddedSubject.next(data);
    });

    this.hub.on('TicketExited', (data: TicketExitedNotification) => {
      this.ticketExitedSubject.next(data);
    });

    this.hub.on('GateOperationStatusChanged', (data: any) => {
      if (!data) return;
      this.gateOperationStatusChangedSubject.next(normalizeGateOperationResponse(data));
    });

    this.hub.onreconnected(() => {
      this.reconnectedSubject.next();
    });
  }

  /** Starts the connection (rebuilds if authenticated gate JWT changed) */
  async start(): Promise<void> {
    const currentToken = this.auth.token ?? '';
    if (this.hub && this.connectedToken !== null && this.connectedToken !== currentToken) {
      await this.reconnect();
      return;
    }

    this.buildConnection();

    if (!this.hub) {
      return;
    }

    if (this.hub.state === signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.hub.start();
      this.connectedToken = currentToken;
    } catch (error) {
      console.error('SignalR: failed to connect dashboard hub', error);
      throw error;
    }
  }

  async reconnect(): Promise<void> {
    await this.stop();
    this.hub = undefined;
    this.connectedToken = null;
    await this.start();
    this.reconnectedSubject.next();
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
      } catch (error) {
        console.error('SignalR: failed to stop dashboard hub', error);
      }
    }
  }
}
