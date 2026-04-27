import { Component, Inject, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
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
} from '../../Domain/tickets/tickets.model';
import { TicketsServices } from '../../Services/Tickets/tickets-services';

import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import {
  GateConnectionInfo,
  GateServices,
  OpenGateResponse,
} from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType, GateDevicePeripheral, GateDto } from '../../Domain/Auth/auth.models';
import { LocalHealthService } from '../../Services/Gate/local-health.service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { NfcReaderService } from '../../Services/registration/nfc-reader.service';

import { ExitGateDevicesBlockComponent } from './exit-gate-devices-block-component/exit-gate-devices-block-component';
import { ExitTicketsTableBlockComponent } from './exit-tickets-table-block-component/exit-tickets-table-block-component';
import { ExitValidationBlockComponent } from './exit-validation-block-component/exit-validation-block-component';
import { SearchBlockComponent } from '../Shared/search-block-component/search-block-component';
import { ExitTourService } from '../../Services/Exit/exit-tour.service';

import { DashboardHubService } from '../../Services/OverView/dashboard-hub.service';
import { TicketExitedNotification } from '../../Domain/OverView/dashboard-notifications.model';
import { ScanHubService, ScanFileMessage } from '../../Services/Gate/scan-hub.service';
import {
  LprSignalRService,
  LprVehicleDetectedEvent,
} from '../../Services/Gate/lpr-signalr.service';
import { SanctionService } from '../../Services/Sanction/sanction.service';
import { SanctionDto } from '../../Domain/Sanction/sanction.models';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SupervisorModalBlockComponent } from '../Shared/supervisor-modal-block-component/supervisor-modal-block-component';
import { TicketDetailsModalBlockComponent } from '../Shared/ticket-details-modal-block-component/ticket-details-modal-block-component';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';

