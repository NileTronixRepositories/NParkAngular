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
  entryConfirmationStatus?: EntryConfirmationStatus;
  entryConfirmedAtUtc?: string | null;
  validExitDate?: string | null;
  eligibility?: ExitEligibility | null;
}

export type EntryConfirmationStatus = 'Legacy' | 'Pending' | 'Confirmed';

export function normalizeEntryConfirmationStatus(raw: unknown): EntryConfirmationStatus {
  if (raw === 0 || String(raw ?? '').trim().toLowerCase() === 'legacy') return 'Legacy';
  if (raw === 1 || String(raw ?? '').trim().toLowerCase() === 'pending') return 'Pending';
  if (raw === 2 || String(raw ?? '').trim().toLowerCase() === 'confirmed') return 'Confirmed';
  return 'Legacy';
}

export interface ExitEligibilityFailure {
  code: string;
  message: string;
}

export interface ExitEligibility {
  isValidForExit: boolean;
  reasonCode: string;
  reasonMessage: string;

  validExitDate: string | null;

  requiresBasePayment: boolean;
  requiresOvernightPenalty: boolean;
  hasOutstandingSanctions: boolean;

  basePrice: number;
  exceedPrice: number;
  totalPrice: number;

  paidAmount: number;
  outstandingAmount: number;

  requiredOvernightAmount: number;
  requiredOvernightSanctionId?: string | null;

  operationId: string | null;
  existingOperationId: string | null;

  failureReasons: ExitEligibilityFailure[];
}

export function normalizeExitEligibility(raw: any, fallback?: any): ExitEligibility | null {
  const src = raw ?? fallback;
  if (!src || typeof src !== 'object') return null;

  const basePrice = Number(src.basePrice ?? src.BasePrice ?? 0);
  const exceedPrice = Number(src.exceedPrice ?? src.ExceedPrice ?? 0);
  const totalPrice = Number(src.totalPrice ?? src.TotalPrice ?? basePrice + exceedPrice);
  const operationId = src.operationId ?? src.OperationId ?? src.existingOperationId ?? src.ExistingOperationId ?? null;
  const rawFailures = src.failureReasons ?? src.FailureReasons;
  const failureReasons: ExitEligibilityFailure[] = Array.isArray(rawFailures)
    ? rawFailures.map((f: any) => ({
        code: String(f?.code ?? f?.Code ?? ''),
        message: String(f?.message ?? f?.Message ?? ''),
      }))
    : [];

  return {
    isValidForExit: !!(src.isValidForExit ?? src.IsValidForExit),
    reasonCode: String(src.reasonCode ?? src.ReasonCode ?? ''),
    reasonMessage: String(src.reasonMessage ?? src.ReasonMessage ?? ''),
    validExitDate: src.validExitDate ?? src.ValidExitDate ?? null,
    requiresBasePayment: !!(src.requiresBasePayment ?? src.RequiresBasePayment),
    requiresOvernightPenalty: !!(src.requiresOvernightPenalty ?? src.RequiresOvernightPenalty),
    hasOutstandingSanctions: !!(src.hasOutstandingSanctions ?? src.HasOutstandingSanctions),
    basePrice,
    exceedPrice,
    totalPrice,
    paidAmount: Number(src.paidAmount ?? src.PaidAmount ?? 0),
    outstandingAmount: Number(src.outstandingAmount ?? src.OutstandingAmount ?? 0),
    requiredOvernightAmount: Number(
      src.requiredOvernightAmount ?? src.RequiredOvernightAmount ?? 0,
    ),
    requiredOvernightSanctionId:
      src.requiredOvernightSanctionId ?? src.RequiredOvernightSanctionId ?? null,
    operationId,
    existingOperationId:
      src.existingOperationId ?? src.ExistingOperationId ?? operationId,
    failureReasons,
  };
}

export enum TicketCollectionTransactionType {
  EnterTickets = 1,
  ExceedTransactions = 2,
  ExitTickets = 3,
}

export interface IssuedTicketResponse {
  success: boolean;
  qrCode: string | number[];
  ticketId: string;
  createdAt: string;
  price: number;

  ticketInfo?: string;
  vehicleNumber?: string;

  validExitDate: string;
  entryConfirmationStatus: EntryConfirmationStatus;
  isCashierCollected: boolean;
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
  validExitDate?: string | null;
  isValidForExit?: boolean;
  reasonCode?: string;
  reasonMessage?: string;
  eligibility?: ExitEligibility | null;
  failureReasons?: ExitEligibilityFailure[];
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
  expectedBasePrice?: number;
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
  scannerPhoto?: File | null;
  pricingSchemaId?: string;
  scannedFile?: File;
  ticketsImages?: File[];
  vehicleImages?: File[];
}

