import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { GateDevicePeripheral } from '../../Domain/Auth/auth.models';
import { GateConnectionInfo, GateServices } from './gate-services';

export interface GatePrinterOptions {
  printQrEnabled: boolean;
  printReceiptEnabled: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class GatePeripheralFacade {
  private readonly gateSvc = inject(GateServices);

  getConnectionInfo(gateId: string | number): Observable<GateConnectionInfo> {
    return this.gateSvc.getGateConnectionInfo(gateId);
  }

  mergeConnectionInfo(
    current: GateDevicePeripheral | null,
    info: GateConnectionInfo,
  ): GateDevicePeripheral | null {
    if (!current) return null;

    return {
      ...current,
      pcIp: info.pcIp ?? current.pcIp,
      lprIp: info.lprIp ?? current.lprIp,
      hasScanner: info.hasScanner ?? current.hasScanner ?? null,
      hasPc: !!info.pcIp || current.hasPc,
      hasLpr: !!info.lprIp || current.hasLpr,
    };
  }

  printerOptions(info: GateConnectionInfo | null): GatePrinterOptions {
    return {
      printQrEnabled: !!info?.hasQrPrinterName,
      printReceiptEnabled: !!info?.hasReceiptPrinterName,
    };
  }

  cameraUrl(info: GateConnectionInfo | null): string | null {
    const url = info?.onvifCameraSetting?.url?.trim();
    return url || null;
  }

  controlId(info: GateConnectionInfo | null): string | null {
    const controlId = info?.controlIp?.trim();
    return controlId || null;
  }

  hasControlConnection(info: GateConnectionInfo | null): boolean {
    return !!this.controlId(info);
  }
}
