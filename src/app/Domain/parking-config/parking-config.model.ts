export enum PriceType {
  Entry = 0,
  Exit = 1,
}

export enum VehiclePassengerData {
  Lpr = 0,
  ScannerId = 1,
}

export enum PrintType {
  QrCode = 0,
  Rfid = 1,
}

export interface GateConfigDto {
  gateNumber: number;
  lprIp: string;
  pcIp?: string;
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

  pricingSchemaId: string;

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

  pricingSchemaId: string;
  pricingSchemaName?: string;

  ticketCard?: TicketCardDto;

  entryGates: GateConfigDto[];
  exitGates: GateConfigDto[];
}
