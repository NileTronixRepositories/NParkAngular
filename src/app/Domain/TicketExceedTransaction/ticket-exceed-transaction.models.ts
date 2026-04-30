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

export interface CollectExceedTransactionDetail {
  transactionId: string;
  ticketIdSnapshot: string;
  ticketUniqueCode: string;
  transactionCreatedAt: string;
  supervisorCollectedAt: string;
  ticketPrice: number;
  ticketOldExceedPrice: number;
  exceedAmount: number;
  totalPriceAfterExceed: number;
  vehicleNumber: string | null;
  cardNumber: string | null;
  isSubscriber: boolean;
  gateNumber?: number | null;
  gateType?: number | string | null;
}

export interface CollectExceedTransactionsResponse {
  totalExceedAmountCollected: number;
  totalTransactionsCollected: number;
  ticketExceedCollectDetails: CollectExceedTransactionDetail[];
}
