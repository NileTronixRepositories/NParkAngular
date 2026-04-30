export enum PriceType {
  Entry = 0,
  Exit = 1,
}

export enum VehiclePassengerData {
  VehiclePlate = 0,
  ScannerId = 1,
  Both = 2,
}

export enum PrintType {
  QrCode = 0,
  Receipt = 1,
}

export interface OnvifCameraSettingDto {
  urlRequest: string;
  userName: string;
  password: string;
}

export interface GateConfigDto {
  hasScanner?: boolean | null;
  gateNumber: number;
  lprIp?: string | null;
  pcIp?: string | null;
  controlIp: string;
  gateId: string | null;
  isAssigned?: boolean;
  assignedTo?: string | null;
  hasQrPrinterName: boolean;
  qrPrinterName?: string | null;
  hasReceiptPrinterName: boolean;
  receiptPrinterName?: string | null;
  onvifCameraSetting?: OnvifCameraSettingDto | null;
}


export interface TicketCardDto {
  startDate: string;
  ticketIdPrefix: string;
}

export interface ParkingConfigurationUpdateCommand {
  entryGatesCount: number;
  exitGatesCount: number;
  allowedParkingSlots: number | null;

  priceType: PriceType;
  gracePeriodMinutes: number | null;

  vehiclePassengerData: VehiclePassengerData;
  printType: PrintType;

  dateTimeFlag: boolean;
  ticketIdFlag: boolean;
  feesFlag: boolean;

  pricingSchemaId: string | null;

  entryGates: GateConfigDto[];

  exitGates: GateConfigDto[];
}

export interface ParkingConfigurationView {
  entryGatesCount: number;
  exitGatesCount: number;
  allowedParkingSlots: number | null;

  gracePeriodMinutes: number | null;

  priceType: PriceType;
  vehiclePassengerData: VehiclePassengerData;
  printType: PrintType;

  dateTimeFlag: boolean;
  ticketIdFlag: boolean;
  feesFlag: boolean;

  pricingSchemaId: string | null;
  pricingSchemaName?: string | null;

  ticketCard?: TicketCardDto;

  entryGates: GateConfigDto[];
  exitGates: GateConfigDto[];
}
