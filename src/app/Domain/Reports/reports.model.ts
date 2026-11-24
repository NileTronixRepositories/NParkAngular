export interface ReportTicketAttachment {
  imagePath?: string;
  filePath?: string;
  path?: string;
}

export interface ReportTicketsResponse {
  ticketId: string;
  enterDate: string;
  exitDate: string | null;
  vehicleNumber: string | null;
  isSubscribed: boolean;
  price: number;
  collectorName: string;
  ticketNumber: string;
  exceedPrice: number;
  isInsideParking: boolean;
  ticketStatus: string;
  createdByUserId: string;
  createdByUserName: string;
  entryGateNumber: number | null;
  exitGateNumber: number | null;
  attachments: ReportTicketAttachment[];
}

export interface TicketReportAttachment {
  attachmentId: string;
  filePath: string;
}

export interface EntranceCashierTicketsReportSummary {
  totalEnteredTicketsCount: number;
  insideParkTicketsCount: number;
  outsideParkTicketsCount: number;
  insideParkTotalBasePrice: number;
  outsideParkTotalBasePrice: number;
  totalBasePrice: number;
  insideParkTotalExceedPrice: number;
  outsideParkTotalExceedPrice: number;
  totalExceedPrice: number;
  insideParkTotalAmount: number;
  outsideParkTotalAmount: number;
  totalAmount: number;
  insideParkExceededTicketsCount: number;
  outsideParkExceededTicketsCount: number;
  totalExceededTicketsCount: number;
}

export interface EntranceCashierInsideTicket {
  ticketId: string;
  uniqueCode: string;
  startDate: string;
  price: number;
  exceedPrice: number;
  totalPrice: number;
  vehicleNumber: string | null;
  isSubscriber: boolean;
  subscriberNationalId: string | null;
  cardNumber: string | null;
  gateId: string;
  gateNumber: number;
  attachments: TicketReportAttachment[];
}

export interface EntranceCashierOutsideTicket {
  ticketId: string;
  uniqueCode: string;
  startDate: string;
  endDate: string;
  price: number;
  exceedPrice: number;
  totalPrice: number;
  vehicleNumber: string | null;
  isSubscriber: boolean;
  subscriberNationalId: string | null;
  cardNumber: string | null;
  gateId: string;
  gateNumber: number;
  exitGateId: string;
  exitGateNumber: number;
  collectedBy: string | null;
  collectorName: string | null;
  collectedDate: string;
  attachments: TicketReportAttachment[];
}

export interface EntranceCashierTicketsReportResponse {
  userId: string;
  cashierName: string;
  username: string;
  roleId: string;
  roleNameEn: string;
  roleNameAr: string;
  from: string;
  to: string;
  summary: EntranceCashierTicketsReportSummary;
  insideParkTickets: EntranceCashierInsideTicket[];
  outsideParkTickets: EntranceCashierOutsideTicket[];
}

export type FinancialItemType = 'BaseTicketPayment' | 'ExceedPayment';

export interface FinancialCollectionItem {
  itemId: string;
  sourceRecordId: string;
  financialItemType: FinancialItemType;
  ticketIdSnapshot: string;
  responsibleUserId: string | null;
  responsibleUserName: string;
  source: string;
  originalPrice: number;
  exceedAmount: number;
  amountCollected: number;
}

export interface SupervisorCollectionsReportResponse {
  supervisor: SupervisorCollectionsReportSupervisor;
  period: SupervisorCollectionsReportPeriod;
  summary: SupervisorCollectionsReportSummary;
  pendingExceedSummaryIsGlobal?: boolean;
  collectionTransactions: SupervisorCollectionTransaction[];
  ticketCollectorsSummary: SupervisorTicketCollectorSummary[];
  activeTicketCollections: SupervisorActiveTicketCollection[];
  archivedTicketCollections: SupervisorArchivedTicketCollection[];
  supervisorExceedCollections: SupervisorExceedCollection[];
  pendingExceedCollections: SupervisorPendingExceedCollection[];
}

