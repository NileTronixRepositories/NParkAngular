import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../Shared/environment/environment';

export interface LprVehicleDetectedEvent {
  gateId: string;
  vehicleNumber: string;
}

@Injectable({ providedIn: 'root' })
export class LprSignalRService {
  private conn?: signalR.HubConnection;
  private startPromise?: Promise<void>;

  private readonly vehicleDetectedSubject = new Subject<LprVehicleDetectedEvent>();
  readonly vehicleDetected$: Observable<LprVehicleDetectedEvent> =
    this.vehicleDetectedSubject.asObservable();

  async start(): Promise<void> {
    if (this.conn?.state === signalR.HubConnectionState.Connected) return;
    if (this.startPromise) return this.startPromise;

    this.conn = new signalR.HubConnectionBuilder()
      .withUrl(environment.lprHubUrl, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers();

    this.startPromise = this.conn
      .start()
      .then(() => {
        console.log('LprSignalR: Connected');
      })
      .catch((err) => {
        console.error('LprSignalR: Connection failed', err);
        throw err;
      })
      .finally(() => {
        this.startPromise = undefined;
      });

    return this.startPromise;
  }

  async stop(): Promise<void> {
    if (!this.conn) return;

    await this.conn.stop();
    this.conn = undefined;
    console.log('LprSignalR: Stopped');
  }

  private registerHandlers(): void {
    if (!this.conn) return;

    this.conn.off('lprVehicleDetected');
    this.conn.on('lprVehicleDetected', (payload: LprVehicleDetectedEvent) => {
      console.log('[RAW LPR SignalR Payload]', payload);
      console.log('[RAW LPR SignalR VehicleNumber]', payload?.vehicleNumber);
      if (!payload?.gateId || !payload?.vehicleNumber) return;
      this.vehicleDetectedSubject.next(payload);
    });
  }
}
