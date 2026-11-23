import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../Shared/environment/environment';

export interface LprVehicleDetectedEvent {
  gateId: string;
  vehicleNumber: string;
}

export interface MqttCaptureDetectedEvent {
  deviceId: string;
  captureId: boolean;
}

@Injectable({ providedIn: 'root' })
export class LprSignalRService {
  private conn?: signalR.HubConnection;
  private startPromise?: Promise<void>;

  private readonly vehicleDetectedSubject = new Subject<LprVehicleDetectedEvent>();
  readonly vehicleDetected$: Observable<LprVehicleDetectedEvent> =
    this.vehicleDetectedSubject.asObservable();

  private readonly mqttCaptureDetectedSubject = new Subject<MqttCaptureDetectedEvent>();
  readonly mqttCaptureDetected$: Observable<MqttCaptureDetectedEvent> =
    this.mqttCaptureDetectedSubject.asObservable();

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
    this.conn.on('lprVehicleDetected', (payload: LprVehicleDetectedEvent | any) => {
      const event: LprVehicleDetectedEvent = {
        gateId: payload?.gateId ?? payload?.GateId ?? '',
        vehicleNumber: payload?.vehicleNumber ?? payload?.VehicleNumber ?? '',
      };

      if (!event.gateId || !event.vehicleNumber) return;
      this.vehicleDetectedSubject.next(event);
    });

    this.conn.off('mqttCaptureDetected');
    this.conn.on('mqttCaptureDetected', (payload: MqttCaptureDetectedEvent | any) => {
      const event: MqttCaptureDetectedEvent = {
        deviceId: String(payload?.deviceId ?? payload?.DeviceId ?? '').trim(),
        captureId: this.toBoolean(payload?.captureId ?? payload?.CaptureId),
      };

      if (!event.deviceId || !event.captureId) return;
      this.mqttCaptureDetectedSubject.next(event);
    });
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
    return false;
  }
}
