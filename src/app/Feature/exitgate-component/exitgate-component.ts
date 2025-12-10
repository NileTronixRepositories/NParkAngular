import { Component, Inject, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  TicketDto,
  TicketAction,
  TicketDetailsDto,
  CollectDailyTicketsResponse,
  CalculateSalaryResponse,
} from '../../Domain/tickets/tickets.model';
import { TicketsServices } from '../../Services/Tickets/tickets-services';

import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { GateServices } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType, GateDevicePeripheral, GateDto } from '../../Domain/Auth/auth.models';
import { ToastServices } from '../../Services/Toster/toast-services';
import { NfcReaderService } from '../../Services/registration/nfc-reader.service';

import { ExitGateDevicesBlockComponent } from './exit-gate-devices-block-component/exit-gate-devices-block-component';
import { ExitScanCollectBlockComponent } from './exit-scan-collect-block-component/exit-scan-collect-block-component';
import { ExitTicketsTableBlockComponent } from './exit-tickets-table-block-component/exit-tickets-table-block-component';
import { SearchBlockComponent } from '../Shared/search-block-component/search-block-component';
import { ExitTourService } from '../../Services/Exit/exit-tour.service';

// 🔔 NEW: SignalR dashboard hub + notifications model + Subscription
import { DashboardHubService } from '../../Services/OverView/dashboard-hub.service';
import { TicketExitedNotification } from '../../Domain/OverView/dashboard-notifications.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-exitgate-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ExitGateDevicesBlockComponent,
    ExitScanCollectBlockComponent,
    ExitTicketsTableBlockComponent,
    SearchBlockComponent,
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

          // 🔔 NEW: نص للـ Notification لو حبيت تستخدمه مستقبلاً
          exit_notification_title: 'تذكرة خروج جديدة',
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

          // 🔔 NEW
          exit_notification_title: 'New exit ticket',
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

  // 🔔 NEW: SignalR Hub
  private readonly dashboardHub = inject(DashboardHubService);
  private readonly hubSubscriptions = new Subscription();

  startTour(): void {
    this.exitTour.startTour();
  }

  constructor(public lang: LanguageService, @Inject(I18N_DICT) private dict: I18nDict) {}

  t(key: string): string {
    return this.dict[this.lang.current]?.[key] ?? key;
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

  // ====== Real-time Search ======
  searchingTickets = false;
  searchResults: TicketDto[] = [];

  searchingTicketNumber = false;

  // ====== QR / Manual input / salary ======
  scanBuffer = '';
  scanning = false;
  scanningQR = false;

  manualInput = '';
  searchingManual = false;

  scannedTicket: TicketDetailsDto | null = null;
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

  showSupervisorCollectModal = false;
  supervisorUsername = '';
  supervisorPassword = '';
  supervisorCollectLoading = false;
  supervisorCollectError: string | null = null;

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

  get isSupervisor(): boolean {
    return this.auth.isSupervisor;
  }

  // ========= Lifecycle =========

  ngOnInit(): void {
    this.cashierToken = this.auth.token;
    this.initGatePeripheral();
    this.loadExitGates();
    this.reloadList();
    this.initSignalRExitNotifications(); // 🔔 NEW
  }

  ngOnDestroy(): void {
    this.hubSubscriptions.unsubscribe();
    this.dashboardHub.stop();
  }

  // ========= Init helpers =========

  private getStartOfDayIso(): string {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  private initGatePeripheral(): void {
    this.gatePeripheral = this.auth.getGateData();

    if (this.gatePeripheral || !this.auth.isLoggedIn()) {
      return;
    }

    this.auth.checkGate().subscribe({
      next: (res) => {
        if (res?.gateDevicePeripheral) {
          this.gatePeripheral = res.gateDevicePeripheral;
        } else {
          this.gatePeripheral = this.auth.getGateData();
        }
      },
      error: (err) => {
        this.handleError('CheckGate', err);
        this.gatePeripheral = this.auth.getGateData();
      },
    });
  }

  private handleError(operation: string, err: any): void {
    console.error(`${operation} error`, err);
    this.toast.fromProblem(err);
  }

  // ========= 🔔 SignalR Exit Notifications =========

  /**
   * Connect to DashboardHubService and listen to TicketExited notifications.
   * لما يحصل خروج من أي بوابة، بنحدّث الـ list + نطلع Toast.
   */
  private initSignalRExitNotifications(): void {
    // نضمن إن الـ Hub متوصل (idempotent)
    this.dashboardHub
      .start()
      .catch((err) => console.error('DashboardHub (Exitgate) connection error', err));

    // نسمع على TicketExited stream
    this.hubSubscriptions.add(
      this.dashboardHub.ticketExited$.subscribe((n: TicketExitedNotification) => {
        // 1) نحدّث جدول التذاكر وإجمالي اليوم
        this.reloadList();

        // 2) Notification للي واقف على شاشة الخروج
        const msg = this.buildExitNotificationMessage(n);
        this.toast.success(msg);
      })
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
      },
      error: (err) => {
        this.handleError('selectGate', err);
        this.gateSaving = false;
      },
    });
  }

  // ========= Tickets list / filters =========

  private loadTicketsForExit(startDateIso: string, ticketNumber: string = ''): void {
    this.loading = true;

    this.svc.getTicketsForExit(startDateIso, ticketNumber).subscribe({
      next: (res) => {
        this.totalPriceToday = res.totalPrice ?? 0;

        this.tickets = (res.items ?? [])
          .filter((t: TicketDto) => t.action === 'OUT')
          .sort(
            (a: TicketDto, b: TicketDto) => new Date(b.time).getTime() - new Date(a.time).getTime()
          );

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
    if (this.scanningQR) return;

    this.scanningQR = true;
    this.scanBuffer = '';
    this.manualInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.addingExitTicket = false;
    this.exitTicketAdded = false;
  }

  submitQrFromInput(): void {
    let code = this.scanBuffer?.trim();
    if (!code) {
      this.scanningQR = false;
      return;
    }

    if (code.startsWith('"') && code.endsWith('"') && code.length > 1) {
      code = code.substring(1, code.length - 1).trim();
    }

    this.scanningQR = false;
    this.lastQrCode = code;

    this.manualInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    this.fetchTicketAndSalaryByQr(code);
  }

  searchManual(): void {
    const code = this.manualInput?.trim();
    if (!code) return;

    // Reset QR state
    this.scanBuffer = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = null;

    this.scanning = false;
    this.searchingManual = true;

    this.svc.calculateSubscriberSalary(code).subscribe({
      next: (summary) => {
        this.salarySummary = summary;
      },
      error: (err) => {
        this.handleError('calculateSubscriberSalary (manual)', err);
        this.searchingManual = false;
      },
      complete: () => {
        this.searchingManual = false;
      },
    });
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
      this.toast.warn(
        this.lang.current === 'ar'
          ? `التذكرة ${identifier} تم تحصيلها مسبقًا${summaryText}`
          : `Ticket ${identifier} was already collected${summaryText}`
      );
    } else {
      this.toast.success(
        this.lang.current === 'ar'
          ? `تم اختيار التذكرة: ${identifier}${summaryText}`
          : `Selected ticket: ${identifier}${summaryText}`
      );
    }

    this.onSearchTicketNumber(identifier);
    this.searchResults = [];
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

        // نحاول نلاقي تطابق كامل مع الرقم اللي المستخدم كتبه
        const exact =
          results.find(
            (r) => (r.ticketNumber ?? String(r.id)).toLowerCase() === trimmed.toLowerCase()
          ) ?? results[0];

        const identifier = exact.ticketNumber || String(exact.id);

        // نعيد استخدام نفس الflow اللي بيحسب Salary إلخ
        this.onSearchTicketNumber(identifier);
      },
      error: (err) => {
        this.handleError('searchTickets (gate devices)', err);
      },
      complete: () => {
        this.searchingTicketNumber = false;
      },
    });
  }

  /** QR Ticket: Get ticket + salary via CalculateQrCodeTicketSalary */
  private fetchTicketAndSalaryByQr(code: string): void {
    this.scanning = true;
    this.searchingManual = true;
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = code;

    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    // الملخص المالي
    this.svc.calculateTicketSalary(code).subscribe({
      next: (summary) => {
        this.salarySummary = summary;
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
  onSearchTicketNumber(ticketNumber: string): void {
    if (!ticketNumber?.trim()) return;

    const trimmed = ticketNumber.trim();

    // Reset states
    this.scanBuffer = '';
    this.manualInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = trimmed;

    this.addingExitTicket = false;
    this.exitTicketAdded = false;
    this.searchingManual = true;

    // Use calculateSalaryByTicketNumber which tries ticket number endpoint first, then falls back to QR
    this.svc.calculateSalaryByTicketNumber(trimmed).subscribe({
      next: (summary) => {
        this.salarySummary = summary;

        if (!summary) {
          this.toast.error(
            this.lang.current === 'ar'
              ? 'لم يتم العثور على بيانات التذكرة'
              : 'Ticket data not found'
          );
        }
      },
      error: (err) => {
        this.handleError('calculateSalaryByTicketNumber', err);
      },
      complete: () => {
        this.searchingManual = false;
      },
    });
  }

  /** Subscriber card: CalculateSalaryForSubscriberCommand فقط */
  private fetchSalaryForCard(cardNumber: string): void {
    this.scanning = false;
    this.searchingManual = true;
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = null;

    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    this.svc.calculateSubscriberSalary(cardNumber).subscribe({
      next: (summary) => {
        this.salarySummary = summary;
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

  addExitTicket(t: TicketDetailsDto): void {
    if (this.addingExitTicket || !t?.id) return;

    this.addingExitTicket = true;

    this.svc.addExitTicket(String(t.id)).subscribe({
      next: (ok) => {
        if (ok) {
          this.exitTicketAdded = true;

          const price = this.salarySummary?.totalSalary ?? t.totalPrice;
          this.upsertExitTicketRow(t.id, t.plate, price, false);
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

    if (this.salarySummary.isCollectByCashier) {
      this.toast.error(this.t('already_collected_msg'));
      return;
    }

    if (!this.scannedTicket) {
      this.toast.error('لا توجد تذكرة مرتبطة بهذا الكود لإتمام الخروج.');
      return;
    }

    const ticketId = this.scannedTicket.id;
    const qr = (this.lastQrCode ?? this.scanBuffer ?? '').trim();

    this.collecting = true;

    this.svc.addExitTicket(String(ticketId)).subscribe({
      next: (ok) => {
        if (!ok) {
          this.toast.error(this.t('exitTicketAddFailed'));
          return;
        }

        this.exitTicketAdded = true;

        this.svc.collect(ticketId).subscribe({
          next: () => {
            const price = this.salarySummary?.totalSalary ?? this.scannedTicket!.totalPrice;
            this.upsertExitTicketRow(ticketId, this.scannedTicket!.plate, price, false);

            if (qr) {
              this.svc.calculateTicketSalary(qr).subscribe({
                next: (summary) => {
                  this.salarySummary = summary;
                },
                error: (err) => {
                  this.handleError('recalculate salary after collect', err);
                },
              });
            }
          },
          error: (err) => {
            this.handleError('collect (confirmExit)', err);
          },
          complete: () => {
            this.collecting = false;
          },
        });
      },
      error: (err) => {
        this.handleError('addExitTicket (confirmExit)', err);
        this.collecting = false;
      },
    });
  }

  allowExitWithoutCollect(): void {
    if (!this.scannedTicket && !this.salarySummary) return;

    this.exitProcessing = true;

    // حالة: فيه تذكرة كاملة
    if (this.scannedTicket) {
      const ticketId = String(this.scannedTicket.id);

      this.svc.addExitTicket(ticketId).subscribe({
        next: (ok) => {
          if (ok) {
            const price = this.salarySummary?.totalSalary ?? 0;
            this.upsertExitTicketRow(
              this.scannedTicket!.id,
              this.scannedTicket!.plate,
              price,
              true
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

    // حالة: كارت مشترك فقط (بدون scannedTicket)
    if (this.salarySummary?.ticketId) {
      const ticketId = String(this.salarySummary.ticketId);

      this.svc.addExitTicket(ticketId).subscribe({
        next: (ok) => {
          if (ok) {
            const price = this.salarySummary?.totalSalary ?? 0;
            const plate = 'SUBSCRIBER';
            this.upsertExitTicketRow(ticketId, plate, price, true);
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
        this.upsertExitTicketRow(t.id, t.plate, t.totalPrice, false);
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

    this.svc.collectCashier(ticketId).subscribe({
      next: (ok) => {
        if (ok) {
          this.salarySummary = {
            ...this.salarySummary!,
            isCollectByCashier: true,
          };
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
          this.reloadList();
        },
        error: (err) => {
          this.handleError('collectDailyTicketsAsSupervisor', err);
          this.supervisorCollectError = 'فشل الدخول كـ Supervisor. تأكد من البيانات أو الصلاحيات.';
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

      this.scanBuffer = '';
      this.manualInput = normalized;
      this.lastQrCode = null;

      this.fetchSalaryForCard(normalized);
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
                    t.plate
                  }</span></div>
              <div class="row"><span>${this.t('start')}</span><span>${new Date(
                    t.dateTime
                  ).toLocaleString()}</span></div>
              <div class="row"><span>${this.t('end')}</span><span>${new Date(
                    t.endDate
                  ).toLocaleString()}</span></div>
              <div class="row"><span>${this.t(
                'totalDue'
              )}</span><span class="mono">${t.totalPrice.toFixed(2)}</span></div>
            `
                : ''
            }
            ${
              s
                ? `
              <hr/>
              <div class="title">${this.t('salary_total')}</div>
              <div class="row"><span>${this.t(
                'salary_total'
              )}</span><span class="mono">${s.totalSalary.toFixed(2)}</span></div>
              <div class="row"><span>${this.t('salary_enter_date')}</span><span>${new Date(
                    s.enterDate
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
    this.scanBuffer = '';
    this.manualInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.lastQrCode = null;
  }

  private upsertExitTicketRow(
    ticketId: number | string,
    plate: string,
    price: number | null | undefined,
    isCollectedByCashier: boolean
  ): void {
    const numericPrice = Number(price ?? 0);
    const gateNumber = this.auth.getGateData()?.gateNumber;
    const gate = gateNumber != null ? String(gateNumber) : '';
    const nowIso = new Date().toISOString();

    const idStr = String(ticketId);
    const idx = this.tickets.findIndex((t) => String(t.id) === idStr);

    if (idx >= 0) {
      const oldPrice = Number(this.tickets[idx].price ?? 0);
      this.totalPriceToday = this.totalPriceToday - oldPrice + numericPrice;

      this.tickets[idx] = {
        ...this.tickets[idx],
        plate: plate || this.tickets[idx].plate,
        action: 'OUT',
        time: nowIso,
        gate: gate || this.tickets[idx].gate,
        price: numericPrice,
        isCollectedByCashier,
      };
    } else {
      const row: TicketDto = {
        id: ticketId,
        plate,
        action: 'OUT',
        time: nowIso,
        gate,
        price: numericPrice,
        isCollectedByCashier,
        info: plate,
      };

      this.tickets = [row, ...this.tickets];
      this.totalPriceToday = this.totalPriceToday + numericPrice;
    }

    this.applyFilters();
  }
}
