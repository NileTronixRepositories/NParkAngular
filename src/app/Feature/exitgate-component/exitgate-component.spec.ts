import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';

import { ExitgateComponent } from './exitgate-component';
import { EXITGATE_I18N } from './exitgate.i18n';
import { ExitValidationBlockComponent } from './exit-validation-block-component/exit-validation-block-component';
import {
  GateOperationResponse,
  normalizeGateOperationResponse,
} from '../../Domain/Gate/gate-operation.models';
import { TicketsServices } from '../../Services/Tickets/tickets-services';
import { GateServices } from '../../Services/Gate/gate-services';
import { GatePeripheralFacade } from '../../Services/Gate/gate-peripheral.facade';
import { AuthService } from '../../Services/Auth/auth-service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { NfcReaderService } from '../../Services/registration/nfc-reader.service';
import { ExitTourService } from '../../Services/Exit/exit-tour.service';
import { DashboardHubService } from '../../Services/OverView/dashboard-hub.service';
import { ScanHubService } from '../../Services/Gate/scan-hub.service';
import { ScannerAttachmentService } from '../../Services/Gate/scanner-attachment.service';
import {
  LprSignalRService,
  MqttCaptureDetectedEvent,
} from '../../Services/Gate/lpr-signalr.service';
import { SanctionService } from '../../Services/Sanction/sanction.service';
import { TicketExceedTransactionService } from '../../Services/TicketExceedTransaction/ticket-exceed-transaction.service';
import { LocalPrintService } from '../../Services/Print/local-print.service';
import { TicketPrintService } from '../../Services/Print/ticket-print.service';
import { GateOperationService } from '../../Services/Gate/gate-operation.service';
import { GateOperationStoreService } from '../../Services/Gate/gate-operation-store.service';
import { LocalHealthService } from '../../Services/Gate/local-health.service';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT } from '../../Services/i18n/i18n.tokens';
import { TicketExitedNotification } from '../../Domain/OverView/dashboard-notifications.model';

