export type TicketAction = 'IN' | 'OUT';

export interface TicketDto {
  id: number | string;
  plate: string;
  action: TicketAction | '';
  time: string;
  gate: string;

  price?: number;
  isCollectedByCashier?: boolean;
}

export interface IssuedTicketResponse {
  qrCode: string;
  ticketId: string;
  createdAt: string;
  price: number;
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
}

export interface CollectCashierRequest {
  ticketId: string;
}
