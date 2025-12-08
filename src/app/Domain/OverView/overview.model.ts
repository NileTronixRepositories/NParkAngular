export type TicketAction = 'IN' | 'OUT';

export interface GateTicketsSummaryDto {
  gateId: string;
  gateNumber: number;
  ticketsCount: number;
  totalPrice: number;
  collectedPrice: number;
  supervisorName?: string | null;
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

  // Subscriptions
  subscriptionCount: number;
  activeSubscriptionCount: number;
  inactiveSubscriptionCount: number;

  enterTicketsCount: number;
  exitTicketsCount: number;

  totalRevenue: number;
  collectedRevenue: number;
  pendingRevenue: number;

  currentVehiclesInside: number;
  occupancyPercentage: number;
  estimatedFreeSlots: number;
  activeTicketsCount: number;

  membershipTicketsCount: number;
  walkInTicketsCount: number;

  membershipRelatedRevenue: number;
  walkInRevenue: number;

  membershipsExpiringNext7Days: number;

  averageDurationMinutes: number;
  maxDurationMinutes: number;
  exceededTicketsCount: number;
  totalExceedRevenue: number;
  averageExceedPerTicket: number;

  busiestGateNumber: number;
  busiestGateTicketsCount: number;
  topCollectorName?: string | null;
  topCollectorAmount: number;
  topCollectorTicketsCount: number;

  entryGates: GateTicketsSummaryDto[];
  exitGates: GateTicketsSummaryDto[];

  chartHours?: number[];
  chartIn?: number[];
  chartOut?: number[];
  recentTickets?: OverviewTicketDto[];
}
