export type TicketAction = 'IN' | 'OUT';
export type OrderSort = 'Newest' | 'Oldest';

export interface SearchTicketRequest {
  searchText?: string | null;
  startDate?: string | null;
  orderSort?: OrderSort;
  pageNumber?: number;
  pageSize?: number;
}

export interface SearchTicketResponse {
  id: string;
  startDate: string;
  vehicleNumber: string | null;
  cardNumber: string | null;
  uniqueCode: string;
  isSubscribe: boolean;
  price: number;
}

export interface TicketDto {
  id: number | string;
  plate: string;
  action: TicketAction | '';
  time: string;
  gate: string;

  price?: number;
  isCollectedByCashier?: boolean;

  info?: string;

  ticketNumber?: string;
  customerName?: string | null;
  phone?: string | null;
  cardNumber?: string | null;
  plateNumber?: string;
}

export interface IssuedTicketResponse {
  success?: boolean;
  qrCode: string | number[];
  ticketId: string;
  createdAt: string;
  price: number;

  ticketInfo?: string;
  vehicleNumber?: string;
}

export interface TicketDetailsDto {
  id: number | string;
  plate: string;
  dateTime: string;
  endDate: string;
  price: number;
  exceedPrice: number;
  totalPrice: number;
}

export interface ScanTicketResponse {
  id: string;
  startDate: string;
  ticketNumber: string;
  price: number;
  isCollectedByCashier: boolean;
  ticketInfo: string;
}

/**
 * Raw row from API used for entry/exit tables
 */
export interface TicketEntryDto {
  startDate: string;

  // Internal GUIDs
  id?: string;
  Id?: string;
  ticketId?: string;
  TicketId?: string;

  ticketNumber: string;

  price: number;
  isCollectedByCashier: boolean;

  ticketInfo?: string;

  name?: string;
  Name?: string;
  customerName?: string;
  CustomerName?: string;

  phone?: string;
  Phone?: string;

  cardNumber?: string;
  CardNumber?: string;

  plate?: string;
  Plate?: string;

  gate?: string;
  Gate?: string;
}

export interface TicketTableResponseDto {
  totalPrice: number;
  ticketInfo: TicketEntryDto[];
}

export interface CollectCashierRequest {
  ticketId: string;
}

export interface ParkingCardSummaryDto {
  name?: string;
  phone?: string;
  nationalId?: string;
  vehicleNumber?: string;
  cardNumber?: string;
  createdAt?: string;
  endDate?: string;
  price?: number;
}

export interface MembershipCheckResponse {
  isExist: boolean;
  cardNumber?: string | null;
  vehicleNumber?: string | null;
  summary?: ParkingCardSummaryDto | null;
}

export interface CardMembershipCheckResponse {
  isMember: boolean;
  cardNumber?: string | null;
  vehicleNumber?: string | null;
  summary?: ParkingCardSummaryDto | null;
}

export interface AddTicketRequest {
  vehicleNumber?: string;
  isSubscriber: boolean;
  cardNumber?: string;
  pricingSchemaId?: string;
  scannedFile?: File;
  vehicleImages?: File[];
}

export interface CollectDailyTicketsResponse {
  gateId: number | string;
  gateName?: string | null;
  date: string;

  totalAmount: number;
  totalPriceCollected: number;
  totalTicketsCollected: number;

  ticketCollectDetails: {
    ticketId?: string | null;
    collectedAt: string;
    ticketNumber: string;
    source?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    price: number;
    vehicleNumber?: string | null;
    cardNumber?: string | null;
    isSubscriber?: boolean;
    exitGateId?: string | null;
    extraFields?: Record<string, unknown>;
  }[];
}

export interface UncollectedEnterTicketDto {
  ticketId: string;
  ticketUniqueCode: string;
  source: string;
  startDate: string;
  endDate: string | null;
  originalPrice: number;
  vehicleNumber: string | null;
  cardNumber: string | null;
  isSubscriber: boolean;
  gateId: string;
  exitGateId: string | null;
}

export interface UncollectedEnterTicketsResponse {
  gateId: string;
  totalTicketsCount: number;
  totalOriginalPrice: number;
  tickets: UncollectedEnterTicketDto[];
}

export interface CollectedEnterTicketDto extends UncollectedEnterTicketDto {
  collectedAt: string;
}

export interface CollectEnterTicketsResponse {
  gateId: string;
  collectedBy: string;
  collectedAt: string;
  totalTicketsCollected: number;
  totalOriginalPriceCollected: number;
  tickets: CollectedEnterTicketDto[];
}

export interface CalculateSalaryResponse {
  ticketId: string;
  totalSalary: number;
  enterDate: string;
  isExitValid: boolean;
  isCollectByCashier: boolean;
}

export interface ValidateExitByVehicleNumberResponse {
  ticketId: string | null;
  vehicleNumber: string | null;
  ticketNumber: string | null;
  cardNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  isValidForExit: boolean;
}

export interface ValidateExitByTextRequest {
  text: string;
}

export interface ValidateExitByTextResponse {
  ticketId: string | null;
  inputText: string;
  matchType: 'QrCode' | 'CardNumber' | 'VehicleNumber' | null;
  ticketNumber: string | null;
  cardNumber: string | null;
  vehicleNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  isValidForExit: boolean;
}
