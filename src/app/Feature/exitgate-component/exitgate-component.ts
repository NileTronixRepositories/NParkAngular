import { Component, Inject, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  TicketDto,
  TicketAction,
  TicketDetailsDto,
  CollectDailyTicketsResponse,
  CalculateSalaryResponse,
  ScanTicketResponse,
  ValidateExitByVehicleNumberResponse,
  ValidateExitByTextResponse,
  SearchTicketResponse,
} from '../../Domain/tickets/tickets.model';
import { TicketsServices } from '../../Services/Tickets/tickets-services';

import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { EXITGATE_I18N } from './exitgate.i18n';
import {
  GateConnectionInfo,
  GateServices,
  OpenGateResponse,
} from '../../Services/Gate/gate-services';
import { GatePeripheralFacade } from '../../Services/Gate/gate-peripheral.facade';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType, GateDevicePeripheral, GateDto } from '../../Domain/Auth/auth.models';
import { LocalHealthService } from '../../Services/Gate/local-health.service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { NfcReaderService } from '../../Services/registration/nfc-reader.service';

import { ExitGateDevicesBlockComponent } from './exit-gate-devices-block-component/exit-gate-devices-block-component';
import { ExitSanctionsBlockComponent } from './exit-sanctions-block-component/exit-sanctions-block-component';
import { ExitTicketsTableBlockComponent } from './exit-tickets-table-block-component/exit-tickets-table-block-component';
import { ExitValidationBlockComponent } from './exit-validation-block-component/exit-validation-block-component';
import { SearchBlockComponent } from '../Shared/search-block-component/search-block-component';
import { ExitTourService } from '../../Services/Exit/exit-tour.service';

import { DashboardHubService } from '../../Services/OverView/dashboard-hub.service';
import { TicketExitedNotification } from '../../Domain/OverView/dashboard-notifications.model';
import { ScanHubService, ScanFileMessage } from '../../Services/Gate/scan-hub.service';
import { ScannerAttachmentService } from '../../Services/Gate/scanner-attachment.service';
import {
  LprSignalRService,
  LprVehicleDetectedEvent,
} from '../../Services/Gate/lpr-signalr.service';
import { SanctionService } from '../../Services/Sanction/sanction.service';
import { SanctionDto } from '../../Domain/Sanction/sanction.models';
import { TicketExceedTransactionService } from '../../Services/TicketExceedTransaction/ticket-exceed-transaction.service';
import {
  CollectExceedTransactionsResponse,
  CreateTicketExceedTransactionResponse,
} from '../../Domain/TicketExceedTransaction/ticket-exceed-transaction.models';
import { of, Subscription, timer } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { SupervisorModalBlockComponent } from '../Shared/supervisor-modal-block-component/supervisor-modal-block-component';
import { TicketDetailsModalBlockComponent } from '../Shared/ticket-details-modal-block-component/ticket-details-modal-block-component';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { LocalPrintService } from '../../Services/Print/local-print.service';
import { TicketPrintService } from '../../Services/Print/ticket-print.service';
import { environment } from '../../Shared/environment/environment';

type ExitToastLevel = 'success' | 'warn' | 'error';
type ExitFeedbackTarget = 'validation' | 'openGate' | 'supervisor';

