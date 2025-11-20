export type TicketAction = 'IN' | 'OUT';

export interface TicketDto {
  id: number | string;
  plate: string;
  action: TicketAction | '';
  time: string;
  gate: string;
}

export interface IssuedTicketResponse {
  id: number | string;
  qrImageBase64?: string;
  qrText?: string;
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
  ticketNumber: string;
  startDate: string;
}
