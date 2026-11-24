import { Injectable, OnDestroy, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  catchError,
  filter,
  interval,
  map,
  of,
  switchMap,
  takeWhile,
  tap,
} from 'rxjs';
import {
  GateOperationResponse,
  PersistedGateOperationRef,
  isInFlightGateOperationStatus,
  isTerminalGateOperationStatus,
  isUnresolvedGateOperationStatus,
  shouldAcceptIncomingOperationState,
} from '../../Domain/Gate/gate-operation.models';
import { DashboardHubService } from '../OverView/dashboard-hub.service';
import { GateOperationService } from './gate-operation.service';

const STORAGE_KEY = 'npark_active_gate_operations_v2';

@Injectable({ providedIn: 'root' })
export class GateOperationStoreService implements OnDestroy {
  private readonly api = inject(GateOperationService);
  private readonly hub = inject(DashboardHubService);

  private readonly operationsById = new Map<string, GateOperationResponse>();
  private readonly operationsSubject = new BehaviorSubject<GateOperationResponse[]>([]);
  private readonly operationUpdatesSubject = new BehaviorSubject<GateOperationResponse | null>(null);
  private readonly subscriptions = new Subscription();
  private readonly pollingSubs = new Map<string, Subscription>();

  readonly operations$: Observable<GateOperationResponse[]> =
    this.operationsSubject.asObservable();

  readonly operationUpdates$: Observable<GateOperationResponse> =
    this.operationUpdatesSubject.asObservable().pipe(
      filter((op): op is GateOperationResponse => op !== null),
    );

