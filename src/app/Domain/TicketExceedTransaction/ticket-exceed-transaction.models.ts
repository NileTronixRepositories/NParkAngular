export interface CreateTicketExceedTransactionRequest {
  ticketId: string;
  sanctionIds: string[];
  idempotencyKey: string;
  expectedAmount: number;
  expectedValidExitDate?: string | null;
}

export interface CreateTicketExceedTransactionResponse {
  ticketExceedTransactionId: string;
  ticketId: string;
  exceedAmount: number;
  exceedPrice: number;
  ticketPrice: number;
  totalPriceAfterExceed: number;
  paidAmount: number;
  outstandingAmount: number;
  validExitDate: string;
  gateId: string;
  userCollectId: string;
  superVisorCollectorId: string | null;
  sanctionIds: string[];
  paymentStatus: string;
  paymentConfirmedAtUtc: string | null;
  createdAt: string;
  qrCode: string | number[] | null;
  ticketInfo: string;
}

export interface CollectExceedTransactionDetail {
  transactionId: string;
  ticketIdSnapshot: string;
  ticketUniqueCode: string;
  responsibleUserId: string;
  responsibleUserName: string;
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

export interface CollectExceedTransactionLine {
  responsibleUserId: string;
  responsibleUserName: string;
  transactionsCount: number;
  totalExceedAmount: number;
}

export interface CollectExceedTransactionsResponse {
  collectionTransactionId: string;
  gateId: string;
  collectedBy: string;
  collectedName: string;
  collectedAt: string;
  totalExceedAmountCollected: number;
  totalTransactionsCollected: number;
  lines: CollectExceedTransactionLine[];
  ticketExceedCollectDetails: CollectExceedTransactionDetail[];
}
