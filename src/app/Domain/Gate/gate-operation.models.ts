export type GateOperationType = 'Entry' | 'Exit' | 'Manual';

export type GateOperationStatus =
  | 'Pending'
  | 'Published'
  | 'Acknowledged'
  | 'Completed'
  | 'Failed'
  | 'TimedOut'
  | 'Unknown';

export interface OpenGateRequest {
  controllerId: string;
  operationType: 'Entry' | 'Manual';
  ticketId?: string;
}

export interface GateOperationResponse {
  operationId: string;
  ticketId: string | null;
  gateId: string;

  commandId: string;
  controllerId: number;

  operationType: GateOperationType;
  status: GateOperationStatus;

  isAcknowledged: boolean;
  ticketExited: boolean;
  archived: boolean;

  createdAtUtc: string;
  publishedAtUtc: string | null;
  acknowledgedAtUtc: string | null;
  completedAtUtc: string | null;

  ackStatusCode: number | null;

  retryAllowed: boolean;
  requiresReconciliation: boolean;
  reasonCode: string | null;

  topic: string;
  payload: string;
}

export interface GateOperationListFilter {
  ticketId?: string | null;
  controllerId?: number | string | null;
  status?: GateOperationStatus | null;
}

export interface ReconcileNonExecutionRequest {
  evidence: string;
}

export interface PersistedGateOperationRef {
  gateId: string;
  controllerId: number | string | null;
  ticketId: string | null;
  operationId: string;
  operationType: GateOperationType;
  status: GateOperationStatus;
  updatedAtUtc: string;
}

const OPERATION_TYPE_MAP: Record<string, GateOperationType> = {
  '0': 'Entry',
  '1': 'Exit',
  '2': 'Manual',
  entry: 'Entry',
  exit: 'Exit',
  manual: 'Manual',
};

const OPERATION_STATUS_MAP: Record<string, GateOperationStatus> = {
  '0': 'Pending',
  '1': 'Published',
  '2': 'Acknowledged',
  '3': 'Completed',
  '4': 'Failed',
  '5': 'TimedOut',
  '6': 'Unknown',
  pending: 'Pending',
  published: 'Published',
  acknowledged: 'Acknowledged',
  completed: 'Completed',
  failed: 'Failed',
  timedout: 'TimedOut',
  unknown: 'Unknown',
};

const STATUS_PROGRESSION_RANK: Record<GateOperationStatus, number> = {
  Pending: 1,
  Published: 2,
  Acknowledged: 3,
  TimedOut: 3,
  Unknown: 3,
  Failed: 4,
  Completed: 5,
};

export function normalizeGateOperationType(raw: unknown): GateOperationType {
  if (raw == null) return 'Manual';
  const key = String(raw).trim().toLowerCase();
  return OPERATION_TYPE_MAP[key] ?? 'Manual';
}

export function normalizeGateOperationStatus(raw: unknown): GateOperationStatus {
  if (raw == null) return 'Unknown';
  const key = String(raw).trim().toLowerCase();
  return OPERATION_STATUS_MAP[key] ?? 'Unknown';
}

export function normalizeGateOperationResponse(raw: any): GateOperationResponse {
  const commandIdRaw = raw?.commandId ?? raw?.CommandId ?? '';
  const ackCodeRaw = raw?.ackStatusCode ?? raw?.AckStatusCode;

  return {
    operationId: String(raw?.operationId ?? raw?.OperationId ?? raw?.id ?? raw?.Id ?? ''),
    ticketId: raw?.ticketId ?? raw?.TicketId ?? null,
    gateId: String(raw?.gateId ?? raw?.GateId ?? ''),

    // Always preserve commandId as a decimal string (64-bit safe)
    commandId: commandIdRaw == null ? '' : String(commandIdRaw),
    controllerId: Number(raw?.controllerId ?? raw?.ControllerId ?? 0),

    operationType: normalizeGateOperationType(raw?.operationType ?? raw?.OperationType),
    status: normalizeGateOperationStatus(raw?.status ?? raw?.Status),

    isAcknowledged: !!(raw?.isAcknowledged ?? raw?.IsAcknowledged),
    ticketExited: !!(raw?.ticketExited ?? raw?.TicketExited),
    archived: !!(raw?.archived ?? raw?.Archived),

    createdAtUtc: String(raw?.createdAtUtc ?? raw?.CreatedAtUtc ?? ''),
    publishedAtUtc: raw?.publishedAtUtc ?? raw?.PublishedAtUtc ?? null,
    acknowledgedAtUtc: raw?.acknowledgedAtUtc ?? raw?.AcknowledgedAtUtc ?? null,
    completedAtUtc: raw?.completedAtUtc ?? raw?.CompletedAtUtc ?? null,

    ackStatusCode:
      ackCodeRaw === null || ackCodeRaw === undefined || ackCodeRaw === ''
        ? null
        : Number(ackCodeRaw),

    retryAllowed: !!(raw?.retryAllowed ?? raw?.RetryAllowed),
    requiresReconciliation: !!(raw?.requiresReconciliation ?? raw?.RequiresReconciliation),
    reasonCode: raw?.reasonCode ?? raw?.ReasonCode ?? null,

    topic: String(raw?.topic ?? raw?.Topic ?? ''),
    payload: String(raw?.payload ?? raw?.Payload ?? ''),
  };
}

export function isTerminalGateOperationStatus(status: GateOperationStatus): boolean {
  return status === 'Completed' || status === 'Failed';
}

export function isUnresolvedGateOperationStatus(status: GateOperationStatus): boolean {
  return (
    status === 'Pending' ||
    status === 'Published' ||
    status === 'Acknowledged' ||
    status === 'TimedOut' ||
    status === 'Unknown'
  );
}

export function isInFlightGateOperationStatus(status: GateOperationStatus): boolean {
  return status === 'Pending' || status === 'Published' || status === 'Acknowledged';
}

export function isUncertainGateOutcome(status: GateOperationStatus): boolean {
  return status === 'TimedOut' || status === 'Unknown';
}

export function isCompletedExitOperation(op: GateOperationResponse | null | undefined): boolean {
  return !!op && op.operationType === 'Exit' && op.status === 'Completed' && op.archived;
}

export function isCompletedEntryOperation(op: GateOperationResponse | null | undefined): boolean {
  return !!op && op.operationType === 'Entry' && op.status === 'Completed';
}

export function shouldAcceptIncomingOperationState(
  existing: GateOperationResponse | undefined,
  incoming: GateOperationResponse,
  isAuthoritativeRest: boolean = false,
): boolean {
  if (!existing) return true;
  if (isAuthoritativeRest) return true;
  if (existing.operationId !== incoming.operationId) return true;

  const existingRank = STATUS_PROGRESSION_RANK[existing.status] ?? 0;
  const incomingRank = STATUS_PROGRESSION_RANK[incoming.status] ?? 0;

  if (existing.status === 'Completed' && incoming.status !== 'Completed') {
    return false;
  }

  return incomingRank >= existingRank;
}
