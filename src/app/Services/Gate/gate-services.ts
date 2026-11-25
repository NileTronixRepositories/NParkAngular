import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import { GateDto } from '../../Domain/Auth/auth.models';
import {
  GateOperationResponse,
  OpenGateRequest,
  generateGateRequestId,
  normalizeGateOperationResponse,
} from '../../Domain/Gate/gate-operation.models';

export type { GateOperationResponse, OpenGateRequest };

export interface GateConnectionInfo {
  gateId: string;
  pcIp?: string;
  lprIp?: string;
  controlIp?: string;
  hasScanner?: boolean | null;
  hasQrPrinterName: boolean;
  qrPrinterName?: string | null;
  hasReceiptPrinterName: boolean;
  receiptPrinterName?: string | null;
  onvifCameraSetting?: {
    id?: string;
    url?: string;
  } | null;
}

export type OpenGateResponse = GateOperationResponse;

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
            hasScanner: res?.hasScanner ?? res?.HasScanner ?? null,
            hasQrPrinterName: !!(
              res?.hasQrPrinterName ??
              res?.HasQrPrinterName ??
              res?.qrPrinterName ??
              res?.QrPrinterName
            ),
            qrPrinterName: res?.qrPrinterName ?? res?.QrPrinterName ?? null,
            hasReceiptPrinterName: !!(
              res?.hasReceiptPrinterName ??
              res?.HasReceiptPrinterName ??
              res?.receiptPrinterName ??
              res?.ReceiptPrinterName
            ),
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

  openGateOperation(request: OpenGateRequest): Observable<HttpResponse<GateOperationResponse>> {
    const body: Record<string, unknown> = {
      controllerId: String(request.controllerId).trim(),
      operationType: request.operationType,
      requestId: request.requestId?.trim() || generateGateRequestId(),
    };
    if (request.ticketId) {
      body['ticketId'] = request.ticketId;
    }

    return this.http
      .post<any>(`${this.base}/Gate/open`, body, { observe: 'response' })
      .pipe(
        map((res) =>
          res.clone({
            body: res.body ? normalizeGateOperationResponse(res.body) : null,
          }) as HttpResponse<GateOperationResponse>,
        ),
      );
  }

  openGate(request: OpenGateRequest): Observable<GateOperationResponse> {
    return this.openGateOperation(request).pipe(map((res) => res.body!));
  }
}