export interface SupervisorCollectionsReportSupervisor {
  supervisorId: string;
  supervisorName: string;
  username: string;
  roleId: string;
  roleNameEn: string;
  roleNameAr: string;
}

export interface SupervisorCollectionsReportPeriod {
  from: string;
  to: string;
}

export interface SupervisorCollectionsReportSummary {
  collectionTransactionsCount: number;
  totalItemsCollected: number;
  totalAmountCollected: number;
  ticketCollectionsCount: number;
  totalEnterTicketsCollected?: number;
  totalEnterTicketsAmount?: number;
  totalExitTicketsCollected?: number;
  totalExitTicketsAmount?: number;
  activeTicketCollectionsCount: number;
  archivedTicketCollectionsCount: number;
  activeTicketCollectionsAmount: number;
  archivedTicketCollectionsAmount: number;
  ticketCollectionsAmount: number;
  supervisorExceedCollectionsCount: number;
  supervisorExceedCollectionsAmount: number;
  pendingExceedCollectionsCount: number;
  pendingExceedCollectionsAmount: number;
  grandTotalCollectionsAmount: number;
}

export interface SupervisorCollectionTransaction {
  transactionId: string;
  transactionTypeId: number;
  transactionType: string;
  gateId: string | null;
  gateName: string | number | null;
  collectedBy: string | null;
  collectedByName: string | null;
  collectedAt: string;
  totalItemsCollected: number;
  totalAmountCollected: number;
}

export interface SupervisorTicketCollectorSummary {
  responsibleUserId: string;
  responsibleUserName: string | null;
  enterTicketsCount: number;
  exitTicketsCount?: number;
  exceedTransactionsCount: number;
  totalItemsCount: number;
  enterTicketsAmount: number;
  exitTicketsAmount?: number;
  exceedAmount: number;
  totalAmount: number;
}

export interface SupervisorActiveTicketCollection {
  itemId?: string;
  sourceRecordId?: string;
  financialItemType?: FinancialItemType;
  ticketId: string;
  uniqueCode: string;
  startDate: string;
  collectedDate: string;
  collectorName: string | null;
  responsibleCashierId?: string | null;
  paymentGateId?: string | null;
  collectionAmount: number;
  vehicleNumber: string | null;
  isSubscriber: boolean;
  cardNumber: string | null;
  gateNumber: string | number | null;
}

export interface SupervisorArchivedTicketCollection {
  itemId?: string;
  sourceRecordId?: string;
  financialItemType?: FinancialItemType;
  ticketId: string;
  uniqueCode: string;
  startDate: string;
  endDate: string | null;
  collectedDate: string;
  collectorName: string | null;
  responsibleCashierId?: string | null;
  paymentGateId?: string | null;
  collectionAmount: number;
  vehicleNumber: string | null;
  isSubscriber: boolean;
  cardNumber: string | null;
  gateNumber: string | number | null;
  exitGateNumber: string | number | null;
}

export interface SupervisorExceedCollection {
  itemId?: string;
  sourceRecordId?: string;
  financialItemType?: FinancialItemType;
  transactionId: string;
  ticketUniqueCode: string;
  ticketStartDate: string;
  ticketEndDate: string | null;
  exceedAmount: number;
  ticketPrice: number;
  ticketOldExceedPrice: number;
  totalPriceAfterExceed: number;
  vehicleNumber: string | null;
  exceedCreatedByName: string | null;
  supervisorCollectorName: string | null;
  supervisorCollectedAt: string;
  createdAt: string | null;
  gateNumber: string | number | null;
}

export interface SupervisorPendingExceedCollection {
  transactionId: string;
  ticketUniqueCode: string;
  ticketStartDate: string;
  ticketEndDate: string | null;
  exceedAmount: number;
  vehicleNumber: string | null;
  exceedCreatedByName: string | null;
  createdAt: string | null;
  gateNumber: string | number | null;
}
