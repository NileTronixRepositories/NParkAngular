export type TicketAction = 'IN' | 'OUT';

export interface TicketDto {
  id: number | string;
  plate: string;
  action: TicketAction | '';
  time: string;
  gate: string;

  price?: number;
  isCollectedByCashier?: boolean;

  info?: string;

  customerName?: string | null;
  phone?: string | null;
  cardNumber?: string | null;
}

export interface IssuedTicketResponse {
  qrCode: string;
  ticketId: string;
  createdAt: string;
  price: number;

  ticketInfo?: string;
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

export interface TicketEntryDto {
  startDate: string;
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

export interface AddTicketRequest {
  vehicleNumber?: string;
  isSubscriber: boolean;
  cardNumber?: string;
}

export interface CollectDailyTicketsResponse {
  gateId: number;
  gateName: string;
  date: string;
  totalAmount: number;
  totalPriceCollected: number;
  totalTicketsCollected: number;
  ticketCollectDetails: {
    collectedAt: string;
    ticketNumber: string;
    price: number;
  }[];
}

export interface CalculateSalaryResponse {
  totalSalary: number;
  enterDate: string;
  isExitValid: boolean;
  isCollectByCashier: boolean;
}