  constructor() {
    this.subscriptions.add(
      this.hub.gateOperationStatusChanged$.subscribe((op) => {
        this.upsertOperation(op, false);
      }),
    );

    this.subscriptions.add(
      this.hub.reconnected$.subscribe(() => {
        this.refreshAllUnresolved();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.stopAllPolling();
  }

  upsertOperation(op: GateOperationResponse, isAuthoritativeRest: boolean = true): GateOperationResponse {
    if (!op?.operationId) return op;

    const existing = this.operationsById.get(op.operationId);
    if (!shouldAcceptIncomingOperationState(existing, op, isAuthoritativeRest)) {
      return existing!;
    }

    this.operationsById.set(op.operationId, op);
    this.syncPersistedRef(op);
    this.emitSnapshot(op);

    if (isTerminalGateOperationStatus(op.status)) {
      this.stopPolling(op.operationId);
    }

    return op;
  }

  getById(operationId: string): GateOperationResponse | undefined {
    return this.operationsById.get(operationId);
  }

  getLatestForTicket(ticketId: string): GateOperationResponse | undefined {
    const target = String(ticketId).toLowerCase();
    let latest: GateOperationResponse | undefined;
    for (const op of this.operationsById.values()) {
      if (op.ticketId && String(op.ticketId).toLowerCase() === target) {
        if (!latest || op.createdAtUtc > latest.createdAtUtc) {
          latest = op;
        }
      }
    }
    return latest;
  }

  /**
   * Starts REST fallback polling for an in-flight operation.
   * Never converts a local poll cap into a confirmed failure — preserves last known backend status.
   */
  startPolling(operationId: string, intervalMs: number = 2000, maxAttempts: number = 20): void {
    if (!operationId) return;
    this.stopPolling(operationId);

    let attempts = 0;
    const sub = interval(intervalMs)
      .pipe(
        takeWhile(() => {
          const current = this.operationsById.get(operationId);
          if (current && !isInFlightGateOperationStatus(current.status)) {
            return false;
          }
          attempts++;
          return attempts <= maxAttempts;
        }),
        switchMap(() =>
          this.api.getOperation(operationId).pipe(
            map((res) => res.body),
            catchError(() => of(null)),
          ),
        ),
        filter((op): op is GateOperationResponse => op !== null),
        tap((op) => this.upsertOperation(op, true)),
      )
      .subscribe({
        complete: () => {
          this.pollingSubs.delete(operationId);
        },
      });

    this.pollingSubs.set(operationId, sub);
  }

  stopPolling(operationId: string): void {
    const sub = this.pollingSubs.get(operationId);
    if (sub) {
      sub.unsubscribe();
      this.pollingSubs.delete(operationId);
    }
  }

  stopAllPolling(): void {
    for (const sub of this.pollingSubs.values()) {
      sub.unsubscribe();
    }
    this.pollingSubs.clear();
  }

  refreshOperation(operationId: string): Observable<GateOperationResponse | null> {
    return this.api.getOperation(operationId).pipe(
      map((res) => (res.body ? this.upsertOperation(res.body, true) : null)),
      catchError(() => of(this.operationsById.get(operationId) ?? null)),
    );
  }

  recoverForGate(
    gateId: string,
    controllerId?: string | number | null,
    ticketId?: string | null,
  ): Observable<GateOperationResponse[]> {
    const persisted = this.readPersistedRefs().filter(
      (ref) => !gateId || String(ref.gateId).toLowerCase() === String(gateId).toLowerCase(),
    );

    return this.api
      .listOperations({
        ticketId: ticketId ?? undefined,
        controllerId: controllerId ?? undefined,
      })
      .pipe(
        map((ops) => {
          const merged: GateOperationResponse[] = [];
          for (const op of ops) {
            const updated = this.upsertOperation(op, true);
            merged.push(updated);
            if (isInFlightGateOperationStatus(updated.status)) {
              this.startPolling(updated.operationId);
            }
          }

          // Also refresh any persisted operation IDs not returned in the filtered list
          for (const ref of persisted) {
            if (!this.operationsById.has(ref.operationId) && isUnresolvedGateOperationStatus(ref.status)) {
              this.refreshOperation(ref.operationId).subscribe();
            }
          }

          return merged;
        }),
        catchError(() => of([])),
      );
  }

  refreshAllUnresolved(): void {
    const unresolvedIds = new Set<string>();

    for (const op of this.operationsById.values()) {
      if (isUnresolvedGateOperationStatus(op.status)) {
        unresolvedIds.add(op.operationId);
      }
    }

    for (const ref of this.readPersistedRefs()) {
      if (isUnresolvedGateOperationStatus(ref.status)) {
        unresolvedIds.add(ref.operationId);
      }
    }

    for (const opId of unresolvedIds) {
      this.refreshOperation(opId).subscribe();
    }
  }

  getPersistedRefsForGate(gateId: string): PersistedGateOperationRef[] {
    return this.readPersistedRefs().filter(
      (r) => String(r.gateId).toLowerCase() === String(gateId).toLowerCase(),
    );
  }

  clearPersistedOperation(operationId: string): void {
    const refs = this.readPersistedRefs().filter((r) => r.operationId !== operationId);
    this.writePersistedRefs(refs);
  }

  private emitSnapshot(updated: GateOperationResponse): void {
    this.operationsSubject.next(Array.from(this.operationsById.values()));
    this.operationUpdatesSubject.next(updated);
  }

  private syncPersistedRef(op: GateOperationResponse): void {
    const refs = this.readPersistedRefs().filter((r) => r.operationId !== op.operationId);

    if (isUnresolvedGateOperationStatus(op.status)) {
      refs.unshift({
        gateId: op.gateId,
        controllerId: op.controllerId,
        ticketId: op.ticketId,
        operationId: op.operationId,
        operationType: op.operationType,
        status: op.status,
        updatedAtUtc: new Date().toISOString(),
      });
    }

    this.writePersistedRefs(refs.slice(0, 20));
  }

  private readPersistedRefs(): PersistedGateOperationRef[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writePersistedRefs(refs: PersistedGateOperationRef[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
    } catch {
      // Ignore storage quota errors
    }
  }
}