@Component({
  selector: 'app-exitgate-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExitGateDevicesBlockComponent,
    ExitSanctionsBlockComponent,
    ExitTicketsTableBlockComponent,
    SearchBlockComponent,
    SupervisorModalBlockComponent,
    TicketDetailsModalBlockComponent,
    TranslatePipePipe,
    ExitValidationBlockComponent,
  ],
  templateUrl: './exitgate-component.html',
  styleUrls: ['./exitgate-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: EXITGATE_I18N,
    },
  ],
})
export class ExitgateComponent implements OnInit, OnDestroy {
  // ====== Injects ======
  private readonly svc = inject(TicketsServices);
  private readonly gateSvc = inject(GateServices);
  private readonly gatePeripheralFacade = inject(GatePeripheralFacade);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastServices);
  private readonly nfc = inject(NfcReaderService);
  private readonly exitTour = inject(ExitTourService);
  private readonly router = inject(Router);

  // NEW: SignalR Hub
  private readonly dashboardHub = inject(DashboardHubService);
  private readonly scanHub = inject(ScanHubService);
  private readonly scannerAttachment = inject(ScannerAttachmentService);
  private readonly lprSignalR = inject(LprSignalRService);
  private readonly sanctionSvc = inject(SanctionService);
  private readonly ticketExceedTransactionSvc = inject(TicketExceedTransactionService);
  private readonly localPrint = inject(LocalPrintService);
  private readonly ticketPrint = inject(TicketPrintService);
  private readonly hubSubscriptions = new Subscription();
  private readonly localHealth = inject(LocalHealthService);

  startTour(): void {
    this.exitTour.startTour();
  }

  constructor(
    public lang: LanguageService,
    @Inject(I18N_DICT) private dict: I18nDict,
  ) {}

  t(key: string, params?: any[]): string {
    const fallback: Record<'ar' | 'en', Record<string, string>> = {
      ar: {
        helpTour: 'شرح الواجهة',
        gate_info: 'بيانات اتصال البوابة',
        print_qr: 'QR',
        print_receipt: 'الإيصال',
        take_snapshot: 'التقاط صورة',
        snapshot_failed: 'تعذر تحميل لقطة الكاميرا.',
        scanner_ready: 'كاميرا الرؤية الأمامية',
        vehicle_images: 'صور المركبة',
        vehicle_images_attached: 'تم إرفاق صور المركبة',
        vehicle_images_optional: 'صور المركبة اختيارية.',
        ready_to_scan: 'جاهز للمسح',
        scan_instruction: 'امسح QR أو الكارت أو أدخل رقم السيارة للتحقق والخروج.',
        ticketNumber: 'رقم التذكرة',
        startDate: 'تاريخ البداية',
        scan_render_failed: 'تعذر عرض الملف الممسوح.',
        supervisor_credentials_required:
          'يرجى إدخال اسم المستخدم وكلمة المرور للسوبرفايزر',
        no_ticket_for_exit: 'لا توجد تذكرة مرتبطة بهذا الكود لإتمام الخروج.',
        collect_ticket_missing: 'لا يمكن تحصيل المبلغ: لا يوجد رقم تذكرة متاح.',
        nfc_read_failed:
          'تعذر قراءة الكارت. تأكد من توصيل وتشغيل قارئ الـ NFC.',
        select_gate_first: 'يرجى اختيار بوابة أولاً',
      },
      en: {
        helpTour: 'Help Tour',
        gate_info: 'Gate connection info',
        print_qr: 'QR',
        print_receipt: 'Receipt',
        take_snapshot: 'Take snapshot',
        snapshot_failed: 'Failed to load camera snapshot.',
        scanner_ready: 'Front View Cam',
        vehicle_images: 'Vehicle images',
        vehicle_images_attached: 'Vehicle images attached',
        vehicle_images_optional: 'Vehicle images are optional.',
        ready_to_scan: 'Ready to scan',
        scan_instruction: 'Scan QR, card, or enter the vehicle number to validate exit.',
        ticketNumber: 'Ticket Number',
        startDate: 'Start Date',
        scan_render_failed: 'Error rendering scan.',
        supervisor_credentials_required: 'Please enter supervisor username and password.',
        no_ticket_for_exit: 'No ticket is linked to this code to complete exit.',
        collect_ticket_missing: 'Cannot collect: no ticket number is available.',
        nfc_read_failed:
          'Could not read the card. Check that the NFC reader is connected and running.',
        select_gate_first: 'Please select a gate first.',
      },
    };
    let text =
      this.dict[this.lang.current]?.[key] ??
      fallback[this.lang.current]?.[key] ??
      fallback.en[key] ??
      this.lang.fallbackText(key);
    if (params && params.length > 0) {
      params.forEach((p, i) => {
        text = text.replace(`{${i}}`, p);
      });
    }
    return text;
  }

  private notify(level: ExitToastLevel, key: string, params?: any[]): string {
    const message = this.t(key, params);
    this.showToast(level, message);
    return message;
  }

  private showToast(level: ExitToastLevel, message: string): void {
    if (!message) return;
    if (level === 'success') {
      this.toast.success(message);
      return;
    }
    if (level === 'warn') {
      this.toast.warn(message);
      return;
    }
    this.toast.error(message);
  }

  private setFeedback(
    target: ExitFeedbackTarget,
    key: string,
    level: ExitToastLevel,
    params?: any[],
  ): string {
    const message = this.notify(level, key, params);
    if (target === 'validation') {
      this.validationMessage = level === 'error' ? null : message;
      this.validationError = level === 'error' ? message : null;
      return message;
    }
    if (target === 'openGate') {
      this.validationOpenGateError = level === 'success' ? null : message;
      if (level === 'success') {
        this.validationMessage = message;
      }
      return message;
    }
    this.supervisorCollectError = level === 'success' ? null : message;
    return message;
  }

  private clearValidationFeedback(): void {
    this.validationError = null;
    this.validationOpenGateError = null;
    this.validationMessage = null;
  }

  // ====== Gate devices / state ======
  gatesList: GateDto[] = [];
  selectedGateId: number | null = null;
  gateLoading = false;
  gateSaving = false;
  gatePeripheral: GateDevicePeripheral | null = null;

  // ====== Tokens / roles ======
  cashierToken: string | null = null;

  // ====== Dashboard KPI ======
  totalPriceToday = 0;
  scannedFile: { name: string; url: string; safeUrl?: any; type: string; bytes: any } | null = null;
  snapshotLoading = false;
  snapshotError: string | null = null;
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly errorExtractor = inject(ErrorExtractorService);

  // ====== Real-time Search ======
  searchingTickets = false;
  searchResults: TicketDto[] = [];
  headerTicketSearchText = '';

  searchingTicketNumber = false;

  universalInput = '';
  searchingManual = false;

  scannedTicket: ScanTicketResponse | null = null;
  salarySummary: CalculateSalaryResponse | null = null;

  lastQrCode: string | null = null;

  // ====== Exit / collect flags ======
  collecting = false;
  addingExitTicket = false;
  exitTicketAdded = false;
  exitProcessing = false;

  // ====== Daily collect / supervisor ======
  collectLoading = false;
  collectSummary: CollectDailyTicketsResponse | null = null;
  exceedCollectSummary: CollectExceedTransactionsResponse | null = null;

  supervisorUsername = '';
  supervisorPassword = '';
  supervisorCollectLoading = false;
  showSupervisorCollectModal = false;
  supervisorCollectError: string | null = null;
  supervisorExceedCollectToken: string | null = null;

  // Ticket Details Modal
  showTicketDetailsModal = false;
  selectedTicketForModal: TicketDto | null = null;

  // ====== NFC ======
  readingCard = false;

  // ====== Tickets list & filters ======
  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;
  Math = Math;

  q = '';
  action: TicketAction | '' = 'OUT';
  gate = '';

  page = 1;
  pageSize = 10;

  // Cashier confirm
  collectingCashier = false;
  cashierConfirming = false;

  // Sanctions
  allSanctions: SanctionDto[] = [];
  selectedSanctionIds: string[] = [];
  registeringExceed = false;
  isExceedRegistered = false;
  isExceedAlreadyExists = false;
  exceedAmount = 0;
  totalPriceAfterExceed = 0;
  ticketExceedTransaction: CreateTicketExceedTransactionResponse | null = null;
  selectedTicketForExceed: SearchTicketResponse | null = null;
  exitSelectedTicketLoading = false;

  // ====== Exit Validation ======
  vehicleValidationLoading = false;
  textValidationLoading = false;
  vehicleValidationResult: ValidateExitByVehicleNumberResponse | null = null;
  textValidationResult: ValidateExitByTextResponse | null = null;
  detectedVehicleNumber = '';
  validationMessage: string | null = null;
  validationError: string | null = null;
  gateConnectionInfo: GateConnectionInfo | null = null;
  gateConnectionLoading = false;
  gateConnectionError: string | null = null;
  validationOpenGateLoading = false;
  validationOpenGateError: string | null = null;
  lastValidationOpenGateResponse: OpenGateResponse | null = null;
  lprMembershipLoading = false;
  lprSignalRConnected = false;
  lprSignalRError: string | null = null;
  clearValidationTextNonce = 0;
  focusValidationTextNonce = 0;
  setValidationTextNonce = 0;
  validationTextValue = '';
  private pendingValidationSource: 'validationText' | 'universal' = 'validationText';
  private pendingExitValidation: {
    text: string;
    source: 'validationText' | 'universal';
  } | null = null;
  private lastSubmittedUniversalInput = '';

  get isExitGateConnectionReady(): boolean {
    return this.gatePeripheralFacade.hasControlConnection(this.gateConnectionInfo);
  }

  private get isExitValidationBusy(): boolean {
    return (
      this.textValidationLoading ||
      this.vehicleValidationLoading ||
      this.lprMembershipLoading ||
      this.addingExitTicket ||
      this.validationOpenGateLoading
    );
  }

  get currentTotalWithSanctions(): number {
    return this.salarySummary?.totalSalary || 0;
  }

  get hasValidatedTicketForExceed(): boolean {
    return !!(
      this.selectedTicketForExceed?.id ||
      this.vehicleValidationResult?.ticketId ||
      this.textValidationResult?.ticketId
    );
  }

  get isSupervisor(): boolean {
    return this.auth.isSupervisor;
  }

  // ========= Lifecycle =========

  ngOnInit(): void {
    this.cashierToken = this.auth.token;
    this.initGatePeripheral();
    this.loadGateConnectionInfo();
    this.loadExitGates();
    this.loadSanctions();
    this.reloadList(); // Added reloadList() here

    this.initSignalRExitNotifications();

    this.scanHub.start().then(() => {
      const gateId = this.auth.getGateId();
      if (gateId) {
        this.scanHub.joinStation(gateId.toString());
      }
    });

    this.lprSignalR
      .start()
      .then(() => {
        this.lprSignalRConnected = true;
        this.lprSignalRError = null;
        this.cdr.markForCheck();
      })
      .catch((err) => {
        console.error('LPR SignalR (Exitgate) connection error', err);
        this.lprSignalRConnected = false;
        this.lprSignalRError = 'LPR SignalR connection failed';
        this.cdr.markForCheck();
      });

    this.hubSubscriptions.add(
      this.scanHub.scan$.subscribe((msg) => {
        console.log('ExitgateComponent: Received scan event', msg.fileName);
        this.handleScannedFile(msg);
      }),
    );

    this.hubSubscriptions.add(
      this.lprSignalR.vehicleDetected$.subscribe((event) => {
        this.handleLprVehicleDetected(event);
      }),
    );

    this.hubSubscriptions.add(
      timer(0, 5000)
        .pipe(switchMap(() => this.localHealth.checkPcHealth()))
        .subscribe((isHealthy) => {
          if (this.gatePeripheral) {
            this.gatePeripheral.hasPc = isHealthy;
            this.cdr.markForCheck();
          }
        }),
    );
  }

  private handleScannedFile(msg: ScanFileMessage): void {
    console.log(
      '%c ExitgateComponent: [SCAN EVENT] Handling file: ' + msg.fileName,
      'color: #00ffff; font-weight: bold;',
    );
    console.table({
      fileName: msg.fileName,
      contentType: msg.contentType,
      stationId: msg.stationId,
      bytesLength: (msg.bytes as any)?.length || 'N/A',
    });
    this.showToast('success', `${this.t('scanner_ready')}: ${msg.fileName}`);

    if (this.scannedFile?.url) {
      this.scannerAttachment.revokeUrl(this.scannedFile.url);
    }

    try {
      const attachment = this.scannerAttachment.fromScanMessage(msg);
      console.log('ExitgateComponent: Final data size:', attachment.size);

      this.scannedFile = {
        name: attachment.name,
        url: attachment.url,
        safeUrl: attachment.safeUrl,
        type: attachment.type,
        bytes: attachment.bytes,
      };

      console.log('ExitgateComponent: Processed file', msg.fileName);
      this.cdr.markForCheck();
    } catch (err) {
      console.error('ExitgateComponent: Error rendering scan', err);
      this.notify('error', 'scan_render_failed');
    }
  }

  clearScannedFile(): void {
    if (this.scannedFile?.url) {
      this.scannerAttachment.revokeUrl(this.scannedFile.url);
    }

    this.scannedFile = null;
    this.cdr.markForCheck();
  }

  retrySnapshot(): void {
    const cameraUrl = this.gatePeripheralFacade.cameraUrl(this.gateConnectionInfo);
    if (!cameraUrl) return;
    this.loadCameraSnapshot(cameraUrl);
  }

  private loadCameraSnapshot(cameraUrl: string): void {
    this.snapshotLoading = true;
    this.snapshotError = null;
    this.cdr.markForCheck();

    this.gateSvc.getSnapshot(cameraUrl).subscribe({
      next: (blob) => {
        this.attachSnapshotBlob(blob);
      },
      error: (err) => {
        console.error('Exit camera snapshot error', err);
        this.snapshotError = this.t('snapshot_failed');
        this.notify('warn', 'snapshot_failed');
        this.cdr.markForCheck();
      },
      complete: () => {
        this.snapshotLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private attachSnapshotBlob(blob: Blob): void {
    if (this.scannedFile?.url) {
      this.scannerAttachment.revokeUrl(this.scannedFile.url);
    }

    const attachment = this.scannerAttachment.fromSnapshotBlob(blob);
    this.scannedFile = {
      name: attachment.name,
      url: attachment.url,
      safeUrl: attachment.safeUrl,
      type: attachment.type,
      bytes: attachment.bytes,
    };

    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.exitTour.cancelTour();
    this.hubSubscriptions.unsubscribe();
    this.dashboardHub.stop();
    this.scanHub.stop();
    this.lprSignalR.stop();
  }

  private handleLprVehicleDetected(event: LprVehicleDetectedEvent): void {
    const gateMatch = this.getLprGateMatch(event.gateId);

    console.log('[Exit LPR SignalR] gate match check', {
      eventGateId: event.gateId,
      authGateId: this.auth.getGateId(),
      connectionGateId: this.gateConnectionInfo?.gateId,
      isCurrentGate: gateMatch,
      vehicleNumber: event.vehicleNumber,
    });

    if (!gateMatch) {
      const message = `${this.t('lpr_gate_mismatch')}: ${event.gateId}`;
      this.validationError = message;
      this.showToast('warn', message);
      this.cdr.markForCheck();
      return;
    }

    const vehicleNumber = this.normalizeRawSignalRVehicleNumber(event.vehicleNumber);
    if (!vehicleNumber) return;

    console.log('[Exit LPR SignalR] applying raw vehicleNumber to validation field', {
      rawVehicleNumber: event.vehicleNumber,
      vehicleNumber,
      gateId: event.gateId,
    });

    this.showToast('success', `${this.t('lpr_vehicle_received')}: ${vehicleNumber}`);
    this.onDetectedVehicleNumber(vehicleNumber);
    this.cdr.markForCheck();
  }

  private getLprGateMatch(gateId: string | number | null | undefined): boolean {
    if (!gateId) return false;

    const eventGateId = String(gateId).trim().toLowerCase();
    const candidates = [this.auth.getGateId(), this.gateConnectionInfo?.gateId]
      .filter((id) => id !== null && id !== undefined && String(id).trim().length > 0)
      .map((id) => String(id).trim().toLowerCase());

    return candidates.includes(eventGateId);
  }

  // ========= Init helpers =========

  private getStartOfDayIso(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  private initGatePeripheral(): void {
    this.gatePeripheral = this.auth.getGateData();

    if (!this.auth.isLoggedIn()) return;

    if (!this.gatePeripheral) {
      this.notify('warn', 'select_gate_first');
      this.router.navigate(['/gate-selection']);
      return;
    }
  }

  private loadGateConnectionInfo(gateId: string | number | null = this.auth.getGateId()): void {
    if (!gateId) {
      this.gateConnectionInfo = null;
      this.gateConnectionLoading = false;
      this.gateConnectionError = this.t('gate_connection_required');
      return;
    }

    this.gateConnectionLoading = true;
    this.gateConnectionError = null;
    this.snapshotError = null;

    this.gatePeripheralFacade.getConnectionInfo(gateId).subscribe({
      next: (info) => {
        this.gateConnectionInfo = info;
        this.mergeGateConnectionIntoPeripheral(info);
        if (!this.gatePeripheralFacade.hasControlConnection(info)) {
          this.gateConnectionError = this.t('gate_connection_required');
        }

        const cameraUrl = this.gatePeripheralFacade.cameraUrl(info);
        if (cameraUrl) {
          this.loadCameraSnapshot(cameraUrl);
        }
      },
      error: (err) => {
        this.gateConnectionInfo = null;
        this.gateConnectionLoading = false;
        this.gateConnectionError = this.t('gate_connection_required');
        this.handleError('Gate/connection-info', err);
      },
      complete: () => {
        this.gateConnectionLoading = false;
      },
    });
  }

  private mergeGateConnectionIntoPeripheral(info: GateConnectionInfo): void {
    this.gatePeripheral = this.gatePeripheralFacade.mergeConnectionInfo(
      this.gatePeripheral,
      info,
    );
  }

  private handleError(operation: string, err: any): void {
    console.error(`${operation} error`, err);
    this.toast.fromProblem(err);
  }

  private handleTicketExceedError(err: any): void {
    const code = this.extractProblemCode(err);

    if (err?.status === 409 || code === 'TicketExceedTransaction.AlreadyExists') {
      this.isExceedRegistered = false;
      this.isExceedAlreadyExists = true;
      this.ticketExceedTransaction = null;
      this.exceedAmount = 0;
      this.totalPriceAfterExceed = 0;
      this.notify('warn', 'exceed_already_exists');
      return;
    }

    if (code === 'Ticket.NotFound') {
      this.notify('warn', 'ticket_refresh_required');
      return;
    }

    if (code === 'Sanction.NotFound') {
      this.notify('warn', 'sanction_refresh_required');
      this.loadSanctions();
      return;
    }

    if (code === 'Token.GateOrUser.NotFound' || code === 'Gate.NotFound') {
      this.notify('warn', 'gate_session_invalid');
      return;
    }

    if (code === 'User.NotFound') {
      this.notify('warn', 'user_not_found');
      return;
    }

    if (code === 'TicketId.Required') {
      this.notify('warn', 'please_select_ticket');
      return;
    }

    if (code === 'SanctionIds.Required') {
      this.notify('warn', 'please_select_sanction');
      return;
    }

    if (code === 'SanctionIds.Duplicated') {
      this.notify('warn', 'duplicate_sanctions');
      return;
    }

    const message = this.errorExtractor.extractErrorMessage(err, this.t('failed_register_exceed'));
    this.showToast('error', message);
  }

  private extractProblemCode(err: any): string | null {
    const raw = err?.error ?? err;
    const errors = raw?.errors;

    if (Array.isArray(errors)) {
      const match = errors.find((item) => item?.code);
      return match?.code ?? null;
    }

    return typeof raw?.code === 'string' ? raw.code : null;
  }

  // ========= SignalR Exit Notifications =========

  private initSignalRExitNotifications(): void {
    this.dashboardHub
      .start()
      .catch((err) => console.error('DashboardHub (Exitgate) connection error', err));

    this.hubSubscriptions.add(
      this.dashboardHub.ticketExited$.subscribe((n: TicketExitedNotification) => {
        this.reloadList();
        const msg = this.buildExitNotificationMessage(n);
        this.showToast('success', msg);
      }),
    );
  }

  private buildExitNotificationMessage(n: TicketExitedNotification): string {
    const gateLabel = this.lang.current === 'ar' ? `بوابة ${n.gateNumber}` : `Gate ${n.gateNumber}`;

    const priceText =
      this.lang.current === 'ar' ? `${n.price.toFixed(2)} ج.م` : `${n.price.toFixed(2)} EGP`;

    return this.lang.current === 'ar'
      ? `${gateLabel} - تم خروج التذكرة رقم ${n.ticketId} بمبلغ ${priceText}`
      : `${gateLabel} - Ticket #${n.ticketId} exited with amount ${priceText}`;
  }

  // ========= Gates =========

  private loadExitGates(): void {
    this.gateLoading = true;
    this.gateSvc.getAll().subscribe({
      next: (all) => {
        this.gatesList = (all ?? []).filter((g) => g.gateType === GateType.Exit);
        this.gateLoading = false;
      },
      error: (err) => {
        this.handleError('Gate/GetAll', err);
        this.gateLoading = false;
      },
    });
  }

  confirmGateSelection(): void {
    if (!this.selectedGateId) return;

    this.gateSaving = true;
    this.auth.selectGate(this.selectedGateId, GateType.Exit).subscribe({
      next: (res) => {
        this.gateSaving = false;

        if (res?.gateDevicePeripheral) {
          this.gatePeripheral = res.gateDevicePeripheral;
        } else {
          this.gatePeripheral = this.auth.getGateData();
        }

        this.notify('success', 'outOnlyTitle');
        this.loadGateConnectionInfo(this.selectedGateId);

        if (this.selectedGateId) {
          this.scanHub.joinStation(this.selectedGateId.toString());
        }
      },
      error: (err) => {
        this.handleError('selectGate', err);
        this.gateSaving = false;
      },
    });
  }

  // ========= Sanctions =========

  private loadSanctions(): void {
    this.sanctionSvc.getAll().subscribe({
      next: (res) => (this.allSanctions = res || []),
      error: (err) => this.handleError('Sanction/GetAll', err),
    });
  }

  onToggleSanction(id: string): void {
    if (!id || this.registeringExceed || this.isExceedRegistered || this.isExceedAlreadyExists) {
      return;
    }

    const idx = this.selectedSanctionIds.indexOf(id);
    if (idx >= 0) {
      this.selectedSanctionIds.splice(idx, 1);
    } else {
      this.selectedSanctionIds.push(id);
    }

    if (this.scannedTicket) {
      this.salarySummary = null;
    } else if (this.universalInput) {
      this.fetchSalaryForCard(this.universalInput);
    }
  }

  onExceedTicketSelected(ticket: SearchTicketResponse): void {
    this.selectedTicketForExceed = ticket;
    this.resetExceedState(true);
  }

  submitExceedForValidatedTicket(): void {
    const result = this.vehicleValidationResult || this.textValidationResult;
    const ticketId = this.selectedTicketForExceed?.id ?? result?.ticketId ?? null;
    this.submitExceed(ticketId, false);
  }

  exitSelectedTicketAfterExceed(): void {
    const ticket = this.selectedTicketForExceed;
    const controllerId = this.gatePeripheralFacade.controlId(this.gateConnectionInfo);

    if (!ticket?.id) {
      this.notify('warn', 'please_select_ticket');
      return;
    }

    if (!this.isExceedRegistered) {
      this.notify('warn', 'register_exceed');
      return;
    }

    if (!controllerId) {
      this.setFeedback('openGate', 'gate_connection_required', 'warn');
      return;
    }

    this.exitSelectedTicketLoading = true;

    this.svc.addExitTicket(ticket.id).subscribe({
      next: (ok) => {
        if (!ok) {
          this.setFeedback('openGate', 'exitTicketAddFailed', 'error');
          this.exitSelectedTicketLoading = false;
          return;
        }

        this.upsertExitTicketRow(
          ticket.id,
          ticket.vehicleNumber || ticket.cardNumber || '',
          ticket.uniqueCode || ticket.id,
          this.totalPriceAfterExceed || ticket.price || 0,
          false,
        );
        this.openGateForSelectedTicket(controllerId);
      },
      error: (err) => {
        this.handleError('addExitTicket (selected exceed ticket)', err);
        this.exitSelectedTicketLoading = false;
      },
    });
  }

  private submitExceed(
    ticketId: string | null | undefined,
    continueExitAfterSuccess: boolean,
  ): void {
    if (!ticketId) {
      this.notify('warn', 'please_select_ticket');
      return;
    }

    if (!this.selectedSanctionIds || this.selectedSanctionIds.length === 0) {
      this.notify('warn', 'please_select_sanction');
      return;
    }

    const uniqueSanctionIds = Array.from(new Set(this.selectedSanctionIds));
    if (uniqueSanctionIds.length !== this.selectedSanctionIds.length) {
      this.notify('warn', 'duplicate_sanctions');
      return;
    }

    this.registeringExceed = true;

    this.ticketExceedTransactionSvc
      .create({
        ticketId,
        sanctionIds: uniqueSanctionIds,
      })
      .subscribe({
        next: (response) => {
          this.ticketExceedTransaction = response;
          this.exceedAmount = Number(response.exceedAmount ?? 0);
          this.totalPriceAfterExceed = Number(response.totalPriceAfterExceed ?? 0);
          this.isExceedRegistered = true;
          this.notify('success', 'exceed_registered_success');
          this.printExceedQrTicket(response);
          this.printExceedReceipt(response);

          if (continueExitAfterSuccess) {
            this.registerValidatedExitAndOpenGate();
          }
        },
        error: (err) => {
          this.handleTicketExceedError(err);
        },
        complete: () => {
          this.registeringExceed = false;
        },
      });
  }

  private printExceedQrTicket(response: CreateTicketExceedTransactionResponse): void {
    const qrImage = this.ticketPrint.normalizeQrImage(response.qrCode);
    if (!qrImage) {
      console.warn('No valid qrCode returned from TicketExceedTransaction/Create', response);
      this.toast.warn('No QR code was returned for this exceed transaction.');
      return;
    }

    const printerName =
      this.gateConnectionInfo?.qrPrinterName?.trim() || environment.qrPrinterName?.trim();

    if (!printerName) {
      this.toast.warn('QR printer is not configured for this gate.');
      return;
    }

    const htmlContent = this.buildExceedQrTicketHtml(response, qrImage);

    this.localPrint
      .printHtml({
        printerName,
        htmlContent,
        jobName: `Exceed-QR-${response.ticketInfo || response.ticketId}`,
      })
      .subscribe({
        next: () => this.notify('success', 'printing_sent'),
        error: (err) => {
          console.error('[printExceedQrTicket] Print failed', err);
          this.notify('error', 'printing_failed');
        },
      });
  }

  private buildExceedQrTicketHtml(
    response: CreateTicketExceedTransactionResponse,
    qrImage: string,
  ): string {
    const ticket = this.selectedTicketForExceed;
    const gateNumber = this.gatePeripheral?.gateNumber ?? '---';
    const ticketInfo = response.ticketInfo || ticket?.uniqueCode || response.ticketId;
    const vehicleNumber = ticket?.vehicleNumber || '---';
    const createdAt = response.createdAt
      ? new Date(response.createdAt).toLocaleString('ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleString('ar-EG');

    return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>NPark Exceed QR</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            color: #000 !important;
            font-family: Tahoma, Arial, sans-serif !important;
            font-weight: 900 !important;
            line-height: 1.25;
            text-rendering: geometricPrecision;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { margin: 0; size: 80mm auto; }
          body {
            margin: 0;
            padding: 0;
            width: 80mm;
            direction: rtl;
            background: #fff;
            overflow: hidden;
          }
          .rotation-wrapper {
            width: 80mm;
            padding: 2mm;
            transform: rotate(90deg);
            transform-origin: top left;
            position: absolute;
            top: 0;
            left: 80mm;
            height: 80mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .ticket-wrapper {
            width: 76mm;
            border: 0.8mm solid #000;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            gap: 1mm;
          }
          .header-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            border-bottom: 0.3mm dashed #000;
            padding-bottom: 1.5mm;
            margin-bottom: 1mm;
          }
          .main-row {
            display: flex;
            width: 100%;
            gap: 2mm;
            align-items: center;
            justify-content: space-between;
          }
          .info-side {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
          }
          .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 2mm;
            font-size: 14px;
          }
          .label { white-space: nowrap; }
          .value {
            text-align: left;
            direction: ltr;
            font-size: 14px;
          }
          .qr-side {
            width: 32mm;
            height: 32mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .qr-side img {
            width: 100%;
            height: 100%;
            display: block;
          }
          .footer-line {
            text-align: center;
            font-size: 12px;
            border-top: 0.3mm dashed #000;
            padding-top: 1mm;
            margin-top: 1mm;
          }
        </style>
      </head>
      <body>
        <div class="rotation-wrapper">
          <div class="ticket-wrapper">
            <div class="header-line">
              <span>Exit QR</span>
              <span style="direction: ltr;">${this.escapeHtml(ticketInfo)}</span>
            </div>

            <div class="main-row">
              <div class="info-side">
                <div class="info-item">
                  <span class="label">Created:</span>
                  <span class="value">${this.escapeHtml(createdAt)}</span>
                </div>
                <div class="info-item">
                  <span class="label">Gate:</span>
                  <span class="value">${this.escapeHtml(String(gateNumber))}</span>
                </div>
                <div class="info-item">
                  <span class="label">Vehicle:</span>
                  <span class="value">${this.escapeHtml(vehicleNumber)}</span>
                </div>
                <div class="info-item">
                  <span class="label">Total:</span>
                  <span class="value">${response.totalPriceAfterExceed.toFixed(2)}</span>
                </div>
              </div>

              <div class="qr-side">
                <img src="${this.escapeHtml(qrImage)}" alt="QR" />
              </div>
            </div>

            <div class="footer-line">www.niletronix.com</div>
          </div>
        </div>
      </body>
    </html>`;
  }

  private printExceedReceipt(response: CreateTicketExceedTransactionResponse): void {
    const printerName =
      this.gateConnectionInfo?.receiptPrinterName?.trim() || environment.receiptPrinterName?.trim();

    if (!printerName) {
      this.notify('warn', 'receipt_printer_missing');
      return;
    }

    const htmlContent = this.buildExceedReceiptHtml(response);

    this.localPrint
      .printHtml({
        printerName,
        htmlContent,
        jobName: `Exceed-Receipt-${response.ticketId}`,
      })
      .subscribe({
        next: () => this.notify('success', 'printing_sent'),
        error: (err) => {
          console.error('[printExceedReceipt] Print failed', err);
          this.notify('error', 'printing_failed');
        },
      });
  }

  private buildExceedReceiptHtml(response: CreateTicketExceedTransactionResponse): string {
    const ticket = this.selectedTicketForExceed;
    const gateNumber = this.gatePeripheral?.gateNumber ?? '---';
    const gateTypeLabel = 'خروج';
    const createdAt = response.createdAt
      ? new Date(response.createdAt).toLocaleString('ar-EG', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleString('ar-EG');
    const sanctions = this.allSanctions.filter((sanction) =>
      response.sanctionIds?.includes(sanction.id),
    );
    const sanctionRows = sanctions.length
      ? sanctions
          .map(
            (sanction) => `
              <div class="receipt-row">
                <span class="receipt-label">${this.escapeHtml(sanction.name)}</span>
                <span class="receipt-value">${Number(sanction.amount || 0).toFixed(2)} ج.م</span>
              </div>
            `,
          )
          .join('')
      : `
          <div class="receipt-row">
            <span class="receipt-label">الغرامات</span>
            <span class="receipt-value">${response.exceedAmount.toFixed(2)} ج.م</span>
          </div>
        `;

    return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>NPark Exceed Receipt</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            color: #000 !important;
            font-family: Tahoma, Arial, sans-serif !important;
            font-weight: 900 !important;
            line-height: 1.3;
            text-rendering: geometricPrecision;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { margin: 0; size: 80mm auto; }
          body {
            margin: 0;
            padding: 1mm;
            font-family: Tahoma, Arial, sans-serif;
            direction: rtl;
            width: 80mm;
            font-weight: 900;
            color: #000;
          }
          .receipt-wrap {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1.5mm;
            border: 0.8mm solid #000;
            padding: 2mm;
            border-radius: 1.5mm;
          }
          .receipt-header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 1.5mm;
          }
          .receipt-title { font-size: 22px; font-weight: 900; }
          .receipt-subtitle { font-size: 14px; margin-top: 0.5mm; }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 2mm;
            font-size: 16px;
            font-weight: 900;
            padding: 1mm 0;
            border-bottom: 0.2mm solid #000;
          }
          .receipt-label { font-weight: 900; }
          .receipt-value { font-weight: 900; direction: ltr; text-align: left; }
          .total-section {
            margin-top: 1mm;
            background: #f0f0f0;
            padding: 2mm;
            border: 0.6mm solid #000;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .total-label { font-size: 18px; font-weight: 900; }
          .total-value { font-size: 22px; font-weight: 900; direction: ltr; }
          .receipt-footer {
            text-align: center;
            font-size: 12px;
            font-weight: 900;
            margin-top: 1mm;
          }
        </style>
      </head>
      <body>
        <div class="receipt-wrap">
          <div class="receipt-header">
            <div class="receipt-title">إيصال مخالفات</div>
            <div class="receipt-subtitle">NPark Management System</div>
          </div>

          <div class="receipt-row">
            <span class="receipt-label">كود التذكرة:</span>
            <span class="receipt-value">${this.escapeHtml(ticket?.uniqueCode || response.ticketId)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">رقم السيارة:</span>
            <span class="receipt-value">${this.escapeHtml(ticket?.vehicleNumber || '---')}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">رقم الكارت:</span>
            <span class="receipt-value">${this.escapeHtml(ticket?.cardNumber || '---')}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">رقم البوابة:</span>
            <span class="receipt-value">${this.escapeHtml(String(gateNumber))}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">نوع البوابة:</span>
            <span class="receipt-value">${this.escapeHtml(gateTypeLabel)}</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">وقت العملية:</span>
            <span class="receipt-value">${this.escapeHtml(createdAt)}</span>
          </div>

          ${sanctionRows}

          <div class="receipt-row">
            <span class="receipt-label">سعر التذكرة:</span>
            <span class="receipt-value">${response.ticketPrice.toFixed(2)} ج.م</span>
          </div>
          <div class="receipt-row">
            <span class="receipt-label">إجمالي المخالفات:</span>
            <span class="receipt-value">${response.exceedAmount.toFixed(2)} ج.م</span>
          </div>

          <div class="total-section">
            <span class="total-label">الإجمالي:</span>
            <span class="total-value">${response.totalPriceAfterExceed.toFixed(2)} ج.م</span>
          </div>

          <div class="receipt-footer">
            شكراً لزيارتكم<br />
            www.niletronix.com
          </div>
        </div>
      </body>
    </html>`;
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  onCalculateSalary(): void {
    if (this.scannedTicket) {
      this.fetchSalaryOnly(String(this.scannedTicket.id));
    }
  }

  onUniversalInputChange(value: string): void {
    let next = this.normalizeExitScanText(value);

    if (
      this.lastSubmittedUniversalInput &&
      next.startsWith(this.lastSubmittedUniversalInput) &&
      next.length > this.lastSubmittedUniversalInput.length &&
      !this.textValidationLoading &&
      !this.validationOpenGateLoading
    ) {
      next = this.normalizeExitScanText(next.slice(this.lastSubmittedUniversalInput.length));
      this.lastSubmittedUniversalInput = '';
    }

    this.universalInput = next;
  }

  onUniversalInputSubmit(): void {
    const normalized = this.normalizeExitScanText(this.universalInput);
    this.universalInput = normalized;
    this.lastSubmittedUniversalInput = normalized;
    this.onValidateExitByText(normalized, 'universal');
  }

  // ========= Tickets list / filters =========

  private loadTicketsForExit(startDateIso: string, ticketNumber: string = ''): void {
    this.loading = true;

    this.svc.getTicketsForExit(startDateIso, ticketNumber).subscribe({
      next: (res) => {
        this.totalPriceToday = res.totalPrice ?? 0;

        const allItems = (res.items ?? [])
          .filter((t: TicketDto) => t.action === 'OUT')
          .sort(
            (a: TicketDto, b: TicketDto) => new Date(b.time).getTime() - new Date(a.time).getTime(),
          );

        this.tickets = this.deduplicateTickets(allItems);
        this.applyFilters();
      },
      error: (err) => {
        this.handleError('getTicketsForExit', err);
        this.loading = false;
      },
      complete: () => (this.loading = false),
    });
  }

  reloadList(): void {
    this.loadTicketsForExit(this.getStartOfDayIso());
  }

  gates(): string[] {
    return Array.from(new Set(this.tickets.map((t) => t.gate))).sort();
  }

  applyFilters(): void {
    const q = this.q.trim().toLowerCase();

    this.filtered = this.tickets.filter((t) => {
      const info = t.info?.toLowerCase() ?? '';
      const okQ =
        !q || t.plate.toLowerCase().includes(q) || String(t.id).includes(q) || info.includes(q);

      const okG = !this.gate || t.gate === this.gate;
      return okQ && okG;
    });

    this.page = 1;
  }

  // ========= Scan / QR / Manual =========

  scanQRCode(): void {
    this.universalInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.selectedSanctionIds = [];
    this.addingExitTicket = false;
    this.exitTicketAdded = false;
    this.resetExceedState(true);
    this.loadSanctions();
  }

  // =======================
  // Real-time search (SearchBlockComponent)
  // =======================
  onSearchTickets(query: string): void {
    this.headerTicketSearchText = query ?? '';

    if (!query?.trim()) {
      this.searchResults = [];
      return;
    }

    this.searchingTickets = true;

    this.svc.searchTickets(query).subscribe({
      next: (results) => {
        this.searchResults = results;
      },
      error: (err) => {
        console.error('searchTickets error', err);
        this.toast.fromProblem(err);
      },
      complete: () => {
        this.searchingTickets = false;
      },
    });
  }

  onTicketSelected(ticket: TicketDto): void {
    const identifier = ticket.ticketNumber || String(ticket.id);
    const summaryText = ticket.info ? ` - ${ticket.info}` : '';

    if (ticket.isCollectedByCashier) {
      this.notify('warn', 'ticket_already_collected', [identifier, summaryText]);
    }

    this.searchResults = [];
  }

  // ========= Exit Validation Methods =========

  onDetectedVehicleNumber(vehicleNumber: string): void {
    const normalized = this.normalizeRawSignalRVehicleNumber(vehicleNumber);
    if (!normalized) return;

    this.detectedVehicleNumber = normalized;
    this.setValidationText(normalized);
  }

  private setValidationText(text: string): void {
    this.validationTextValue = this.normalizeRawSignalRVehicleNumber(text);
    this.setValidationTextNonce++;
  }

  private handleLprMembershipVehicle(vehicleNumber: string): void {
    const normalized = this.normalizeExitScanText(vehicleNumber);
    if (!normalized) return;

    const controllerId = this.gatePeripheralFacade.controlId(this.gateConnectionInfo);
    if (!controllerId) {
      this.setFeedback('openGate', 'gate_connection_required', 'warn');
      this.focusValidationTextNonce++;
      return;
    }

    this.lprMembershipLoading = true;
    this.clearValidationFeedback();
    this.validationMessage = this.t('searching');

    this.svc.isMembership(normalized).subscribe({
      next: (membership) => {
        if (!membership?.isExist) {
          this.setFeedback('validation', 'not_valid_for_exit', 'warn');
          this.focusValidationTextNonce++;
          return;
        }

        this.createMembershipExitTicketAndOpenGate(
          normalized,
          membership.cardNumber ??
            (membership.summary as any)?.cardNumber ??
            (membership.summary as any)?.CardNumber ??
            undefined,
          controllerId,
        );
      },
      error: (err) => {
        this.validationError = this.t('failed_to_validate');
        this.handleError('IsMemberShip (exit LPR)', err);
        this.focusValidationTextNonce++;
      },
      complete: () => {
        this.lprMembershipLoading = false;
      },
    });
  }

  private createMembershipExitTicketAndOpenGate(
    vehicleNumber: string,
    cardNumber: string | undefined,
    controllerId: string,
  ): void {
    if (this.addingExitTicket) return;

    this.addingExitTicket = true;
    this.validationMessage = this.t('allowed_for_exit');

    this.svc
      .addTicket({
        isSubscriber: true,
        vehicleNumber,
        cardNumber,
      })
      .subscribe({
        next: (res) => {
          if (!this.isAddTicketSuccess(res)) {
            this.setFeedback('openGate', 'exitTicketAddFailed', 'error');
            this.focusValidationTextNonce++;
            return;
          }

          if (res?.ticketId) {
            this.upsertExitTicketRow(
              res.ticketId,
              res.vehicleNumber || vehicleNumber,
              res.ticketInfo || res.ticketId,
              res.price ?? 0,
              true,
            );
          }
          this.pendingValidationSource = 'validationText';
          this.openGateForValidatedExit(controllerId);
        },
        error: (err) => {
          this.validationOpenGateError = this.t('exitTicketAddFailed');
          this.handleError('AddTicket (exit LPR membership)', err);
          this.focusValidationTextNonce++;
        },
        complete: () => {
          this.addingExitTicket = false;
        },
      });
  }

  private isAddTicketSuccess(res: any): boolean {
    return !!(
      res === true ||
      res?.success ||
      res?.Success ||
      res?.isSuccess ||
      res?.IsSuccess ||
      res?.succeeded ||
      res?.Succeeded ||
      res?.ticketId ||
      res?.TicketId
    );
  }

  onValidateExitByVehicleNumber(vehicleNumber: string): void {
    if (!vehicleNumber?.trim()) return;
    this.detectedVehicleNumber = vehicleNumber.trim();
    this.clearValidationFeedback();
    this.resetExceedState(false);
    this.vehicleValidationLoading = true;
    this.vehicleValidationResult = null;
    this.textValidationResult = null;

    this.svc.validateExitByVehicleNumber(this.detectedVehicleNumber).subscribe({
      next: (res) => {
        this.vehicleValidationLoading = false;
        if (res.isValidForExit) {
          this.vehicleValidationResult = res;
          this.setFeedback('validation', 'valid_for_exit', 'success');
        } else {
          this.vehicleValidationResult = null;
          this.validationMessage = null;
          this.validationError = null;
          this.notify('warn', 'not_valid_for_exit');
          this.focusValidationTextNonce++;
        }
      },
      error: (err) => {
        this.validationError = this.t('failed_to_validate');
        this.handleError('validateExitByVehicleNumber', err);
        this.vehicleValidationLoading = false;
      },
    });
  }

  onValidateExitByText(
    text: string,
    source: 'validationText' | 'universal' = 'validationText',
  ): void {
    const trimmed = this.normalizeExitScanText(text);

    if (this.isExitValidationBusy) {
      if (trimmed) {
        this.pendingExitValidation = { text: trimmed, source };
        this.clearExitValidationInput(source);
      }
      return;
    }

    if (!trimmed) {
      this.setFeedback('validation', 'text_required', 'error');
      this.focusValidationTextNonce++;
      return;
    }

    if (trimmed.length > 200) {
      this.setFeedback('validation', 'text_required', 'error');
      this.focusValidationTextNonce++;
      return;
    }

    if (!this.isExitGateConnectionReady) {
      this.setFeedback('validation', 'gate_connection_required', 'error');
      this.focusValidationTextNonce++;
      return;
    }

    this.clearValidationFeedback();
    this.resetExceedState(false);
    this.pendingValidationSource = source;
    this.clearExitValidationInput(source);
    this.textValidationLoading = true;
    this.textValidationResult = null;
    this.vehicleValidationResult = null;
    this.lastValidationOpenGateResponse = null;

    this.validateExitByTextWithFallback(trimmed).subscribe({
      next: (res) => {
        this.textValidationLoading = false;
        if (res.isValidForExit) {
          this.textValidationResult = res;
          this.setFeedback('validation', 'allowed_for_exit', 'success');
          this.registerValidatedExitAndOpenGate();
        } else {
          this.textValidationResult = null;
          this.validationMessage = null;
          this.validationError = null;
          this.notify('warn', 'not_valid_for_exit');
          this.focusValidationTextNonce++;
          this.processPendingExitValidation();
        }
      },
      error: (err) => {
        this.validationError =
          err?.status === 422
            ? this.errorExtractor.extractErrorMessage(err, this.t('text_required'))
            : this.t('failed_to_validate');
        this.handleError('validateExitByText', err);
        this.textValidationLoading = false;
        this.focusValidationTextNonce++;
        this.processPendingExitValidation();
      },
    });
  }

  private validateExitByTextWithFallback(text: string) {
    return this.svc.validateExitByText({ text }).pipe(
      switchMap((res) => {
        const fallback = this.getQrCaseFallbackText(text, res);
        return fallback ? this.svc.validateExitByText({ text: fallback }) : of(res);
      }),
    );
  }

  private getQrCaseFallbackText(text: string, res: ValidateExitByTextResponse): string | null {
    if (res.isValidForExit || res.ticketId) return null;
    if (!/^[A-Za-z0-9+/=_-]+$/.test(text) || !/[A-Za-z]/.test(text)) return null;

    const fallback = text.replace(/[A-Za-z]/g, (ch) =>
      ch === ch.toUpperCase() ? ch.toLowerCase() : ch.toUpperCase(),
    );

    return fallback !== text ? fallback : null;
  }

  private clearExitValidationInput(source: 'validationText' | 'universal'): void {
    if (source === 'universal') {
      this.universalInput = '';
      this.lastSubmittedUniversalInput = '';
      return;
    }

    this.validationTextValue = '';
    this.clearValidationTextNonce++;
  }

  private processPendingExitValidation(): void {
    if (!this.pendingExitValidation || this.isExitValidationBusy) return;

    const pending = this.pendingExitValidation;
    this.pendingExitValidation = null;

    setTimeout(() => {
      this.onValidateExitByText(pending.text, pending.source);
    }, 0);
  }

  private registerValidatedExitAndOpenGate(): void {
    const result = this.textValidationResult || this.vehicleValidationResult;
    const controllerId = this.gatePeripheralFacade.controlId(this.gateConnectionInfo);

    if (
      !result?.isValidForExit ||
      !result.ticketId ||
      !controllerId ||
      this.addingExitTicket ||
      this.validationOpenGateLoading
    ) {
      if (!result?.ticketId) {
        this.setFeedback('openGate', 'no_matching_ticket', 'warn');
      }
      if (!controllerId) {
        this.setFeedback('openGate', 'gate_connection_required', 'warn');
      }
      return;
    }

    this.addingExitTicket = true;
    this.validationOpenGateError = null;
    this.validationMessage = this.t('exitTicketAdded');

    this.svc.addExitTicket(result.ticketId).subscribe({
      next: (ok) => {
        if (!ok) {
          this.setFeedback('openGate', 'exitTicketAddFailed', 'error');
          this.focusValidationTextNonce++;
          return;
        }

        this.upsertExitTicketRow(
          result.ticketId!,
          result.vehicleNumber ||
            result.cardNumber ||
            (result as ValidateExitByTextResponse).inputText ||
            '',
          result.ticketNumber || result.ticketId!,
          0,
          false,
        );
        this.openGateForValidatedExit(controllerId);
      },
      error: (err) => {
        this.validationOpenGateError = this.t('exitTicketAddFailed');
        this.handleError('addExitTicket (validated exit)', err);
        this.addingExitTicket = false;
        this.focusValidationTextNonce++;
        this.processPendingExitValidation();
      },
      complete: () => {
        this.addingExitTicket = false;
        this.processPendingExitValidation();
      },
    });
  }

  private openGateForValidatedExit(controllerId: string): void {
    this.validationOpenGateLoading = true;
    this.validationOpenGateError = null;
    this.lastValidationOpenGateResponse = null;

    this.gateSvc.openGate(controllerId).subscribe({
      next: (res) => {
        this.lastValidationOpenGateResponse = res;
        this.setFeedback('openGate', 'gate_opened_successfully', 'success');
        if (this.pendingValidationSource === 'universal') {
          this.universalInput = '';
          this.lastSubmittedUniversalInput = '';
        } else {
          this.clearValidationTextNonce++;
        }
        this.focusValidationTextNonce++;
      },
      error: (err) => {
        console.error('OpenGate error', err);
        this.validationOpenGateLoading = false;
        this.setFeedback('openGate', 'open_gate_failed', 'error');
        this.focusValidationTextNonce++;
        this.processPendingExitValidation();
      },
      complete: () => {
        this.validationOpenGateLoading = false;
        this.processPendingExitValidation();
      },
    });
  }

  private openGateForSelectedTicket(controllerId: string): void {
    this.validationOpenGateLoading = true;
    this.validationOpenGateError = null;
    this.lastValidationOpenGateResponse = null;

    this.gateSvc.openGate(controllerId).subscribe({
      next: (res) => {
        this.lastValidationOpenGateResponse = res;
        this.setFeedback('openGate', 'gate_opened_successfully', 'success');
        this.reloadList();
        this.selectedTicketForExceed = null;
        this.resetExceedState(true);
      },
      error: (err) => {
        console.error('OpenGate error', err);
        this.setFeedback('openGate', 'open_gate_failed', 'error');
      },
      complete: () => {
        this.validationOpenGateLoading = false;
        this.exitSelectedTicketLoading = false;
      },
    });
  }

  private getExitValidationBusinessMessage(
    res: ValidateExitByTextResponse | ValidateExitByVehicleNumberResponse,
  ): string {
    if (!res.ticketId) return this.t('no_matching_ticket');
    if (res.endDate) return this.t('ticket_already_exited_msg');
    if (res.startDate && !this.isToday(res.startDate)) return this.t('ticket_not_valid_today_msg');
    return this.t('not_valid_for_exit');
  }

  private isToday(value: string): boolean {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;

    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }

  private normalizeExitScanText(value: string): string {
    let text = String(value ?? '')
      .replace(/[\r\n]+/g, '')
      .trim();

    const lastExcelQuoteStart = text.lastIndexOf('="');
    if (lastExcelQuoteStart > 0 && lastExcelQuoteStart < text.length - 2) {
      text = text.slice(lastExcelQuoteStart + 2).trim();
    }

    const lastQuote = text.lastIndexOf('"');
    if (lastQuote > 0 && lastQuote < text.length - 1) {
      text = text.slice(lastQuote + 1).trim();
    }

    if (text.startsWith('=')) {
      text = text.slice(1).trim();
    }

    text = text.replace(/["'\u201c\u201d\u00ab\u00bb]/g, '').trim();

    text = text
      .replace(/^[\s"'“”«»]+/, '')
      .replace(/[\s"'“”«»]+$/, '')
      .trim();

    let changed = true;
    while (changed && text.length >= 2) {
      changed = false;
      const first = text.charAt(0);
      const last = text.charAt(text.length - 1);
      if (
        (first === '"' && last === '"') ||
        (first === "'" && last === "'") ||
        (first === '“' && last === '”') ||
        (first === '«' && last === '»')
      ) {
        text = text.slice(1, -1).trim();
        changed = true;
      }
    }

    return text;
  }

  private normalizeRawSignalRVehicleNumber(value: string | null | undefined): string {
    return String(value ?? '')
      .replace(/[\r\n]+/g, '')
      .trim();
  }

  onConfirmValidationExit(ticketId: string): void {
    const res = this.vehicleValidationResult || this.textValidationResult;
    if (!res || res.ticketId !== ticketId || !res.isValidForExit) {
      this.notify('warn', 'not_valid_for_exit');
      return;
    }

    this.addExitTicket({
      id: res.ticketId!,
      ticketNumber: res.ticketNumber || '',
      ticketInfo: res.vehicleNumber || res.cardNumber || '',
      price: 0,
      startDate: res.startDate || '',
      isCollectedByCashier: false,
    } as ScanTicketResponse);
  }

  closeTicketDetailsModal(): void {
    this.showTicketDetailsModal = false;
    this.selectedTicketForModal = null;
  }

  onGateDeviceSearchTicket(ticketNumber: string): void {
    const trimmed = ticketNumber?.trim();
    if (!trimmed || this.searchingTicketNumber) return;

    this.searchingTicketNumber = true;

    this.svc.searchTickets(trimmed).subscribe({
      next: (results) => {
        if (!results || results.length === 0) {
          this.notify('error', 'no_search_results');
          return;
        }

        const exact =
          results.find(
            (r) => (r.ticketNumber ?? String(r.id)).toLowerCase() === trimmed.toLowerCase(),
          ) ?? results[0];

        const identifier = exact.ticketNumber || String(exact.id);

        this.onSearchTicketNumber(identifier, true);
      },
      error: (err) => {
        this.handleError('searchTickets (gate devices)', err);
      },
      complete: () => {
        this.searchingTicketNumber = false;
      },
    });
  }

  /** Scan QR to get ticket data */
  private triggerUnifiedSearch(value: string): void {
    if (!value?.trim()) return;
    const trimmed = value.trim();

    this.fetchTicketAndSalaryByQr(trimmed, false);
  }

  fetchTicketAndSalaryByQr(code: string, isForcedTicket: boolean = false): void {
    if (!code) return;

    this.searchingManual = true;
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = code;

    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    // 1) Scan Ticket
    this.svc.scanTicket(code).subscribe({
      next: (res: ScanTicketResponse) => {
        if (res) {
          this.scannedTicket = res;
          this.searchingManual = false;

          const identifier = res.ticketNumber || String(res.id);
          this.notify('success', 'ticket_selected_success', [identifier]);
        } else {
          if (isForcedTicket) {
            this.searchingManual = false;
            this.notify('error', 'ticket_not_found', [code]);
          } else {
            this.fetchSalaryForCard(code);
          }
        }
      },
      error: (err) => {
        if (isForcedTicket) {
          this.searchingManual = false;
          this.handleError('scanTicket', err);
        } else {
          this.fetchSalaryForCard(code);
        }
      },
    });
  }

  /** Step 2: Calculate Salary based on ticketId and selected sanctions */
  private fetchSalaryOnly(ticketId: string): void {
    this.svc.calculateTicketSalary(ticketId, this.selectedSanctionIds).subscribe({
      next: (summary) => {
        this.salarySummary = summary;
        if (this.scannedTicket && summary) {
          this.scannedTicket = {
            ...this.scannedTicket,
            price: summary.totalSalary,
            startDate: summary.enterDate || this.scannedTicket.startDate,
          };
        }
      },
      error: (err) => {
        this.handleError('calculateTicketSalary', err);
      },
      complete: () => {
        this.searchingManual = false;
      },
    });
  }

  /** Search ticket by its number and display in Exit block */
  onSearchTicketNumber(ticketNumber: string, isForcedTicket: boolean = false): void {
    if (!ticketNumber?.trim()) return;

    const trimmed = ticketNumber.trim();

    // Reset states
    this.universalInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = trimmed;

    this.addingExitTicket = false;
    this.exitTicketAdded = false;
    this.searchingManual = true;

    this.fetchTicketAndSalaryByQr(trimmed, isForcedTicket);
  }

  /** Subscriber card: CalculateSalaryForSubscriberCommand */
  private fetchSalaryForCard(cardNumber: string): void {
    this.searchingManual = true;
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = null;

    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    this.svc.calculateSubscriberSalary(cardNumber, this.selectedSanctionIds).subscribe({
      next: (summary) => {
        this.salarySummary = summary;
        if (summary) {
          this.notify('success', 'subscriber_card_found', [cardNumber]);
        }
      },
      error: (err) => {
        this.handleError('calculateSubscriberSalary (card)', err);
      },
      complete: () => {
        this.searchingManual = false;
      },
    });
  }

  // ========= Exit ticket log / collect =========
  // success message when back 204

  addExitTicket(t: ScanTicketResponse): void {
    if (this.addingExitTicket || !t?.id) return;

    this.addingExitTicket = true;

    this.svc.addExitTicket(String(t.id)).subscribe({
      next: (ok) => {
        if (ok) {
          this.exitTicketAdded = true;

          const price = this.currentTotalWithSanctions || t.price;
          this.upsertExitTicketRow(t.id, t.ticketInfo || '', t.ticketNumber, price, false);
        }
      },
      error: (err) => {
        this.handleError('addExitTicket', err);
      },
      complete: () => {
        this.addingExitTicket = false;
      },
    });
  }

  confirmExit(): void {
    if (!this.salarySummary) return;

    if (!this.salarySummary.isExitValid) {
      this.notify('error', 'exit_not_valid_msg');
      return;
    }

    if (!this.scannedTicket) {
      this.notify('error', 'no_ticket_for_exit');
      return;
    }

    if (this.exitTicketAdded) {
      return;
    }

    const ticketId = this.scannedTicket.id;
    this.collecting = true;

    this.svc.addExitTicket(String(ticketId)).subscribe({
      next: (ok) => {
        if (ok) {
          this.exitTicketAdded = true;
          this.notify('success', 'exitTicketAdded');

          const price = this.currentTotalWithSanctions || this.scannedTicket!.price;
          this.upsertExitTicketRow(
            ticketId,
            this.scannedTicket!.ticketInfo || '',
            this.scannedTicket!.ticketNumber,
            price,
            false,
          );
        } else {
          this.notify('error', 'exitTicketAddFailed');
        }
      },
      error: (err) => {
        this.handleError('addExitTicket (confirmExit)', err);
      },
      complete: () => {
        this.collecting = false;
      },
    });
  }

  allowExitWithoutCollect(): void {
    if (!this.scannedTicket && !this.salarySummary) return;

    this.exitProcessing = true;

    if (this.scannedTicket) {
      const ticketId = String(this.scannedTicket.id);

      this.svc.addExitTicket(ticketId).subscribe({
        next: (ok) => {
          if (ok) {
            const price = this.currentTotalWithSanctions || 0;
            this.upsertExitTicketRow(
              this.scannedTicket!.id,
              this.scannedTicket!.ticketInfo || '',
              this.scannedTicket!.ticketNumber,
              price,
              true,
            );
            this.resetScanState();
          }
        },
        error: (err) => {
          this.handleError('addExitTicket (allowExitWithoutCollect/QR)', err);
          this.exitProcessing = false;
        },
        complete: () => {
          this.exitProcessing = false;
        },
      });

      return;
    }

    if (this.salarySummary?.ticketId) {
      const ticketId = String(this.salarySummary.ticketId);

      this.svc.addExitTicket(ticketId).subscribe({
        next: (ok) => {
          if (ok) {
            const price = this.currentTotalWithSanctions || 0;
            const plate = 'SUBSCRIBER';
            this.upsertExitTicketRow(ticketId, plate, ticketId, price, true);
            this.resetScanState();
          }
        },
        error: (err) => {
          this.handleError('addExitTicket (allowExitWithoutCollect/subscriber)', err);
          this.exitProcessing = false;
        },
        complete: () => {
          this.exitProcessing = false;
        },
      });
    } else {
      this.exitProcessing = false;
    }
  }

  collect(t: TicketDetailsDto): void {
    this.collecting = true;

    this.svc.collect(t.id).subscribe({
      next: () => {
        this.upsertExitTicketRow(t.id, t.plate, t.id.toString(), t.totalPrice, false);
        this.notify('success', 'collectCashierOk');
        this.resetScanState();
      },
      error: (err) => {
        this.handleError('collect', err);
        this.collecting = false;
      },
      complete: () => {
        this.collecting = false;
      },
    });
  }

  collectCashier(): void {
    if (this.cashierConfirming || !this.salarySummary) return;

    const ticketId =
      this.scannedTicket?.id != null ? String(this.scannedTicket.id) : this.salarySummary.ticketId;

    if (!ticketId) {
      this.notify('error', 'collect_ticket_missing');
      return;
    }

    this.cashierConfirming = true;
    // success message when back 204
    this.svc.collectCashier(ticketId).subscribe({
      next: (ok) => {
        if (ok) {
          this.salarySummary = {
            ...this.salarySummary!,
            isCollectByCashier: true,
          };
          this.notify('success', 'collectCashierOk');
        }
      },
      error: (err) => {
        this.handleError('collectCashier', err);
      },
      complete: () => {
        this.cashierConfirming = false;
      },
    });
  }

  // ========= Daily collect / supervisor =========

  collectDailyForGate(): void {
    if (this.collectLoading) return;

    this.collectLoading = true;
    this.collectSummary = null;
    this.exceedCollectSummary = null;

    this.svc
      .collectDailyTickets()
      .pipe(
        switchMap((ticketSummary: CollectDailyTicketsResponse) =>
          this.ticketExceedTransactionSvc.collectExceedTransactions().pipe(
            map((exceedSummary) => ({
              ticketSummary,
              exceedSummary,
            })),
          ),
        ),
      )
      .subscribe({
        next: ({ ticketSummary, exceedSummary }) => {
          this.collectSummary = ticketSummary;
          this.exceedCollectSummary = exceedSummary;
          this.notify('success', 'collectDailyOk');
          if (exceedSummary.totalTransactionsCollected > 0) {
            this.notify('success', 'collectExceedOk');
          }
          this.reloadList();
        },
        error: (err) => {
          this.handleError('collectDailyForGate', err);
          this.collectLoading = false;
          this.collectSummary = null;
          this.exceedCollectSummary = null;
        },
        complete: () => {
          this.collectLoading = false;
        },
      });
  }

  submitSupervisorCollect(): void {
    const user = this.supervisorUsername.trim();
    const pwd = this.supervisorPassword;
    const gateData = this.gatePeripheral ?? this.auth.getGateData();
    const gateNumber = gateData?.gateNumber ?? null;
    const gateType = GateType.Exit;

    if (!user || !pwd) {
      this.setFeedback('supervisor', 'supervisor_credentials_required', 'warn');
      return;
    }

    if (gateNumber == null) {
      this.setFeedback('supervisor', 'select_gate_first', 'warn');
      return;
    }

    this.supervisorCollectError = null;
    this.supervisorCollectLoading = true;
    this.collectSummary = null;
    this.exceedCollectSummary = null;

    this.ticketExceedTransactionSvc
      .startExceedCollectAsSupervisor({
        userName: user,
        password: pwd,
        gateType,
        gateNumber,
      })
      .subscribe({
        next: (token) => {
          this.supervisorExceedCollectToken = token;
        },
        error: (err) => {
          if (err?.status === 403) {
            const msg = this.t('incorrect_credentials');
            this.supervisorCollectError = msg;
            this.showToast('error', msg);
          } else {
            this.handleError('collectExceedTransactionsAsSupervisor', err);
            this.supervisorCollectError = this.errorExtractor.extractErrorMessage(
              err,
              'فشل الدخول كـ Supervisor. تأكد من البيانات أو الصلاحيات.',
            );
          }
          this.supervisorCollectLoading = false;
        },
        complete: () => {
          this.supervisorCollectLoading = false;
        },
      });
  }

  confirmSupervisorExceedCollection(): void {
    if (!this.supervisorExceedCollectToken || this.supervisorCollectLoading) return;

    this.supervisorCollectError = null;
    this.supervisorCollectLoading = true;

    this.ticketExceedTransactionSvc
      .collectExceedTransactionsWithToken(this.supervisorExceedCollectToken)
      .subscribe({
        next: (exceedSummary) => {
          this.exceedCollectSummary = exceedSummary;
          this.notify('success', 'collectExceedOk');
          this.exitTicketAdded = true;
          this.scannedFile = null;
          this.reloadList();
          this.supervisorCollectLoading = false;
        },
        error: (err) => {
          this.handleError('collectExceedTransactionsWithToken', err);
          this.supervisorCollectError = this.errorExtractor.extractErrorMessage(
            err,
            this.t('printing_failed'),
          );
          this.supervisorCollectLoading = false;
        },
        complete: () => {
          this.supervisorCollectLoading = false;
        },
      });
  }

  onCollectClick(): void {
    if (this.isSupervisor) {
      this.collectDailyForGate();
      return;
    }
    this.openSupervisorCollectModal();
  }

  openSupervisorCollectModal(): void {
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.supervisorCollectError = null;
    this.collectSummary = null;
    this.exceedCollectSummary = null;
    this.supervisorExceedCollectToken = null;
    this.showSupervisorCollectModal = true;
  }

  closeSupervisorCollectModal(): void {
    if (this.supervisorCollectLoading) return;

    this.showSupervisorCollectModal = false;
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.supervisorCollectError = null;
    this.collectSummary = null;
    this.exceedCollectSummary = null;
    this.supervisorExceedCollectToken = null;
  }

  clearCollectSummaries(): void {
    this.collectSummary = null;
    this.exceedCollectSummary = null;
    this.supervisorExceedCollectToken = null;
  }

  finishSupervisorCollect(): void {
    this.closeSupervisorCollectModal();
  }

  // ========= NFC =========

  async readCard(): Promise<void> {
    if (this.readingCard) return;
    this.readingCard = true;

    try {
      const uid = await this.nfc.readUID();
      const normalized = String(uid).trim().toUpperCase();

      this.setValidationText(normalized);
      this.lastQrCode = null;
    } catch (err: any) {
      console.error(err);
      this.showToast('error', err?.message || this.t('nfc_read_failed'));
    } finally {
      this.readingCard = false;
    }
  }

  // ========= Print =========

  printSummary(): void {
    this.ticketPrint.printExitSummaryWindow({
      scannedTicket: this.scannedTicket,
      salarySummary: this.salarySummary,
      currentTotalWithSanctions: this.currentTotalWithSanctions,
      t: (key) => this.t(key),
    });
  }

  // ========= Helpers =========

  private resetScanState(): void {
    this.universalInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = null;
    this.resetExceedState(true);
  }

  private resetExceedState(clearSanctions: boolean = false): void {
    this.registeringExceed = false;
    this.isExceedRegistered = false;
    this.isExceedAlreadyExists = false;
    this.exceedAmount = 0;
    this.totalPriceAfterExceed = 0;
    this.ticketExceedTransaction = null;
    this.exitSelectedTicketLoading = false;

    if (clearSanctions) {
      this.selectedSanctionIds = [];
    }
  }

  private deduplicateTickets(list: TicketDto[]): TicketDto[] {
    const sorted = [...list].sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );
    const result: TicketDto[] = [];
    const seenIdentities = new Set<string>();

    for (const t of sorted) {
      const identities = [
        String(t.id).toLowerCase(),
        (t.ticketNumber || '').toLowerCase(),
        (t.plate || '').toLowerCase(),
      ].filter((i) => i.length >= 4);

      let isDuplicate = false;
      for (const ident of identities) {
        if (seenIdentities.has(ident)) {
          isDuplicate = true;
          break;
        }

        for (const seen of seenIdentities) {
          if (ident.length >= 8 && seen.length >= 8) {
            if (ident.startsWith(seen) || seen.startsWith(ident)) {
              isDuplicate = true;
              break;
            }
          }
        }
        if (isDuplicate) break;
      }

      if (!isDuplicate) {
        result.push(t);
        identities.forEach((i) => seenIdentities.add(i));
      }
    }
    return result;
  }

  private upsertExitTicketRow(
    ticketId: number | string,
    plate: string,
    ticketNumber: string | undefined,
    price: number | null | undefined,
    isCollectedByCashier: boolean,
  ): void {
    const numericPrice = Number(price ?? 0);
    const gateData = this.auth.getGateData();
    const gateValue = gateData?.gateNumber != null ? String(gateData.gateNumber) : '';
    const nowIso = new Date().toISOString();

    const idStr = String(ticketId).toLowerCase();
    const displayId = ticketNumber || plate || idStr;

    // Try to find existing by ID or Ticket Number or Plate (with fuzzy match)
    const idx = this.tickets.findIndex((t) => {
      const tId = String(t.id).toLowerCase();
      const tNum = (t.ticketNumber || '').toLowerCase();
      const tPlate = (t.plate || '').toLowerCase();

      const matches = (val: string) => {
        if (!val) return false;
        val = val.toLowerCase();
        // Exact match
        if (tId === val || tNum === val || tPlate === val) return true;
        // Fuzzy prefix match (min 8 chars)
        if (val.length >= 8) {
          if (tId.length >= 8 && (tId.startsWith(val) || val.startsWith(tId))) return true;
          if (tNum.length >= 8 && (tNum.startsWith(val) || val.startsWith(tNum))) return true;
        }
        return false;
      };

      return matches(idStr) || (plate && matches(plate));
    });

    if (idx >= 0) {
      const oldPrice = Number(this.tickets[idx].price ?? 0);
      this.totalPriceToday = this.totalPriceToday - oldPrice + numericPrice;

      const updatedTicket: TicketDto = {
        ...this.tickets[idx],
        plate: plate || this.tickets[idx].plate,
        action: 'OUT',
        time: nowIso,
        gate: gateValue || this.tickets[idx].gate,
        price: numericPrice,
        isCollectedByCashier: isCollectedByCashier,
        ticketNumber: ticketNumber || this.tickets[idx].ticketNumber,
        info: displayId,
      };

      // Immutable update to trigger Change Detection
      const newTickets = [...this.tickets];
      newTickets[idx] = updatedTicket;
      this.tickets = this.deduplicateTickets(newTickets);
    } else {
      const row: TicketDto = {
        id: ticketId,
        ticketNumber: ticketNumber || displayId,
        plate: plate || '',
        action: 'OUT',
        time: nowIso,
        gate: gateValue,
        price: numericPrice,
        isCollectedByCashier: isCollectedByCashier,
        info: displayId,
      };

      this.tickets = this.deduplicateTickets([row, ...this.tickets]);
      this.totalPriceToday = this.totalPriceToday + numericPrice;
    }

    this.applyFilters();
  }
}
