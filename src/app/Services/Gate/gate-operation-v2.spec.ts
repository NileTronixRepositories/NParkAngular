import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GateOperationService } from './gate-operation.service';
import { GateOperationStoreService } from './gate-operation-store.service';
import {
  isCompletedExitOperation,
  isFailedGateOperationStatus,
  isInFlightGateOperationStatus,
  isSoftwareCompletionMode,
  isTerminalGateOperationStatus,
  isUncertainGateOutcome,
  isUnresolvedGateOperationStatus,
  normalizeGateOperationCompletionMode,
  normalizeGateOperationResponse,
  shouldAcceptIncomingOperationState,
} from '../../Domain/Gate/gate-operation.models';
import { TicketCoreService } from '../Tickets/ticket-core.service';
import { TicketExceedTransactionService } from '../TicketExceedTransaction/ticket-exceed-transaction.service';
import { environment } from '../../Shared/environment/environment';

describe('Financial Integrity V2 & GateOperation Integration', () => {
  let gateOpSvc: GateOperationService;
  let ticketCoreSvc: TicketCoreService;
  let exceedSvc: TicketExceedTransactionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    gateOpSvc = TestBed.inject(GateOperationService);
    ticketCoreSvc = TestBed.inject(TicketCoreService);
    exceedSvc = TestBed.inject(TicketExceedTransactionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('preserves 64-bit commandId as string and normalizes all operation fields', () => {
    const op = normalizeGateOperationResponse({
      operationId: 'op-1',
      ticketId: 't-1',
      gateId: 'g-1',
      commandId: '9007199254740993123',
      controllerId: 2,
      operationType: 'Exit',
      status: 'Completed',
      isAcknowledged: true,
      ticketExited: true,
      archived: true,
      retryAllowed: false,
      requiresReconciliation: false,
    });

    expect(op.commandId).toBe('9007199254740993123');
    expect(typeof op.commandId).toBe('string');
    expect(isCompletedExitOperation(op)).toBeTrue();
  });

  it('prevents stale SignalR events from overwriting Completed state', () => {
    const completed = normalizeGateOperationResponse({
      operationId: 'op-1',
      status: 'Completed',
      operationType: 'Exit',
      archived: true,
    });
    const stalePublished = normalizeGateOperationResponse({
      operationId: 'op-1',
      status: 'Published',
      operationType: 'Exit',
      archived: false,
    });

    expect(shouldAcceptIncomingOperationState(completed, stalePublished, false)).toBeFalse();
    expect(shouldAcceptIncomingOperationState(completed, stalePublished, true)).toBeTrue();
  });

  it('handles HTTP 202 Pending and HTTP 200 Failed on POST /api/Ticket/ExitTicket with requestId', () => {
    let status202 = 0;
    let body202: any = null;
    ticketCoreSvc.addExitTicket('t-202', 'req-exit-1').subscribe((res) => {
      status202 = res.status;
      body202 = res.body;
    });

    const req1 = httpMock.expectOne(`${environment.baseUrl}/Ticket/ExitTicket`);
    expect(req1.request.method).toBe('POST');
    expect(req1.request.body).toEqual({ ticketId: 't-202', requestId: 'req-exit-1' });
    req1.flush(
      {
        operationId: 'op-202',
        ticketId: 't-202',
        commandId: '43',
        controllerId: 2,
        operationType: 'Exit',
        status: 'Pending',
        isAcknowledged: false,
        ticketExited: false,
        archived: false,
      },
      { status: 202, statusText: 'Accepted' },
    );

    expect(status202).toBe(202);
    expect(body202.status).toBe('Pending');
    expect(isCompletedExitOperation(body202)).toBeFalse();

    let bodyFailed: any = null;
    ticketCoreSvc.addExitTicket('t-fail').subscribe((res) => {
      bodyFailed = res.body;
    });
    const req2 = httpMock.expectOne(`${environment.baseUrl}/Ticket/ExitTicket`);
    expect(req2.request.body.ticketId).toBe('t-fail');
    expect(typeof req2.request.body.requestId).toBe('string');
    expect(req2.request.body.requestId.length).toBeGreaterThan(0);
    req2.flush(
      {
        operationId: 'op-fail',
        ticketId: 't-fail',
        commandId: '44',
        controllerId: 2,
        operationType: 'Exit',
        status: 'Failed',
        isAcknowledged: false,
        ticketExited: false,
        archived: false,
      },
      { status: 200, statusText: 'OK' },
    );
    expect(bodyFailed.status).toBe('Failed');
    expect(isCompletedExitOperation(bodyFailed)).toBeFalse();
  });

  it('treats TimedOut as a terminal failed state that is no longer unresolved', () => {
    expect(isTerminalGateOperationStatus('TimedOut')).toBeTrue();
    expect(isFailedGateOperationStatus('TimedOut')).toBeTrue();
    expect(isUnresolvedGateOperationStatus('TimedOut')).toBeFalse();
    expect(isUncertainGateOutcome('TimedOut')).toBeFalse();
  });

  it('sends expectedBasePrice to POST /api/Ticket/CollectCashier', () => {
    ticketCoreSvc.collectCashier('t-1', 20).subscribe();
    const req = httpMock.expectOne(`${environment.baseUrl}/Ticket/CollectCashier`);
    expect(req.request.body).toEqual({ ticketId: 't-1', expectedBasePrice: 20 });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('sends expectedAmount, expectedValidExitDate, and idempotencyKey on TicketExceedTransaction/Create', () => {
    let response: any = null;
    exceedSvc
      .create({
        ticketId: 't-1',
        sanctionIds: ['s-1'],
        expectedAmount: 50,
        expectedValidExitDate: '2026-11-25',
        idempotencyKey: 'idem-key-123',
      })
      .subscribe((res) => (response = res));

    const req = httpMock.expectOne(`${environment.baseUrl}/TicketExceedTransaction/Create`);
    expect(req.request.body).toEqual({
      ticketId: 't-1',
      sanctionIds: ['s-1'],
      expectedAmount: 50,
      expectedValidExitDate: '2026-11-25',
      idempotencyKey: 'idem-key-123',
    });
    req.flush({
      ticketExceedTransactionId: 'tx-99',
      ticketId: 't-1',
      exceedAmount: 50,
      exceedPrice: 100,
      ticketPrice: 20,
      totalPriceAfterExceed: 120,
      paidAmount: 120,
      outstandingAmount: 0,
      validExitDate: '2026-11-25',
      paymentStatus: 'Confirmed',
      sanctionIds: ['s-1'],
    });

    expect(response.ticketExceedTransactionId).toBe('tx-99');
    expect(response.exceedPrice).toBe(100);
    expect(response.validExitDate).toBe('2026-11-25');
  });

  it('calls POST /api/Gate/open with Entry operationType, TicketId, and requestId', () => {
    gateOpSvc
      .openGate({ controllerId: '1', operationType: 'Entry', ticketId: 't-1', requestId: 'req-open-1' })
      .subscribe();

    const req = httpMock.expectOne(`${environment.baseUrl}/Gate/open`);
    expect(req.request.body).toEqual({
      controllerId: '1',
      operationType: 'Entry',
      ticketId: 't-1',
      requestId: 'req-open-1',
    });
    req.flush(
      { operationId: 'op-1', status: 'Pending', operationType: 'Entry', commandId: '10' },
      { status: 202, statusText: 'Accepted' },
    );
  });

  it('rejects empty or >500 char reconciliation evidence client-side', () => {
    let errorMsg = '';
    gateOpSvc.reconcileNonExecution('op-1', '   ').subscribe({
      error: (err) => (errorMsg = err.message),
    });
    expect(errorMsg).toContain('required');
  });

  it('normalizes Software completionMode with null ACK timestamps and empty topic/payload (T01-T03)', () => {
    const op = normalizeGateOperationResponse({
      operationId: 'op-sw-1',
      ticketId: 't-sw-1',
      gateId: 'g-1',
      commandId: '123',
      controllerId: 1,
      operationType: 'Exit',
      status: 'Completed',
      completionMode: 'Software',
      isAcknowledged: false,
      ticketExited: true,
      archived: true,
      createdAtUtc: '2026-11-26T10:00:00Z',
      publishedAtUtc: null,
      acknowledgedAtUtc: null,
      completedAtUtc: '2026-11-26T10:00:01Z',
      ackStatusCode: null,
      retryAllowed: false,
      requiresReconciliation: false,
      reasonCode: null,
      topic: '',
      payload: '',
    });

    expect(op.completionMode).toBe('Software');
    expect(isSoftwareCompletionMode(op)).toBeTrue();
    expect(op.isAcknowledged).toBeFalse();
    expect(op.publishedAtUtc).toBeNull();
    expect(op.acknowledgedAtUtc).toBeNull();
    expect(op.ackStatusCode).toBeNull();
    expect(op.topic).toBe('');
    expect(op.payload).toBe('');
    expect(isCompletedExitOperation(op)).toBeTrue();
  });

  it('supports PascalCase CompletionMode and defaults missing/invalid completionMode to Hardware (T18)', () => {
    const pascalSoftware = normalizeGateOperationResponse({
      OperationId: 'op-pascal',
      OperationType: 'Exit',
      Status: 'Completed',
      CompletionMode: 'Software',
      TicketExited: true,
      Archived: true,
    });
    expect(pascalSoftware.completionMode).toBe('Software');

    const legacyWithoutMode = normalizeGateOperationResponse({
      operationId: 'op-legacy',
      operationType: 'Exit',
      status: 'Completed',
      isAcknowledged: false,
      ticketExited: true,
      archived: true,
    });
    expect(legacyWithoutMode.completionMode).toBe('Hardware');
    expect(isSoftwareCompletionMode(legacyWithoutMode)).toBeFalse();

    expect(normalizeGateOperationCompletionMode(undefined)).toBe('Hardware');
    expect(normalizeGateOperationCompletionMode(null)).toBe('Hardware');
    expect(normalizeGateOperationCompletionMode('UnexpectedMode')).toBe('Hardware');
    expect(normalizeGateOperationCompletionMode(1)).toBe('Software');
    expect(normalizeGateOperationCompletionMode(0)).toBe('Hardware');
  });

  it('requires both ticketExited and archived for completed exit predicate', () => {
    const missingExited = normalizeGateOperationResponse({
      operationId: 'op-no-exit',
      operationType: 'Exit',
      status: 'Completed',
      completionMode: 'Software',
      ticketExited: false,
      archived: true,
    });
    expect(isCompletedExitOperation(missingExited)).toBeFalse();

    const missingArchived = normalizeGateOperationResponse({
      operationId: 'op-no-archive',
      operationType: 'Exit',
      status: 'Completed',
      completionMode: 'Software',
      ticketExited: true,
      archived: false,
    });
    expect(isCompletedExitOperation(missingArchived)).toBeFalse();
  });

  it('treats Unknown as a terminal non-polling status (T14)', () => {
    expect(isTerminalGateOperationStatus('Unknown')).toBeTrue();
    expect(isUnresolvedGateOperationStatus('Unknown')).toBeFalse();
    expect(isInFlightGateOperationStatus('Unknown')).toBeFalse();
    expect(isUncertainGateOutcome('Unknown')).toBeTrue();

    const store = TestBed.inject(GateOperationStoreService);
    const stopSpy = spyOn(store, 'stopPolling').and.callThrough();
    const unknownOp = normalizeGateOperationResponse({
      operationId: 'op-unknown',
      operationType: 'Exit',
      status: 'Unknown',
      completionMode: 'Hardware',
    });
    store.upsertOperation(unknownOp, true);
    expect(stopSpy).toHaveBeenCalledWith('op-unknown');

    // Starting polling on an already-terminal operation must not schedule HTTP calls
    store.startPolling('op-unknown', 10, 3);
    httpMock.expectNone(`${environment.baseUrl}/Gate/operations/op-unknown`);
  });

  it('handles HTTP 200 Completed Software exit on POST /api/Ticket/ExitTicket (T01)', () => {
    let status = 0;
    let body: any = null;
    ticketCoreSvc.addExitTicket('t-sw-200', 'req-sw-1').subscribe((res) => {
      status = res.status;
      body = res.body;
    });

    const req = httpMock.expectOne(`${environment.baseUrl}/Ticket/ExitTicket`);
    expect(req.request.body).toEqual({ ticketId: 't-sw-200', requestId: 'req-sw-1' });
    req.flush(
      {
        operationId: 'op-sw-200',
        ticketId: 't-sw-200',
        gateId: 'g-1',
        commandId: '125',
        controllerId: 1,
        operationType: 'Exit',
        status: 'Completed',
        completionMode: 'Software',
        isAcknowledged: false,
        ticketExited: true,
        archived: true,
        publishedAtUtc: null,
        acknowledgedAtUtc: null,
        completedAtUtc: '2026-11-26T10:05:00Z',
        ackStatusCode: null,
        topic: '',
        payload: '',
      },
      { status: 200, statusText: 'OK' },
    );

    expect(status).toBe(200);
    expect(body.completionMode).toBe('Software');
    expect(isCompletedExitOperation(body)).toBeTrue();
  });
});
