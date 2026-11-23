import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  ParkingConfigurationUpdateCommand,
  ParkingConfigurationView,
} from '../../Domain/parking-config/parking-config.model';

export interface PricingSchemaDto {
  id: string;
  name: string;
  description?: string | null;
}

@Injectable({ providedIn: 'root' })
export class Configurationervices {
  private base = `${environment.baseUrl}/ParkingConfiguration`;
  private pricingBase = `${environment.baseUrl}/PricingSchema`;

  constructor(private http: HttpClient) {}

  getConfiguration(): Observable<ParkingConfigurationView> {
    return this.http
      .get<any>(`${this.base}/Get`)
      .pipe(map((res) => this.normalizeConfiguration(res)));
  }

  updateConfig(dto: ParkingConfigurationUpdateCommand): Observable<any> {
    return this.http.post(`${this.base}/Update`, dto);
  }

  getPricingSchemas(): Observable<PricingSchemaDto[]> {
    return this.http.get<PricingSchemaDto[]>(`${this.pricingBase}/GetWithoudPagination`);
  }

  private normalizeConfiguration(res: any): ParkingConfigurationView {
    const normalizeGate = (gate: any) => {
      const onvif = gate?.onvifCameraSetting ?? gate?.ONVIFCameraSetting ?? null;

      return {
        hasScanner: gate?.hasScanner ?? gate?.HasScanner ?? false,
        gateId: gate?.gateId ?? gate?.GateId ?? null,
        gateNumber: gate?.gateNumber ?? gate?.GateNumber ?? 0,
        lprIp: gate?.lprIp ?? gate?.LprIp ?? null,
        pcIp: gate?.pcIp ?? gate?.PcIp ?? null,
        controlIp: gate?.controlIp ?? gate?.ControlIp ?? '',
        onvifCameraSetting: onvif
          ? {
              urlRequest: onvif.urlRequest ?? onvif.UrlRequest ?? '',
              userName: onvif.userName ?? onvif.UserName ?? '',
              password: onvif.password ?? onvif.Password ?? '',
            }
          : null,
        isAssigned: !!(gate?.isAssigned ?? gate?.IsAssigned),
        assignedTo: gate?.assignedTo ?? gate?.AssignedTo ?? null,
        hasQrPrinterName: !!(
          gate?.hasQrPrinterName ??
          gate?.HasQrPrinterName ??
          gate?.qrPrinterName ??
          gate?.QrPrinterName
        ),
        qrPrinterName: gate?.qrPrinterName ?? gate?.QrPrinterName ?? null,
        hasReceiptPrinterName: !!(
          gate?.hasReceiptPrinterName ??
          gate?.HasReceiptPrinterName ??
          gate?.receiptPrinterName ??
          gate?.ReceiptPrinterName
        ),
        receiptPrinterName: gate?.receiptPrinterName ?? gate?.ReceiptPrinterName ?? null,
      };
    };

    return {
      entryGatesCount: res?.entryGatesCount ?? res?.EntryGatesCount ?? 0,
      exitGatesCount: res?.exitGatesCount ?? res?.ExitGatesCount ?? 0,
      allowedParkingSlots: res?.allowedParkingSlots ?? res?.AllowedParkingSlots ?? null,
      gracePeriodMinutes: res?.gracePeriodMinutes ?? res?.GracePeriodMinutes ?? null,
      priceType: res?.priceType ?? res?.PriceType,
      vehiclePassengerData: res?.vehiclePassengerData ?? res?.VehiclePassengerData,
      printType: res?.printType ?? res?.PrintType,
      dateTimeFlag: !!(res?.dateTimeFlag ?? res?.DateTimeFlag),
      ticketIdFlag: !!(res?.ticketIdFlag ?? res?.TicketIdFlag),
      feesFlag: !!(res?.feesFlag ?? res?.FeesFlag),
      pricingSchemaId: res?.pricingSchemaId ?? res?.PricingSchemaId ?? null,
      pricingSchemaName: res?.pricingSchemaName ?? res?.PricingSchemaName ?? '',
      ticketCard: res?.ticketCard ?? res?.TicketCard,
      entryGates: (res?.entryGates ?? res?.EntryGates ?? []).map(normalizeGate),
      exitGates: (res?.exitGates ?? res?.ExitGates ?? []).map(normalizeGate),
    };
  }
}