export interface CollectDailyTicketsResponse {
  transactionId?: string | null;
  gateId: number | string;
  gateName?: string | null;
  collectedBy?: string | null;
  collectedName?: string | null;
  date: string;

  totalAmount: number;
  totalPriceCollected: number;
  totalTicketsCollected: number;

  lines?: {
    responsibleUserId: string;
    responsibleUserName: string;
    ticketsCount: number;
    totalOriginalPrice: number;
  }[];

  ticketCollectDetails: {
    ticketId?: string | null;
    responsibleUserId?: string | null;
    responsibleUserName?: string | null;
    collectedAt: string;
    ticketNumber: string;
    source?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    price: number;
    vehicleNumber?: string | null;
    cardNumber?: string | null;
    isSubscriber?: boolean;
    gateId?: string | null;
    gateNumber?: number | null;
    gateType?: number | string | null;
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
  responsibleUserId: string;
  responsibleUserName?: string | null;
  collectedAt: string;
}

export interface CollectEnterTicketsResponse {
  transactionId: string;
  gateId: string;
  collectedBy: string;
  collectedName: string;
  collectedAt: string;
  totalTicketsCollected: number;
  totalOriginalPriceCollected: number;
  lines: {
    responsibleUserId: string;
    responsibleUserName: string;
    ticketsCount: number;
    totalOriginalPrice: number;
  }[];
  tickets: CollectedEnterTicketDto[];
}

export interface CalculateSalaryResponse {
  ticketId: string;
  enterDate: string;

  /** Base parking fee only (V2 semantic change: does NOT include sanctions). */
  totalSalary: number;

  basePrice: number;
  exceedPrice: number;
  totalPrice: number;

  paidAmount: number;
  outstandingAmount: number;

  quotedSanctions: number;
  requiredOvernightAmount: number;

  validExitDate: string;
  reasonCode: string;

  requiresOvernightPenalty: boolean;

  isExitValid: boolean;
  isValidForExit: boolean;
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
  reasonCode?: string;
  reasonMessage?: string;
  validExitDate?: string | null;
  requiresBasePayment?: boolean;
  requiresOvernightPenalty?: boolean;
  hasOutstandingSanctions?: boolean;
  outstandingAmount?: number;
  existingOperationId?: string | null;
  eligibility?: ExitEligibility | null;
  failureReasons?: ExitEligibilityFailure[];
}

export interface ValidateExitByTextRequest {
  text: string;
}

export interface ValidateExitByTextResponse {
  ticketId: string | null;
  inputText: string;
  matchType: 'QrCode' | 'QrCodeHex' | 'CardNumber' | 'VehicleNumber' | null;
  ticketNumber: string | null;
  cardNumber: string | null;
  vehicleNumber: string | null;
  startDate: string | null;
  endDate: string | null;
  isValidForExit: boolean;
  reasonCode?: string;
  reasonMessage?: string;
  validExitDate?: string | null;
  requiresBasePayment?: boolean;
  requiresOvernightPenalty?: boolean;
  hasOutstandingSanctions?: boolean;
  outstandingAmount?: number;
  existingOperationId?: string | null;
  eligibility?: ExitEligibility | null;
  failureReasons?: ExitEligibilityFailure[];
}

export interface TicketDetailsFilterRequest {
  pageNumber?: number;
  pageSize?: number;
  orderSort?: 'Newest' | 'Oldest';
  searchText?: string;
  fromDate?: string;
  toDate?: string;
  gateId?: string;
  isCollected?: boolean;
  isSubscriber?: boolean;
}

export interface TicketAttachmentDetailsDto {
  attachmentId: string;
  filePath: string;
}

export interface TicketDetailsItemDto {
  ticketId: string;
  startDate: string;
  endDate: string | null;
  price: number;
  exceedPrice: number;
  totalPrice: number;
  vehicleNumber: string | null;
  isCollected: boolean;
  collectedBy: string | null;
  collectedDate: string | null;
  uniqueCode: string;
  gateId: string;
  exitGateId: string | null;
  userId: string;
  isCashierCollected: boolean;
  isSubscriber: boolean;
  subscriberNationalId: string | null;
  cardNumber: string | null;
  attachments: TicketAttachmentDetailsDto[];
}
