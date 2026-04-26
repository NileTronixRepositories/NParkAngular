export enum PriceType {
  Entry = 'Enter',
  Exit = 'Exit',
}

export enum VehiclePassengerData {
  ScannerId = 'ScannerId',
  VehiclePlate = 'VehiclePlate',
}

export enum PrintType {
  QrCode = 'QrCode',
  Receipt = 'Receipt',
}

export interface OnvifCameraSettingDto {
  urlRequest: string;
  userName: string;
  password: string;
}

export interface GateConfigDto {
  gateNumber: number;
  lprIp: string;
  pcIp?: string;
  controlIp: string;
  gateId: string | null;
  isAssigned?: boolean;
  assignedTo?: string | null;
  qrPrinterName?: string | null;
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
  allowedParkingSlots: number;

  priceType: PriceType;
  gracePeriodMinutes: number;

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
  allowedParkingSlots: number;

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
