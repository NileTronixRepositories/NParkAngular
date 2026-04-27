export interface CreateTicketExceedTransactionRequest {
  ticketId: string;
  sanctionIds: string[];
}

export interface CreateTicketExceedTransactionResponse {
  ticketExceedTransactionId: string;
  ticketId: string;
  exceedAmount: number;
  ticketPrice: number;
  totalPriceAfterExceed: number;
  gateId: string;
  userCollectId: string;
  superVisorCollectorId: string | null;
  sanctionIds: string[];
  createdAt: string;
}
