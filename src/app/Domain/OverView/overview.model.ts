export type TicketAction = 'IN' | 'OUT';

export interface GateCollectorSummaryDto {
  collectorId: string;
  collectorName: string;
  ticketsCount: number;
  collectedAmount: number;
}

export interface GateSupervisorSummaryDto {
  supervisorId: string;
  supervisorName: string;
  transactionsCount: number;
  collectedAmount: number;
}

export interface EntryGateSummaryDto {
  gateId: string;
  gateNumber: number;
  ticketsCount: number;
  totalPrice: number;
  collectedPrice: number;
  pendingPrice: number;
  collectors: GateCollectorSummaryDto[];
}

export interface ExitGateSummaryDto {
  gateId: string;
  gateNumber: number;
  exitedTicketsCount: number;
  exceedTransactionsCount: number;
  collectedExceedTransactionsCount: number;
  pendingExceedTransactionsCount: number;
  totalExceedAmount: number;
  collectedExceedAmount: number;
  pendingExceedAmount: number;
  supervisors: GateSupervisorSummaryDto[];
}

export interface OverviewTicketDto {
  id: number;
  plate: string;
  action: TicketAction;
  gate: string;
  time: string;
}

export interface TicketInsideParkDto {
  startDate: string;
  ticketNumber: string;
  price: number;
  isCollectedByCashier: boolean;
  ticketInfo?: string | null;
  id: string;
}

export interface TicketTodayDto {
  ticketId: string;
  gateId: string;
  startDate: string;
  price: number;
  isSubscriber: boolean;
  vehicleNumber: string;
}

export interface TicketAdminDto {
  id: string;
  startDate: string;
  ticketNumber: string;
  price: number;
  isCollectedByCashier: boolean;
  ticketInfo: string;
}

export interface MembershipBaseDto {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  vehicleNumber: string;
  cardNumber: string;
  pricingSchemeName: string;
  createdAt: string;
  endDate: string;
}

export type ActiveMembershipDto = MembershipBaseDto;
export type InactiveMembershipDto = MembershipBaseDto;
export type ExpiringMembershipDto = MembershipBaseDto;

export interface DashboardDto {
  date: string;

  subscriptionCount: number;
  activeSubscriptionCount: number;
  inactiveSubscriptionCount: number;
  membershipsExpiringNext7Days: number;

  ticketEnterToday: number;
  ticketEnterNotTodayButNotExitYet: number;
  exitTicketsCount: number;

  currentVehiclesInside: number;
  activeTicketsCount: number;
  occupancyPercentage: number;
  estimatedFreeSlots: number;

  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;

  ticketBaseRevenue: number;
  collectedTicketBaseRevenue: number;
  pendingTicketBaseRevenue: number;

  membershipTicketsCount: number;
  walkInTicketsCount: number;
  membershipRelatedRevenue: number;
  walkInRevenue: number;

  averageDurationMinutes: number;
  maxDurationMinutes: number;

  exceededTicketsCount: number;
  exceedTransactionsCount: number;
  collectedExceedTransactionsCount: number;
  pendingExceedTransactionsCount: number;

  totalExceedRevenue: number;
  collectedExceedRevenue: number;
  pendingExceedRevenue: number;

  averageExceedPerTicket: number;
  averageExceedPerTransaction: number;

  busiestGateNumber: number;
  busiestGateTicketsCount: number;

  topCollectorName: string | null;
  topCollectorAmount: number;
  topCollectorTicketsCount: number;

  topExceedCollectorName: string | null;
  topExceedCollectorAmount: number;
  topExceedCollectorTransactionsCount: number;

  entryGates: EntryGateSummaryDto[];
  exitGates: ExitGateSummaryDto[];

  chartHours?: number[];
  chartIn?: number[];
  chartOut?: number[];
  recentTickets?: OverviewTicketDto[];
}
