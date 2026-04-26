import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import { GateDto } from '../../Domain/Auth/auth.models';

export interface GateConnectionInfo {
  gateId: string;
  pcIp?: string;
  lprIp?: string;
  controlIp?: string;
  qrPrinterName?: string | null;
  receiptPrinterName?: string | null;
  onvifCameraSetting?: {
    id?: string;
    url?: string;
  } | null;
}

export interface OpenGateResponse {
  controllerId: string;
  topic: string;
  payload: string;
  publishedAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class GateServices {
  private http = inject(HttpClient);
  private base = environment.baseUrl;

  getAll(): Observable<GateDto[]> {
    return this.http.get<GateDto[]>(`${this.base}/Gate/GetAll`);
  }

  getGateConnectionInfo(gateId: string | number): Observable<GateConnectionInfo> {
    return this.http
      .get<any>(`${this.base}/Gate/${encodeURIComponent(String(gateId))}/connection-info`)
      .pipe(
        map((res): GateConnectionInfo => {
          const onvif =
            res?.onvifCameraSetting ?? res?.OnvifCameraSetting ?? res?.ONVIFCameraSetting ?? null;

          return {
            gateId: res?.gateId ?? res?.GateId ?? String(gateId),
            pcIp: res?.pcIp ?? res?.PcIp ?? res?.PCIP,
            lprIp: res?.lprIp ?? res?.LprIp ?? res?.LPRIP,
            controlIp:
              res?.controlIp ??
              res?.ControlIp ??
              res?.controlID ??
              res?.ControlID ??
              res?.controlId ??
              res?.ControlId ??
              res?.controllerId ??
              res?.ControllerId,
            qrPrinterName: res?.qrPrinterName ?? res?.QrPrinterName ?? null,
            receiptPrinterName: res?.receiptPrinterName ?? res?.ReceiptPrinterName ?? null,
            onvifCameraSetting: onvif
              ? {
                  id: onvif.id ?? onvif.Id,
                  url: onvif.url ?? onvif.Url,
                }
              : null,
          };
        }),
      );
  }

  getSnapshot(cameraUrl: string): Observable<Blob> {
    return this.http.get(`${this.base}/Cameras/snapshot`, {
      params: { Url: cameraUrl },
      responseType: 'blob',
    });
  }

  openGate(controllerId: string): Observable<OpenGateResponse> {
    return this.http.post<OpenGateResponse>(`${this.base}/Gate/open`, { controllerId });
  }
}
