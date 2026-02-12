import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../Shared/environment/environment';

export type ScanFileMessage = {
  stationId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer | number[];
  scannedAtUtc: string;
};

@Injectable({ providedIn: 'root' })
export class ScanHubService {
  private conn?: signalR.HubConnection;

  private scanSubject = new Subject<ScanFileMessage>();
  readonly scan$: Observable<ScanFileMessage> = this.scanSubject.asObservable();

  async start(): Promise<void> {
    if (this.conn?.state === signalR.HubConnectionState.Connected) return;

    this.conn = new signalR.HubConnectionBuilder()
      .withUrl(environment.scanHubUrl, {
        transport: signalR.HttpTransportType.WebSockets,
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers();

    try {
      await this.conn.start();
      console.log('ScanHub: Connected');
    } catch (err) {
      console.error('ScanHub: Connection failed', err);
      throw err;
    }
  }

  private registerHandlers(): void {
    if (!this.conn) return;

    this.conn.off('ScanFileReceived');

    this.conn.on('ScanFileReceived', (msg: ScanFileMessage) => {
      console.log('%c ScanHub: ScanFileReceived', 'color: #00ff00');
      this.scanSubject.next(msg);
    });
  }

  async joinStation(stationId: string): Promise<void> {
    if (!this.conn || this.conn.state !== signalR.HubConnectionState.Connected) {
      console.warn('ScanHub: Cannot join station, not connected');
      return;
    }

    await this.conn.invoke('JoinStation', stationId);
    console.log(`ScanHub: Joined station: ${stationId}`);
  }

  async stop(): Promise<void> {
    if (this.conn) {
      await this.conn.stop();
      console.log('ScanHub: Stopped');
    }
  }
}