describe('ExitgateComponent (Software & Hardware Exit Modes)', () => {
  let component: ExitgateComponent;
  let fixture: ComponentFixture<ExitgateComponent>;

  let ticketExitedSubject: Subject<TicketExitedNotification>;
  let mqttCaptureSubject: Subject<MqttCaptureDetectedEvent>;
  let operationUpdatesSubject: Subject<GateOperationResponse>;

  let ticketsSvcSpy: jasmine.SpyObj<TicketsServices>;
  let gateSvcSpy: jasmine.SpyObj<GateServices>;
  let toastSpy: jasmine.SpyObj<ToastServices>;
  let gateOpStoreSpy: jasmine.SpyObj<GateOperationStoreService>;
  let gateOpSvcSpy: jasmine.SpyObj<GateOperationService>;
  let langSvc: LanguageService;

  const makeOp = (overrides: Partial<GateOperationResponse> = {}): GateOperationResponse =>
    normalizeGateOperationResponse({
      operationId: 'op-1',
      ticketId: 'ticket-1',
      gateId: 'gate-1',
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
      ...overrides,
    });

  beforeEach(async () => {
    ticketExitedSubject = new Subject<TicketExitedNotification>();
    mqttCaptureSubject = new Subject<MqttCaptureDetectedEvent>();
    operationUpdatesSubject = new Subject<GateOperationResponse>();

    ticketsSvcSpy = jasmine.createSpyObj<TicketsServices>('TicketsServices', [
      'getTicketsForExit',
      'validateExitByText',
      'addExitTicket',
      'collectCashier',
      'calculateTicketSalary',
      'searchTickets',
      'searchTicketLookup',
    ]);
    ticketsSvcSpy.getTicketsForExit.and.returnValue(of({ items: [], totalPrice: 0 } as any));
    ticketsSvcSpy.searchTicketLookup.and.returnValue(of([]));

    gateSvcSpy = jasmine.createSpyObj<GateServices>('GateServices', [
      'getAll',
      'getGateConnectionInfo',
      'getSnapshot',
      'openGate',
    ]);
    gateSvcSpy.getAll.and.returnValue(of([]));
    gateSvcSpy.getGateConnectionInfo.and.returnValue(
      of({
        gateId: 'gate-1',
        controlIp: '1',
        hasQrPrinterName: false,
        hasReceiptPrinterName: false,
        onvifCameraSetting: null,
      }),
    );

    toastSpy = jasmine.createSpyObj<ToastServices>('ToastServices', [
      'success',
      'warn',
      'error',
      'fromProblem',
    ]);

    gateOpStoreSpy = jasmine.createSpyObj<GateOperationStoreService>(
      'GateOperationStoreService',
      ['upsertOperation', 'startPolling', 'stopPolling', 'refreshOperation', 'recoverForGate'],
      {
        operationUpdates$: operationUpdatesSubject.asObservable(),
        operations$: new BehaviorSubject<GateOperationResponse[]>([]).asObservable(),
      },
    );
    gateOpStoreSpy.upsertOperation.and.callFake((op) => op);
    gateOpStoreSpy.recoverForGate.and.returnValue(of([]));

    gateOpSvcSpy = jasmine.createSpyObj<GateOperationService>('GateOperationService', [
      'openGate',
      'getOperation',
      'listOperations',
    ]);

    await TestBed.configureTestingModule({
      imports: [ExitgateComponent],
      providers: [
        { provide: I18N_DICT, useValue: EXITGATE_I18N },
        { provide: TicketsServices, useValue: ticketsSvcSpy },
        { provide: GateServices, useValue: gateSvcSpy },
        GatePeripheralFacade,
        {
          provide: AuthService,
          useValue: {
            token: 'test-token',
            isSupervisor: false,
            isLoggedIn: () => true,
            getGateId: () => 'gate-1',
            getGateData: () => ({ gateId: 'gate-1', gateNumber: 2, hasPc: true, hasLpr: false }),
          },
        },
        { provide: ToastServices, useValue: toastSpy },
        { provide: NfcReaderService, useValue: { readUID: () => Promise.resolve('') } },
        { provide: ExitTourService, useValue: { startTour: () => {}, cancelTour: () => {} } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        {
          provide: DashboardHubService,
          useValue: {
            start: () => Promise.resolve(),
            stop: () => Promise.resolve(),
            ticketExited$: ticketExitedSubject.asObservable(),
          },
        },
        {
          provide: ScanHubService,
          useValue: {
            start: () => Promise.resolve(),
            stop: () => Promise.resolve(),
            joinStation: () => {},
            scan$: new Subject().asObservable(),
          },
        },
        {
          provide: ScannerAttachmentService,
          useValue: { revokeUrl: () => {} },
        },
        {
          provide: LprSignalRService,
          useValue: {
            start: () => Promise.resolve(),
            stop: () => Promise.resolve(),
            vehicleDetected$: new Subject().asObservable(),
            mqttCaptureDetected$: mqttCaptureSubject.asObservable(),
          },
        },
        { provide: SanctionService, useValue: { getAll: () => of([]) } },
        {
          provide: TicketExceedTransactionService,
          useValue: {
            create: () => of(),
            generateIdempotencyKey: () => 'idem-1',
          },
        },
        { provide: LocalPrintService, useValue: { printHtml: () => of() } },
        { provide: TicketPrintService, useValue: { normalizeQrImage: () => null } },
        { provide: GateOperationService, useValue: gateOpSvcSpy },
        { provide: GateOperationStoreService, useValue: gateOpStoreSpy },
        { provide: LocalHealthService, useValue: { checkPcHealth: () => of(true) } },
      ],
    }).compileComponents();

    langSvc = TestBed.inject(LanguageService);
    langSvc.set('en');

    fixture = TestBed.createComponent(ExitgateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    ticketsSvcSpy.getTicketsForExit.calls.reset();
    toastSpy.success.calls.reset();
    toastSpy.warn.calls.reset();
    toastSpy.error.calls.reset();
  });

  it('completes Software exit on HTTP 200 without ACK, stops polling, refreshes lists, and restores focus (T01-T03, T23)', () => {
    const swOp = makeOp({
      operationId: 'op-sw-1',
      ticketId: 'ticket-sw-1',
      status: 'Completed',
      completionMode: 'Software',
      isAcknowledged: false,
      ticketExited: true,
      archived: true,
      topic: '',
      payload: '',
    });

    ticketsSvcSpy.validateExitByText.and.returnValue(
      of({
        isValidForExit: true,
        ticketId: 'ticket-sw-1',
        ticketNumber: 'T-100',
      } as any),
    );
    ticketsSvcSpy.addExitTicket.and.returnValue(
      of(new HttpResponse({ status: 200, body: swOp })),
    );

    const initialFocusNonce = component.focusValidationTextNonce;
    const initialSanctionsNonce = component.sanctionsTicketsRefreshNonce;

    component.onValidateExitByText('QR-100');

    expect(ticketsSvcSpy.addExitTicket).toHaveBeenCalledTimes(1);
    expect(gateSvcSpy.openGate).not.toHaveBeenCalled();
    expect(gateOpSvcSpy.openGate).not.toHaveBeenCalled();
    expect(gateOpStoreSpy.startPolling).not.toHaveBeenCalled();
    expect(gateOpStoreSpy.stopPolling).toHaveBeenCalledWith('op-sw-1');
    expect(component.validationOpenGateError).toBeNull();
    expect(component.validationMessage).toBe('Exit recorded successfully');
    expect(toastSpy.success).toHaveBeenCalledWith('Exit recorded successfully');
    expect(ticketsSvcSpy.getTicketsForExit).toHaveBeenCalledTimes(1);
    expect(component.sanctionsTicketsRefreshNonce).toBe(initialSanctionsNonce + 1);
    expect(component.focusValidationTextNonce).toBeGreaterThan(initialFocusNonce);
  });

  it('starts polling for Hardware exit HTTP 202 Pending and completes on SignalR update (T04, T05, T21)', () => {
    const hwPending = makeOp({
      operationId: 'op-hw-1',
      ticketId: 'ticket-hw-1',
      status: 'Pending',
      completionMode: 'Hardware',
      ticketExited: false,
      archived: false,
    });
    const hwCompleted = makeOp({
      operationId: 'op-hw-1',
      ticketId: 'ticket-hw-1',
      status: 'Completed',
      completionMode: 'Hardware',
      isAcknowledged: true,
      ticketExited: true,
      archived: true,
    });

    ticketsSvcSpy.validateExitByText.and.returnValue(
      of({ isValidForExit: true, ticketId: 'ticket-hw-1' } as any),
    );
    ticketsSvcSpy.addExitTicket.and.returnValue(
      of(new HttpResponse({ status: 202, body: hwPending })),
    );

    component.onValidateExitByText('QR-HW');

    expect(gateOpStoreSpy.startPolling).toHaveBeenCalledWith('op-hw-1');
    expect(component.validationMessage).toBe('Waiting for Gate Confirmation');
    expect(toastSpy.success).not.toHaveBeenCalled();

    operationUpdatesSubject.next(hwCompleted);

    expect(gateOpStoreSpy.stopPolling).toHaveBeenCalledWith('op-hw-1');
    expect(component.validationMessage).toBe('Exit recorded successfully');
    expect(toastSpy.success).toHaveBeenCalledTimes(1);
    expect(ticketsSvcSpy.getTicketsForExit).toHaveBeenCalledTimes(1);
  });

  it('displays failure on HTTP 200 with Failed status (T06)', () => {
    const failedOp = makeOp({
      operationId: 'op-fail-1',
      ticketId: 'ticket-fail-1',
      status: 'Failed',
      completionMode: 'Software',
      ticketExited: false,
      archived: false,
    });

    ticketsSvcSpy.validateExitByText.and.returnValue(
      of({ isValidForExit: true, ticketId: 'ticket-fail-1' } as any),
    );
    ticketsSvcSpy.addExitTicket.and.returnValue(
      of(new HttpResponse({ status: 200, body: failedOp })),
    );

    component.onValidateExitByText('QR-FAIL');

    expect(gateOpStoreSpy.stopPolling).toHaveBeenCalledWith('op-fail-1');
    expect(toastSpy.success).not.toHaveBeenCalled();
    expect(toastSpy.error).toHaveBeenCalledWith('Failed to complete exit');
    expect(component.validationOpenGateError).toBe('Failed to complete exit');
  });

  it('handles MQTT QR Software exit with gateOpened=false and ticketExited=true without calling ExitTicket again (T09, T10)', () => {
    const swOp = makeOp({
      operationId: 'op-mqtt-1',
      ticketId: 'ticket-mqtt-1',
      status: 'Completed',
      completionMode: 'Software',
      isAcknowledged: false,
      ticketExited: true,
      archived: true,
      topic: '',
      payload: '',
    });
    gateOpStoreSpy.refreshOperation.and.returnValue(of(swOp));

    mqttCaptureSubject.next({
      deviceId: '1',
      captureId: true,
      operationId: 'op-mqtt-1',
      operationStatus: 'Completed',
      ticketId: 'ticket-mqtt-1',
      isValidForExit: true,
      ticketExited: true,
      gateOpened: false,
      workflowSucceeded: true,
      openGateTopic: '',
      openGatePayload: '',
    });

    expect(gateOpStoreSpy.refreshOperation).toHaveBeenCalledWith('op-mqtt-1');
    expect(ticketsSvcSpy.addExitTicket).not.toHaveBeenCalled();
    expect(gateSvcSpy.openGate).not.toHaveBeenCalled();
    expect(toastSpy.success).toHaveBeenCalledTimes(1);
    expect(toastSpy.error).not.toHaveBeenCalled();
    expect(ticketsSvcSpy.getTicketsForExit).toHaveBeenCalledTimes(1);
  });

  it('deduplicates SignalR GateOperationStatusChanged, TicketExited, and REST completion events (T11, T12)', () => {
    const swOp = makeOp({
      operationId: 'op-dedup-1',
      ticketId: 'ticket-dedup-1',
      status: 'Completed',
      completionMode: 'Software',
      ticketExited: true,
      archived: true,
    });

    // SignalR arrives before REST response
    component.textValidationResult = { isValidForExit: true, ticketId: 'ticket-dedup-1' } as any;
    operationUpdatesSubject.next(swOp);
    operationUpdatesSubject.next(swOp);
    ticketExitedSubject.next({
      ticketId: 'ticket-dedup-1' as any,
      gateId: 'gate-1',
      gateNumber: 2,
      exitDate: '2026-11-26T10:00:01Z',
      hour: 10,
      price: 20,
    });

    // Subsequent REST completion for the same operation
    ticketsSvcSpy.addExitTicket.and.returnValue(
      of(new HttpResponse({ status: 200, body: swOp })),
    );
    component.addExitTicket({ id: 'ticket-dedup-1' } as any);

    expect(toastSpy.success).toHaveBeenCalledTimes(1);
    expect(ticketsSvcSpy.getTicketsForExit).toHaveBeenCalledTimes(1);
  });

  it('handles GateExitMqttDisabled as terminal failure and retries with fresh requestId without repaying (T13, T15)', () => {
    const canceledOp = makeOp({
      operationId: 'op-canceled-1',
      ticketId: 'ticket-retry-1',
      status: 'Failed',
      completionMode: 'Hardware',
      reasonCode: 'GateExitMqttDisabled',
      ticketExited: false,
      archived: false,
    });
    const retryCompletedOp = makeOp({
      operationId: 'op-retry-2',
      ticketId: 'ticket-retry-1',
      status: 'Completed',
      completionMode: 'Software',
      ticketExited: true,
      archived: true,
    });

    ticketsSvcSpy.addExitTicket.and.returnValues(
      of(new HttpResponse({ status: 200, body: canceledOp })),
      of(new HttpResponse({ status: 200, body: retryCompletedOp })),
    );

    component.addExitTicket({ id: 'ticket-retry-1' } as any);

    expect(gateOpStoreSpy.stopPolling).toHaveBeenCalledWith('op-canceled-1');
    expect(component.validationOpenGateError).toBe(
      'The previous hardware exit operation was canceled. Please retry the exit.',
    );

    component.onRetryExitGateOperation('op-canceled-1');

    expect(ticketsSvcSpy.collectCashier).not.toHaveBeenCalled();
    expect(ticketsSvcSpy.addExitTicket).toHaveBeenCalledTimes(2);
    const firstReqId = ticketsSvcSpy.addExitTicket.calls.argsFor(0)[1];
    const secondReqId = ticketsSvcSpy.addExitTicket.calls.argsFor(1)[1];
    expect(firstReqId).toBeTruthy();
    expect(secondReqId).toBeTruthy();
    expect(secondReqId).not.toEqual(firstReqId);
    expect(component.validationMessage).toBe('Exit recorded successfully');
  });

  it('stops polling on Unknown terminal operation and preserves gate config validation (T07, T08, T14)', () => {
    const unknownOp = makeOp({
      operationId: 'op-unk-1',
      ticketId: 'ticket-unk-1',
      status: 'Unknown',
      completionMode: 'Hardware',
      ticketExited: false,
      archived: false,
    });

    ticketsSvcSpy.addExitTicket.and.returnValue(
      of(new HttpResponse({ status: 200, body: unknownOp })),
    );

    component.addExitTicket({ id: 'ticket-unk-1' } as any);
    expect(gateOpStoreSpy.stopPolling).toHaveBeenCalledWith('op-unk-1');
    expect(toastSpy.warn).toHaveBeenCalled();

    // Missing controller mapping blocks validation (T08)
    component.gateConnectionInfo = {
      gateId: 'gate-1',
      controlIp: '',
      hasQrPrinterName: false,
      hasReceiptPrinterName: false,
    };
    expect(component.isExitGateConnectionReady).toBeFalse();
    component.onValidateExitByText('QR-BLOCKED');
    expect(ticketsSvcSpy.validateExitByText).not.toHaveBeenCalled();
  });

  it('blocks exit for unpaid ticket and requires fee collection (T17)', () => {
    ticketsSvcSpy.validateExitByText.and.returnValue(
      of({
        isValidForExit: false,
        ticketId: 'ticket-unpaid',
        reasonCode: 'BasePaymentRequired',
        requiresBasePayment: true,
      } as any),
    );
    ticketsSvcSpy.calculateTicketSalary.and.returnValue(
      of({
        ticketId: 'ticket-unpaid',
        basePrice: 25,
        totalSalary: 25,
        isCollectByCashier: false,
      } as any),
    );

    component.onValidateExitByText('QR-UNPAID');

    expect(ticketsSvcSpy.addExitTicket).not.toHaveBeenCalled();
    expect(component.validationAwaitingCollection).toBeTrue();
    expect(component.validationMessage).toBe('Awaiting exit fee collection');
  });

  it('provides required Arabic and English exit translations and validation block labels (T19, T20)', () => {
    expect(EXITGATE_I18N.en['collect_and_open_gate']).toBe('Confirm Collection & Complete Exit');
    expect(EXITGATE_I18N.en['awaiting_exit_collection']).toBe('Awaiting exit fee collection');
    expect(EXITGATE_I18N.en['validate_open_gate']).toBe('Validate & Complete Exit');
    expect(EXITGATE_I18N.en['open_gate']).toBe('Confirm Exit');
    expect(EXITGATE_I18N.en['opening_gate']).toBe('Recording exit...');
    expect(EXITGATE_I18N.en['waiting_gate_confirmation']).toBe('Processing exit...');
    expect(EXITGATE_I18N.en['gate_opened_successfully']).toBe('Exit recorded successfully');
    expect(EXITGATE_I18N.en['open_gate_failed']).toBe('Failed to complete exit');
    expect(EXITGATE_I18N.en['gate_exit_mqtt_disabled']).toBe(
      'The previous hardware exit operation was canceled. Please retry the exit.',
    );

    expect(EXITGATE_I18N.ar['collect_and_open_gate']).toBe('تأكيد التحصيل وتسجيل الخروج');
    expect(EXITGATE_I18N.ar['awaiting_exit_collection']).toBe('في انتظار تحصيل رسوم الخروج');
    expect(EXITGATE_I18N.ar['validate_open_gate']).toBe('تحقق وسجل الخروج');
    expect(EXITGATE_I18N.ar['open_gate']).toBe('تأكيد الخروج');
    expect(EXITGATE_I18N.ar['opening_gate']).toBe('جاري تسجيل الخروج...');
    expect(EXITGATE_I18N.ar['waiting_gate_confirmation']).toBe('جاري تنفيذ عملية الخروج');
    expect(EXITGATE_I18N.ar['gate_opened_successfully']).toBe('تم تسجيل الخروج بنجاح');
    expect(EXITGATE_I18N.ar['open_gate_failed']).toBe('تعذر تسجيل الخروج');
    expect(EXITGATE_I18N.ar['gate_exit_mqtt_disabled']).toBe(
      'تم إلغاء عملية الخروج السابقة الخاصة بالبوابة. يرجى إعادة محاولة تسجيل الخروج.',
    );

    const validationFixture = TestBed.createComponent(ExitValidationBlockComponent);
    const validationCmp = validationFixture.componentInstance;

    validationCmp.activeOperation = makeOp({
      status: 'Failed',
      reasonCode: 'GateExitMqttDisabled',
      completionMode: 'Hardware',
    });
    expect(validationCmp.operationStatusLabelKey).toBe('gate_exit_mqtt_disabled');
    expect(validationCmp.canRetryNewExit).toBeTrue();

    validationCmp.activeOperation = makeOp({
      status: 'Unknown',
      completionMode: 'Hardware',
    });
    expect(validationCmp.operationStatusLabelKey).toBe('gate_execution_unknown');
    expect(validationCmp.canRetryNewExit).toBeTrue();

    validationCmp.activeOperation = makeOp({
      status: 'Pending',
      completionMode: 'Hardware',
    });
    expect(validationCmp.operationStatusLabelKey).toBe('waiting_gate_confirmation_hardware');
  });
});
