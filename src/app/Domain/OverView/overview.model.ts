// src/app/Domain/OverView/overview.model.ts

export type TicketAction = 'IN' | 'OUT';

export interface GateTicketsSummaryDto {
  /** Database identifier of the gate. */
  gateId: string; // Guid

  /** Human-readable gate number (e.g. 1, 2, 3). */
  gateNumber: number;

  /** Total number of tickets processed by this gate for the selected day. */
  ticketsCount: number;

  /** Total ticket price (sum of Price) for this gate. */
  totalPrice: number;

  /** Total collected amount (only tickets with IsCollected = true). */
  collectedPrice: number;

  /**
   * Name of the last supervisor (collector) who collected a ticket on this gate,
   * based on CollectedDate. Can be null if no collected tickets.
   */
  supervisorName?: string | null;
}

/**
 * Ticket row used in the dashboard "Recent Tickets" table.
 * لازم الـ API يرجّع نفس الشكل ده.
 */
export interface OverviewTicketDto {
  id: number;
  plate: string;
  action: TicketAction; // "IN" | "OUT"
  gate: string;
  time: string; // e.g. "11:20 AM" أو format مناسب
}

/**
 * Top-level dashboard statistics for a specific day.
 * موازية لـ C# DashboardDto + شوية حقول للـ UI (charts, recentTickets).
 */
export interface DashboardDto {
  /** The date the statistics are calculated for. (DateOnly in backend) */
  date: string;

  /** Total number of active memberships in the system. */
  subscriptionCount: number;

  /** Total number of entry tickets issued this day. */
  enterTicketsCount: number;

  /** Total number of tickets that reached an exit gate this day. */
  exitTicketsCount: number;

  /** Total revenue (sum of ticket prices for the day). */
  totalRevenue: number;

  /** Total collected revenue (only collected tickets). */
  collectedRevenue: number;

  /** Revenue that is still pending collection (Total - Collected). */
  pendingRevenue: number;

  // == High-level KPIs ==

  /** Number of vehicles currently inside the parking (based on active tickets). */
  currentVehiclesInside: number;

  /** Parking occupancy percentage = CurrentVehiclesInside / TotalParkingSlots * 100. */
  occupancyPercentage: number;

  /** Estimated free slots = TotalParkingSlots - CurrentVehiclesInside. */
  estimatedFreeSlots: number;

  /** Number of active tickets that have not exited and not collected yet. */
  activeTicketsCount: number;

  // == Membership Insights ==

  /** Number of tickets linked to a membership today (Ticket.IsSubscriber = true). */
  membershipTicketsCount: number;

  /** Number of tickets without membership (walk-in) today. */
  walkInTicketsCount: number;

  /** Total revenue associated with membership tickets today. */
  membershipRelatedRevenue: number;

  /** Total revenue associated with walk-in tickets today. */
  walkInRevenue: number;

  /** Number of memberships expiring in the next 7 days. */
  membershipsExpiringNext7Days: number;

  // == Pricing & Exceed Time ==

  /** Average parking duration (in minutes) for tickets that exited today. */
  averageDurationMinutes: number;

  /** Maximum parking duration (in minutes) for tickets that exited today. */
  maxDurationMinutes: number;

  /** Number of tickets that have ExceedPrice > 0 today. */
  exceededTicketsCount: number;

  /** Total exceed charges collected today. */
  totalExceedRevenue: number;

  /** Average exceed charge per exceeded ticket today. */
  averageExceedPerTicket: number;

  // == Gate & Cashier Performance ==

  /** Gate number with the highest tickets count today (entry or exit). */
  busiestGateNumber: number;

  /** Number of tickets processed by the busiest gate today. */
  busiestGateTicketsCount: number;

  /** Name of the top collector (cashier) today. */
  topCollectorName?: string | null;

  /** Total amount collected by the top collector today. */
  topCollectorAmount: number;

  /** Number of tickets collected by the top collector today. */
  topCollectorTicketsCount: number;

  /** Entry gates per-gate statistics. */
  entryGates: GateTicketsSummaryDto[];

  /** Exit gates per-gate statistics. */
  exitGates: GateTicketsSummaryDto[];

  // ===== Extra fields for UI (frontend-only contract) =====

  /**
   * Hours for the live in/out chart.
   * لازم تضيفها في الـ API لو عايز الجرافيك من السيرفر.
   */
  chartHours?: number[];

  /** IN count for each hour (same length as chartHours). */
  chartIn?: number[];

  /** OUT count for each hour (same length as chartHours). */
  chartOut?: number[];

  /**
   * Last tickets for the "Recent Tickets" table.
   * مثال: آخر 10 تذاكر.
   */
  recentTickets?: OverviewTicketDto[];
}