@Component({
  selector: 'app-exitgate-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExitGateDevicesBlockComponent,
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
      useValue: <I18nDict>{
        ar: {
          exitTicket: 'بوابة الخروج',
          EXIT: 'خروج',
          readyToCollect: 'جاهز للتحصيل',
          scanHint: 'امسح التذكرة من اليمين لعرض التفاصيل والتحصيل',
          id: 'المعرف',
          plate: 'اللوحة',
          start: 'البداية',
          end: 'النهاية',
          price: 'السعر',
          exceed: 'الزيادة',
          total: 'الإجمالي',
          totalDue: 'الإجمالي المستحق',
          closeAndCollect: 'إغلاق وتحصيل',
          exitModeNote: 'في وضع الخروج لا يمكن إصدار تذاكر جديدة — فقط تحصيل وإغلاق.',
          scanAndCollect: 'مسح وتحصيل',
          scannerReady: 'الماسح جاهز',
          scanLabel: 'مسح QR / لصق الكود',
          scanPlaceholder: 'ضع المؤشر هنا ثم امسح...',
          collect: 'تحصيل',
          emptyState: 'امسح تذكرة أو كارت لعرض التفاصيل والتحصيل.',
          ticketsExit: 'التذاكر — خروج',
          searchPlaceholder: 'بحث بالمعرف / اللوحة',
          allGates: 'كل البوابات',
          action: 'الإجراء',
          gate: 'البوابة',
          time: 'الوقت',
          noTickets: 'لا توجد تذاكر',
          showing: 'عرض',
          of: 'من',
          prev: 'السابق',
          next: 'التالي',
          outOnlyTitle: 'بوابة الخروج تدعم OUT فقط',
          collectedOk: 'تم التحصيل وإغلاق التذكرة',
          collectAllToday: 'تحصيل إيرادات اليوم للبوابة',
          sanctions: 'الغرامات',
          select_sanction_placeholder: 'اختر غرامة للتحصيل...',

          // Gate devices
          gate_devices: 'أجهزة البوابة',
          devices_status: 'حالة الأجهزة',
          pc_device: 'جهاز الحاسب (PC)',
          lpr_device: 'كاميرا قراءة اللوحات (LPR)',
          device_connected: 'متصل / مفعّل',
          device_not_connected: 'غير متوفر',
          ip_address: 'العنوان',
          no_gate_devices: 'لم يتم ربط أجهزة بهذه البوابة بعد',

          // manual plate
          manual_plate_label: 'إدخال رقم السيارة يدويًا',
          manual_plate_placeholder: 'اكتب رقم السيارة يدويًا في حالة عدم توفر أي جهاز',
          send_manual_plate: 'تسجيل مرور المركبة يدويًا',

          // Ticket number search
          search_ticket_number: 'البحث برقم التذكرة',
          ticket_number_placeholder: 'أدخل رقم التذكرة',
          search_ticket: 'بحث',
          search_ticket_hint: 'ابحث عن تذكرة برقمها لعرض تفاصيلها وتحصيلها',

          // Tickets list
          tickets: 'التذاكر',
          fees: 'الرسوم',
          cashierCollectedShort: 'تم',
          total_fees_today: 'إجمالي الرسوم اليوم',

          // NFC / base
          readCard: 'قراءة الكارت',
          reading: 'جاري القراءة…',
          readCardTitle: 'قراءة رقم الكارت من قارئ الـ NFC',
          addExitTicket: 'تسجيل التذكرة عند الخروج',
          exitTicketAdded: 'تم تسجيل التذكرة عند الخروج',
          exitTicketAddFailed: 'تعذر تسجيل التذكرة عند الخروج',

          // NEW: QR scan button
          scan_qr_title: 'مسح كود الـ QR',
          scanning_qr: 'جاري مسح كود الـ QR…',
          scan_qr: 'مسح كود QR',

          // Manual input (card / QR)
          manual_input_label: 'إدخال رقم الكارت / كود الـ QR يدويًا',
          manual_input_placeholder: 'اكتب رقم الكارت أو كود الـ QR هنا يدويًا',

          // Salary summary
          salary_total: 'الإجمالي المستحق',
          salary_enter_date: 'وقت الدخول',
          salary_exit_valid: 'صلاحية الخروج',
          salary_cashier_collected: 'تم التحصيل من الكاشير',
          yes: 'نعم',
          no: 'لا',
          cashier_not_collected: 'لم يتم التحصيل',

          // Confirm & print
          print: 'طباعة',
          confirm_and_collect: 'تأكيد التحصيل',

          // Errors
          exit_not_valid_msg: 'الخروج غير صالح لهذه التذكرة',
          already_collected_msg: 'تم تحصيل هذه التذكرة من قبل بالفعل',

          // Collect summary (daily)
          collect_summary: 'ملخص تحصيل اليوم',
          total_collected_amount: 'إجمالي المبلغ المحصَّل',
          total_collected_tickets: 'عدد التذاكر المحصَّلة',
          collected_at: 'وقت التحصيل',
          last_collection_time: 'وقت آخر تحصيل',
          collectDailyOk: 'تم تحصيل إيرادات اليوم بنجاح',

          // Supervisor / cashier modal
          cashier_status: 'حالة التحصيل',
          cancel: 'إلغاء',
          confirm: 'تأكيد',
          save: 'حفظ',
          admit_done: 'تم التحصيل بنجاح',
          cashier_collected_yes: 'تم التحصيل من الزائر',
          cashier_confirm_button: 'تأكيد تحصيل الكاشير',

          open_gate: 'فتح البوابة ومرور المركبة',

          // Search
          search_tickets_placeholder: 'ابحث برقم التذكرة، اللوحة، أو الكارت',
          search_tickets: 'بحث التذاكر',
          no_search_results: 'لا توجد نتائج',
          searching: 'جاري البحث...',

          exit_notification_title: 'تذكرة خروج جديدة',
          collectCashierOk: 'تم تأكيد تحصيل الكاشير بنجاح',

          // Missing
          calculate_total_manual: 'حساب الإجمالي المستحق',
          egp: 'ج.م',
          supervisor_username: 'اسم المستخدم للمشرف',
          supervisor_password: 'كلمة المرور للمشرف',
          guide_tour: 'شرح الواجهة',
          ticket_already_collected: 'التذكرة {0} تم تحصيلها مسبقًا {1}',
          ticket_selected_success: 'تم اختيار التذكرة: {0}',
          ticket_not_found: 'لم يتم العثور على بيانات التذكرة: {0}',
          subscriber_card_found: 'تم العثور على بطاقة المشترك: {0}',
          incorrect_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',

          supervisor_mode: 'وضع المشرف',
          detected_vehicle_number: 'رقم السيارة المكتشف',
          validation_status: 'حالة التحقق',
          ticket_number: 'رقم التذكرة',
          start_date: 'تاريخ البداية',
          card_number: 'رقم الكارت',
          vehicle_number: 'رقم السيارة',
          message: 'الرسالة',
          validate: 'تحقق',
          valid_for_exit: 'صالح للخروج',
          not_valid_for_exit: 'غير صالح للخروج',
          text_required: 'النص مطلوب',
          enter_card_or_qr: 'أدخل رقم الكارت أو كود الـ QR',
          scan_or_enter_exit_text_placeholder: 'امسح QR أو أدخل رقم الكارت أو رقم السيارة',
          validate_open_gate: 'تحقق وافتح البوابة',
          auto_validation_hint: 'يتم التحقق تلقائيًا بعد قراءة QR أو الكارت أو رقم السيارة',
          last_validation_input: 'آخر قراءة',
          gate_connection_required: 'بيانات اتصال البوابة غير محملة',
          allowed_for_exit: 'مسموح بالخروج',
          gate_opened_successfully: 'تم فتح البوابة بنجاح',
          open_gate_failed: 'فشل فتح البوابة',
          opening_gate: 'جاري فتح البوابة...',
          ticket_already_exited_msg: 'التذكرة خرجت بالفعل',
          ticket_not_valid_today_msg: 'التذكرة غير صالحة لليوم',
          failed_to_validate: 'فشل التحقق من الخروج، يرجى المحاولة مرة أخرى',
          no_matching_ticket: 'لم يتم العثور على تذكرة مطابقة',
          lpr_detection: 'اكتشاف السيارة (LPR)',
          lpr_vehicle_received: 'تم استقبال رقم السيارة من LPR',
          lpr_gate_mismatch: 'تم تجاهل قراءة LPR لأنها تخص بوابة مختلفة',
          manual_validation: 'التحقق اليدوي',
          validation_result: 'نتيجة التحقق',
          match_type: 'نوع التطابق',
        },
        en: {
          exitTicket: 'Exit Gate',
          EXIT: 'EXIT',
          readyToCollect: 'Ready to collect',
          scanHint: 'Scan the ticket to view details and collect.',
          id: 'ID',
          plate: 'Plate',
          start: 'Start',
          end: 'End',
          price: 'Price',
          exceed: 'Exceed',
          total: 'Total',
          totalDue: 'Total Due',
          closeAndCollect: 'Close & Collect',
          exitModeNote: 'In Exit mode you cannot issue new tickets — only collect & close.',
          scanAndCollect: 'Scan & Collect',
          scannerReady: 'Scanner ready',
          scanLabel: 'Scan QR / Paste Code',
          scanPlaceholder: 'Focus here then scan...',
          collect: 'Collect',
          emptyState: 'Scan a ticket or card to show its details and collect payment.',
          ticketsExit: 'Tickets — Exit',
          searchPlaceholder: 'Search ID / Plate',
          allGates: 'All gates',
          action: 'Action',
          gate: 'Gate',
          time: 'Time',
          noTickets: 'No tickets',
          showing: 'Showing',
          of: 'of',
          prev: 'Prev',
          next: 'Next',
          outOnlyTitle: 'Exit gate is OUT only',
          collectedOk: 'Collected and ticket closed',
          collectAllToday: "Collect today's revenue for this gate",
          sanctions: 'Fines',
          select_sanction_placeholder: 'Select fine to apply...',

          // Gate devices
          gate_devices: 'Gate Devices',
          devices_status: 'Devices Status',
          pc_device: 'PC',
          lpr_device: 'LPR Camera',
          device_connected: 'Connected / Enabled',
          device_not_connected: 'Not available',
          ip_address: 'IP Address',
          no_gate_devices: 'No devices are linked to this gate yet',

          // manual plate
          manual_plate_label: 'Manual vehicle plate input',
          manual_plate_placeholder: 'Type the vehicle plate when no devices are available',
          send_manual_plate: 'Log vehicle pass',

          // Ticket number search
          search_ticket_number: 'Search by ticket number',
          ticket_number_placeholder: 'Enter ticket number',
          search_ticket: 'Search',
          search_ticket_hint: 'Search for a ticket by its number to view details and collect',

          // Tickets list
          tickets: 'Tickets',
          fees: 'Fees',
          cashierCollectedShort: 'OK',
          total_fees_today: 'Total fees today',

          // NFC / base
          readCard: 'Read card',
          reading: 'Reading…',
          readCardTitle: 'Read card UID from NFC reader',
          addExitTicket: 'Add exit ticket log',
          exitTicketAdded: 'Exit ticket log has been saved',
          exitTicketAddFailed: 'Failed to save exit ticket log',

          // NEW: QR scan
          scan_qr_title: 'Scan QR code',
          scanning_qr: 'Scanning QR code…',
          scan_qr: 'Scan QR code',

          // Manual card / QR
          manual_input_label: 'Manual card / QR input',
          manual_input_placeholder: 'Type the card number or QR code here',

          // Salary summary
          salary_total: 'Total salary',
          salary_enter_date: 'Enter date',
          salary_exit_valid: 'Exit valid',
          salary_cashier_collected: 'Collected at cashier',
          yes: 'Yes',
          no: 'No',
          cashier_not_collected: 'Not collected',

          // Confirm & print
          print: 'Print',
          confirm_and_collect: 'Confirm & collect',

          // Errors
          exit_not_valid_msg: 'Exit is not valid for this ticket',
          already_collected_msg: 'This ticket has already been collected',

          // Collect summary (daily)
          collect_summary: 'Daily collection summary',
          total_collected_amount: 'Total collected amount',
          total_collected_tickets: 'Total collected tickets',
          collected_at: 'Collected at',
          last_collection_time: 'Last collection time',
          collectDailyOk: "Today's revenue has been collected successfully",

          // Supervisor / cashier modal
          cashier_status: 'Cashier status',
          cancel: 'Cancel',
          confirm: 'Confirm',
          save: 'Save',
          admit_done: 'Collected successfully',
          cashier_collected_yes: 'Cash collected from visitor',
          cashier_confirm_button: 'Confirm cashier collection',

          open_gate: 'Open gate & let vehicle pass',

          // Search
          search_tickets_placeholder: 'Search by ticket, plate, or card number',
          search_tickets: 'Search Tickets',
          no_search_results: 'No results found',
          searching: 'Searching...',

          //  NEW
          exit_notification_title: 'New exit ticket',
          collectCashierOk: 'Cashier collection confirmed successfully',

          // Missing
          calculate_total_manual: 'Calculate Total',
          egp: 'EGP',
          supervisor_username: 'Supervisor username',
          supervisor_password: 'Supervisor password',
          guide_tour: 'Guide',
          ticket_already_collected: 'Ticket {0} was already collected {1}',
          ticket_selected_success: 'Selected ticket: {0}',
          ticket_not_found: 'Ticket details not found: {0}',
          subscriber_card_found: 'Subscriber card found: {0}',
          incorrect_credentials: 'Incorrect user name or password',

          supervisor_mode: 'Supervisor mode',
          detected_vehicle_number: 'Detected Vehicle Number',
          validation_status: 'Validation Status',
          ticket_number: 'Ticket Number',
          start_date: 'Start Date',
          card_number: 'Card Number',
          vehicle_number: 'Vehicle Number',
          message: 'Message',
          validate: 'Validate',
          valid_for_exit: 'Valid for exit',
          not_valid_for_exit: 'Not valid for exit',
          text_required: 'Text is required',
          enter_card_or_qr: 'Enter Card Number or QR Code',
          scan_or_enter_exit_text_placeholder: 'Scan QR Code / Enter Card Number / Vehicle Number',
          validate_open_gate: 'Validate & Open Gate',
          auto_validation_hint: 'Auto-validates after QR, card, or vehicle number input',
          last_validation_input: 'Last input',
          gate_connection_required: 'Gate connection info is not loaded',
          allowed_for_exit: 'Allowed for exit',
          gate_opened_successfully: 'Gate opened successfully',
          open_gate_failed: 'Failed to open gate',
          opening_gate: 'Opening gate...',
          ticket_already_exited_msg: 'Ticket already exited',
          ticket_not_valid_today_msg: 'Ticket is not valid for today',
          failed_to_validate: 'Failed to validate exit, please try again',
          no_matching_ticket: 'No matching ticket found',
          lpr_detection: 'LPR Detection',
          lpr_vehicle_received: 'LPR vehicle received',
          lpr_gate_mismatch: 'Ignored LPR detection for a different gate',
          manual_validation: 'Manual Validation',
          validation_result: 'Validation Result',
          match_type: 'Match Type',
        },
      },
    },
  ],
})
export class ExitgateComponent implements OnInit, OnDestroy {
  // ====== Injects ======
  private readonly svc = inject(TicketsServices);
  private readonly gateSvc = inject(GateServices);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastServices);
  private readonly nfc = inject(NfcReaderService);
  private readonly exitTour = inject(ExitTourService);
  private readonly router = inject(Router);

  // NEW: SignalR Hub
  private readonly dashboardHub = inject(DashboardHubService);
  private readonly scanHub = inject(ScanHubService);
  private readonly lprSignalR = inject(LprSignalRService);
  private readonly sanctionSvc = inject(SanctionService);
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
    let text = this.dict[this.lang.current]?.[key] ?? key;
    if (params && params.length > 0) {
      params.forEach((p, i) => {
        text = text.replace(`{${i}}`, p);
      });
    }
    return text;
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
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly errorExtractor = inject(ErrorExtractorService);

  // ====== Real-time Search ======
  searchingTickets = false;
  searchResults: TicketDto[] = [];

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

  supervisorUsername = '';
  supervisorPassword = '';
  supervisorCollectLoading = false;
  showSupervisorCollectModal = false;
  supervisorCollectError: string | null = null;

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
    return !!this.gateConnectionInfo?.controlIp?.trim();
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
      .catch((err) => console.error('LPR SignalR (Exitgate) connection error', err));

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
    this.toast.success(this.t('scanner_ready') + ': ' + msg.fileName);

    if (this.scannedFile?.url) {
      URL.revokeObjectURL(this.scannedFile.url);
    }

    try {
      let data: Uint8Array;
      if (typeof msg.bytes === 'string') {
        const binaryString = window.atob(msg.bytes);
        data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          data[i] = binaryString.charCodeAt(i);
        }
      } else if (msg.bytes instanceof ArrayBuffer) {
        data = new Uint8Array(msg.bytes);
      } else {
        data = new Uint8Array(msg.bytes as any);
      }

      console.log('ExitgateComponent: Final data size:', data.length);
      const blob = new Blob([data as any], { type: msg.contentType });
      const rawUrl = URL.createObjectURL(blob);

      this.scannedFile = {
        name: msg.fileName,
        url: rawUrl,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl),
        type: msg.contentType,
        bytes: msg.bytes,
      };

      console.log('ExitgateComponent: Processed file', msg.fileName);
      this.cdr.markForCheck();
    } catch (err) {
      console.error('ExitgateComponent: Error rendering scan', err);
      this.toast.error('Error rendering scan');
    }
  }

  ngOnDestroy(): void {
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
      this.toast.warn(message);
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

    this.toast.success(`${this.t('lpr_vehicle_received')}: ${vehicleNumber}`);
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
      this.toast.warn(
        this.lang.current === 'ar' ? 'يرجى اختيار بوابة أولاً' : 'Please select a gate first',
      );
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

    this.gateSvc.getGateConnectionInfo(gateId).subscribe({
      next: (info) => {
        this.gateConnectionInfo = info;
        if (!info?.controlIp?.trim()) {
          this.gateConnectionError = this.t('gate_connection_required');
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

  private handleError(operation: string, err: any): void {
    console.error(`${operation} error`, err);
    this.toast.fromProblem(err);
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
        this.toast.success(msg);
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

        this.toast.success(this.t('outOnlyTitle'));
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
    this.loadSanctions();
  }

  // =======================
  // Real-time search (SearchBlockComponent)
  // =======================
  onSearchTickets(query: string): void {
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
      this.toast.warn(this.t('ticket_already_collected', [identifier, summaryText]));
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

    const controllerId = this.gateConnectionInfo?.controlIp?.trim();
    if (!controllerId) {
      this.validationOpenGateError = this.t('gate_connection_required');
      this.toast.warn(this.validationOpenGateError);
      this.focusValidationTextNonce++;
      return;
    }

    this.lprMembershipLoading = true;
    this.validationError = null;
    this.validationOpenGateError = null;
    this.validationMessage = this.t('searching');

    this.svc.isMembership(normalized).subscribe({
      next: (membership) => {
        if (!membership?.isExist) {
          this.validationMessage = this.t('not_valid_for_exit');
          this.toast.warn(this.t('not_valid_for_exit'));
          this.focusValidationTextNonce++;
          return;
        }

        this.createMembershipExitTicketAndOpenGate(
          normalized,
          membership.cardNumber ?? (membership.summary as any)?.cardNumber ?? (membership.summary as any)?.CardNumber ?? undefined,
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
            this.validationOpenGateError = this.t('exitTicketAddFailed');
            this.toast.error(this.validationOpenGateError);
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
    this.validationError = null;
    this.validationMessage = null;
    this.vehicleValidationLoading = true;
    this.vehicleValidationResult = null;
    this.textValidationResult = null;

    this.svc.validateExitByVehicleNumber(this.detectedVehicleNumber).subscribe({
      next: (res) => {
        this.vehicleValidationResult = res;
        this.vehicleValidationLoading = false;
        if (res.isValidForExit) {
          this.validationMessage = this.t('valid_for_exit');
          this.toast.success(this.t('valid_for_exit'));
        } else if (res.ticketId) {
          this.validationMessage = this.t('not_valid_for_exit');
          this.toast.warn(this.t('not_valid_for_exit'));
        } else {
          this.validationMessage = this.t('no_matching_ticket');
          this.toast.warn(this.t('no_matching_ticket'));
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
      this.validationError = this.t('text_required');
      this.toast.warn(this.t('text_required'));
      this.focusValidationTextNonce++;
      return;
    }

    if (trimmed.length > 200) {
      this.validationError = this.t('text_required');
      this.toast.warn(this.validationError);
      this.focusValidationTextNonce++;
      return;
    }

    if (!this.isExitGateConnectionReady) {
      this.validationError = this.t('gate_connection_required');
      this.toast.warn(this.validationError);
      this.focusValidationTextNonce++;
      return;
    }

    this.validationError = null;
    this.validationOpenGateError = null;
    this.validationMessage = null;
    this.pendingValidationSource = source;
    this.clearExitValidationInput(source);
    this.textValidationLoading = true;
    this.textValidationResult = null;
    this.vehicleValidationResult = null;
    this.lastValidationOpenGateResponse = null;

    this.svc.validateExitByText({ text: trimmed }).subscribe({
      next: (res) => {
        this.textValidationResult = res;
        this.textValidationLoading = false;
        if (res.isValidForExit) {
          this.validationMessage = this.t('allowed_for_exit');
          this.toast.success(this.t('allowed_for_exit'));
          this.registerValidatedExitAndOpenGate();
        } else {
          this.validationMessage = this.getExitValidationBusinessMessage(res);
          this.toast.warn(this.validationMessage);
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
    const result = this.textValidationResult;
    const controllerId = this.gateConnectionInfo?.controlIp?.trim();

    if (
      !result?.isValidForExit ||
      !result.ticketId ||
      !controllerId ||
      this.addingExitTicket ||
      this.validationOpenGateLoading
    ) {
      if (!result?.ticketId) {
        this.validationOpenGateError = this.t('no_matching_ticket');
        this.toast.warn(this.validationOpenGateError);
      }
      if (!controllerId) {
        this.validationOpenGateError = this.t('gate_connection_required');
        this.toast.warn(this.validationOpenGateError);
      }
      return;
    }

    this.addingExitTicket = true;
    this.validationOpenGateError = null;
    this.validationMessage = this.t('exitTicketAdded');

    this.svc.addExitTicket(result.ticketId).subscribe({
      next: () => {
        this.upsertExitTicketRow(
          result.ticketId!,
          result.vehicleNumber || result.cardNumber || result.inputText || '',
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
        this.validationMessage = this.t('gate_opened_successfully');
        this.toast.success(this.t('gate_opened_successfully'));
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
        this.validationOpenGateError = this.t('open_gate_failed');
        this.toast.error(this.validationOpenGateError);
        this.focusValidationTextNonce++;
        this.processPendingExitValidation();
      },
      complete: () => {
        this.validationOpenGateLoading = false;
        this.processPendingExitValidation();
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
    let text = String(value ?? '').replace(/[\r\n]+/g, '').trim();

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

    text = text.replace(/^[\s"'“”«»]+/, '').replace(/[\s"'“”«»]+$/, '').trim();

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
    return String(value ?? '').replace(/[\r\n]+/g, '').trim();
  }

  onConfirmValidationExit(ticketId: string): void {
    const res = this.vehicleValidationResult || this.textValidationResult;
    if (!res || res.ticketId !== ticketId || !res.isValidForExit) {
      this.toast.warn(this.t('not_valid_for_exit'));
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
          this.toast.error(this.t('no_search_results'));
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
          this.toast.success(this.t('ticket_selected_success', [identifier]));
        } else {
          if (isForcedTicket) {
            this.searchingManual = false;
            this.toast.error(this.t('ticket_not_found', [code]));
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
          this.toast.success(this.t('subscriber_card_found', [cardNumber]));
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
      this.toast.error(this.t('exit_not_valid_msg'));
      return;
    }

    if (!this.scannedTicket) {
      this.toast.error('لا توجد تذكرة مرتبطة بهذا الكود لإتمام الخروج.');
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
          this.toast.success(this.t('exitTicketAdded'));

          const price = this.currentTotalWithSanctions || this.scannedTicket!.price;
          this.upsertExitTicketRow(
            ticketId,
            this.scannedTicket!.ticketInfo || '',
            this.scannedTicket!.ticketNumber,
            price,
            false,
          );
        } else {
          this.toast.error(this.t('exitTicketAddFailed'));
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
        this.toast.success(this.t('collectCashierOk'));
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
      this.toast.error('لا يمكن تحصيل المبلغ: لا يوجد رقم تذكرة متاح.');
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
          this.toast.success(this.t('collectCashierOk'));
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

    this.svc.collectDailyTickets().subscribe({
      next: (res: CollectDailyTicketsResponse) => {
        this.collectSummary = res;
        this.toast.success(this.t('collectDailyOk'));
        this.reloadList();
      },
      error: (err) => {
        this.handleError('collectDailyForGate', err);
        this.collectLoading = false;
        this.collectSummary = null;
      },
      complete: () => {
        this.collectLoading = false;
      },
    });
  }

  submitSupervisorCollect(): void {
    const user = this.supervisorUsername.trim();
    const pwd = this.supervisorPassword;
    const gateNumber = this.auth.getGateData()?.gateNumber ?? null;
    const gateType = this.auth.getGateData()?.gateType ?? null;

    if (!user || !pwd) {
      this.supervisorCollectError = 'يرجى إدخال اسم المستخدم وكلمة المرور للسوبرفايزر';
      return;
    }

    this.supervisorCollectError = null;
    this.supervisorCollectLoading = true;
    this.collectSummary = null;

    this.svc
      .collectDailyTicketsAsSupervisor({
        userName: user,
        password: pwd,
        gateType,
        gateNumber,
      })
      .subscribe({
        next: (res: CollectDailyTicketsResponse) => {
          this.collectSummary = res;
          this.toast.success(this.t('admit_done'));
          this.exitTicketAdded = true;
          this.scannedFile = null; // Clear scan after success
          this.reloadList();
        },
        error: (err) => {
          if (err?.status === 403) {
            const msg = this.t('incorrect_credentials');
            this.supervisorCollectError = msg;
            this.toast.error(msg);
          } else {
            this.handleError('collectDailyTicketsAsSupervisor', err);
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
    this.showSupervisorCollectModal = true;
  }

  closeSupervisorCollectModal(): void {
    if (this.supervisorCollectLoading) return;

    this.showSupervisorCollectModal = false;
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.supervisorCollectError = null;
    this.collectSummary = null;
  }

  finishSupervisorCollect(): void {
    this.auth.updateToken(this.cashierToken ?? '');
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
      this.toast.error(err?.message || 'تعذر قراءة الكارت. تأكد من توصيل وتشغيل قارئ الـ NFC.');
    } finally {
      this.readingCard = false;
    }
  }

  // ========= Print =========

  printSummary(): void {
    if (!this.scannedTicket && !this.salarySummary) return;

    const t = this.scannedTicket;
    const s = this.salarySummary;

    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) return;

    const html = `
      <html>
        <head>
          <title>Exit Ticket</title>
          <style>
            body{margin:0;padding:16px;font-family:Arial, sans-serif;}
            .wrap{display:flex;flex-direction:column;gap:8px;}
            .row{display:flex;justify-content:space-between;font-size:14px;}
            .title{font-size:18px;font-weight:bold;margin-bottom:8px;}
            .mono{font-family:monospace;}
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="wrap">
            <div class="title">${this.t('exitTicket')}</div>
            ${
              t
                ? `
              <div class="row"><span>${this.t('id')}</span><span class="mono">${t.id}</span></div>
              <div class="row"><span>${this.t('plate')}</span><span class="mono">${
                t.ticketInfo || ''
              }</span></div>
              <div class="row"><span>${this.t('start')}</span><span>${new Date(
                t.startDate,
              ).toLocaleString()}</span></div>
              <div class="row"><span>${this.t('end')}</span><span>${new Date().toLocaleString()}</span></div>
              <div class="row"><span>${this.t(
                'totalDue',
              )}</span><span class="mono">${t.price.toFixed(2)}</span></div>
            `
                : ''
            }
            ${
              s
                ? `
              <hr/>
              <div class="title">${this.t('salary_total')}</div>
              <div class="row"><span>${this.t(
                'salary_total',
              )}</span><span class="mono">${this.currentTotalWithSanctions.toFixed(2)}</span></div>
              <div class="row"><span>${this.t('salary_enter_date')}</span><span>${new Date(
                s.enterDate,
              ).toLocaleString()}</span></div>
              <div class="row"><span>${this.t('salary_exit_valid')}</span><span>${
                s.isExitValid ? this.t('yes') : this.t('no')
              }</span></div>
              <div class="row"><span>${this.t('salary_cashier_collected')}</span><span>${
                s.isCollectByCashier
                  ? this.t('cashierCollectedShort')
                  : this.t('cashier_not_collected')
              }</span></div>
            `
                : ''
            }
          </div>
        </body>
      </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  // ========= Helpers =========

  private resetScanState(): void {
    this.universalInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = null;
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
