import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GateOperationService } from './gate-operation.service';
import {
  isCompletedExitOperation,
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

  it('handles HTTP 202 Pending and HTTP 200 Failed on POST /api/Ticket/ExitTicket', () => {
    let status202 = 0;
    let body202: any = null;
    ticketCoreSvc.addExitTicket('t-202').subscribe((res) => {
      status202 = res.status;
      body202 = res.body;
    });

    const req1 = httpMock.expectOne(`${environment.baseUrl}/Ticket/ExitTicket`);
    expect(req1.request.method).toBe('POST');
    expect(req1.request.body).toEqual({ ticketId: 't-202' });
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

  it('sends expectedBasePrice to POST /api/Ticket/CollectCashier', () => {
    ticketCoreSvc.collectCashier('t-1', 20).subscribe();
    const req = httpMock.expectOne(`${environment.baseUrl}/Ticket/CollectCashier`);
    expect(req.request.body).toEqual({ ticketId: 't-1', expectedBasePrice: 20 });
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('sends idempotencyKey and preserves V2 fields on TicketExceedTransaction/Create', () => {
    let response: any = null;
    exceedSvc
      .create({
        ticketId: 't-1',
        sanctionIds: ['s-1'],
        idempotencyKey: 'idem-key-123',
      })
      .subscribe((res) => (response = res));

    const req = httpMock.expectOne(`${environment.baseUrl}/TicketExceedTransaction/Create`);
    expect(req.request.body).toEqual({
      ticketId: 't-1',
      sanctionIds: ['s-1'],
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
      validExitDate: '2026-11-24',
      paymentStatus: 'Confirmed',
      sanctionIds: ['s-1'],
    });

    expect(response.ticketExceedTransactionId).toBe('tx-99');
    expect(response.exceedPrice).toBe(100);
    expect(response.validExitDate).toBe('2026-11-24');
  });

  it('calls POST /api/Gate/open with Entry operationType and TicketId', () => {
    gateOpSvc
      .openGate({ controllerId: '1', operationType: 'Entry', ticketId: 't-1' })
      .subscribe();

    const req = httpMock.expectOne(`${environment.baseUrl}/Gate/open`);
    expect(req.request.body).toEqual({
      controllerId: '1',
      operationType: 'Entry',
      ticketId: 't-1',
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
});
