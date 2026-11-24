import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  GateOperationStatus,
  normalizeGateOperationStatus,
} from '../../Domain/Gate/gate-operation.models';

export interface LprVehicleDetectedEvent {
  gateId: string;
  vehicleNumber: string;
}

export interface MqttCaptureDetectedEvent {
  deviceId: string;
  captureId: boolean;

  operationId?: string | null;
  operationStatus?: GateOperationStatus | null;

  ticketId?: string | null;

  isValidForExit?: boolean;
  ticketExited?: boolean;
  gateOpened?: boolean;
  workflowSucceeded?: boolean;

  errorCode?: string | null;
  errorMessage?: string | null;
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
      const rawStatus = payload?.operationStatus ?? payload?.OperationStatus;
      const event: MqttCaptureDetectedEvent = {
        deviceId: String(payload?.deviceId ?? payload?.DeviceId ?? '').trim(),
        captureId: this.toBoolean(payload?.captureId ?? payload?.CaptureId),
        operationId: payload?.operationId ?? payload?.OperationId ?? null,
        operationStatus: rawStatus != null ? normalizeGateOperationStatus(rawStatus) : null,
        ticketId: payload?.ticketId ?? payload?.TicketId ?? null,
        isValidForExit: this.toOptionalBoolean(
          payload?.isValidForExit ?? payload?.IsValidForExit,
        ),
        ticketExited: this.toOptionalBoolean(payload?.ticketExited ?? payload?.TicketExited),
        gateOpened: this.toOptionalBoolean(payload?.gateOpened ?? payload?.GateOpened),
        workflowSucceeded: this.toOptionalBoolean(
          payload?.workflowSucceeded ?? payload?.WorkflowSucceeded,
        ),
        errorCode: payload?.errorCode ?? payload?.ErrorCode ?? null,
        errorMessage: payload?.errorMessage ?? payload?.ErrorMessage ?? null,
      };

      if (!event.deviceId) return;
      if (!event.captureId && !event.operationId && !event.errorCode) return;
      this.mqttCaptureDetectedSubject.next(event);
    });
  }

  private toBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') return value.trim().toLowerCase() === 'true';
    return false;
  }

  private toOptionalBoolean(value: unknown): boolean | undefined {
    if (value === null || value === undefined) return undefined;
    return this.toBoolean(value);
  }
}
