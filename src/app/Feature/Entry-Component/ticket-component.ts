import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
  ChangeDetectorRef,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import {
  TicketDto,
  TicketAction,
  TicketDetailsDto,
  IssuedTicketResponse,
  ParkingCardSummaryDto,
  CollectDailyTicketsResponse,
} from '../../Domain/tickets/tickets.model';

import { TicketsServices } from '../../Services/Tickets/tickets-services';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { GateServices } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateDevicePeripheral, GateDto, GateType } from '../../Domain/Auth/auth.models';
import { LocalHealthService } from '../../Services/Gate/local-health.service';

import { NfcReaderService } from '../../Services/registration/nfc-reader.service';
import { ToastServices } from '../../Services/Toster/toast-services';

import { GateDevicesBlockComponent } from './gate-devices-block-component/gate-devices-block-component';
import { IssueTicketBlockComponent } from './issue-ticket-block-component/issue-ticket-block-component';
import { TicketsTableBlockComponent } from './tickets-table-block-component/tickets-table-block-component';
import { SearchBlockComponent } from '../Shared/search-block-component/search-block-component';
import { ScanHubService, ScanFileMessage } from '../../Services/Gate/scan-hub.service';
import { EntryTourService } from '../../Services/Entry/entry-tour.service';
import { SupervisorModalBlockComponent } from '../Shared/supervisor-modal-block-component/supervisor-modal-block-component';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { TicketDetailsModalBlockComponent } from '../Shared/ticket-details-modal-block-component/ticket-details-modal-block-component';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';

@Component({
  selector: 'app-ticket-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GateDevicesBlockComponent,
    IssueTicketBlockComponent,
    TicketsTableBlockComponent,
    SearchBlockComponent,
    SupervisorModalBlockComponent,
    TicketDetailsModalBlockComponent,
    TranslatePipePipe,
  ],
  templateUrl: './ticket-component.html',
  styleUrls: ['./ticket-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>{
        ar: {
          helpTour: 'شرح الواجهة',
        },
        en: {
          helpTour: 'Help Tour',
        },
      },
    },
  ],
})
export class TicketComponent implements OnInit, OnDestroy {
  // =======================
  // Services
  // =======================
  private readonly ticketsSvc = inject(TicketsServices);
  readonly i18n = inject(LanguageService);
  private readonly gateSvc = inject(GateServices);
  private readonly auth = inject(AuthService);
  private readonly nfc = inject(NfcReaderService);
  private readonly toast = inject(ToastServices);
  private readonly entryTour = inject(EntryTourService);
  private readonly scanHub = inject(ScanHubService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly errorExtractor = inject(ErrorExtractorService);
  private readonly hubSubscriptions = new Subscription();
  private readonly localHealth = inject(LocalHealthService);

  startTour(): void {
    this.entryTour.startTour();
  }

  // =======================
  // Gate selection
  // =======================
  showGateSelectionModal = false;
  gatesList: GateDto[] = [];
  selectedGateId: number | null = null;
  gateLoading = false;
  gateSaving = false;

  gatePeripheral: GateDevicePeripheral | null = null;
  cashierToken: string | null = null;

  // =======================
  // Manual inputs / card
  // =======================
  manualLprPlate = '';
  cardNumber = '';
  readonly readingCard = signal(false);

  // =======================
  // Card summary (subscriber)
  // =======================
  cardSummary: ParkingCardSummaryDto | null = null;
  loadingCardSummary = false;

  // =======================
  // Ticket summary / cashier
  // =======================
  lastIssuedTicketId: string | number | null = null;
  lastIssuedTicketInfo: string | null = null;
  private _lastTicketPrice: number | null = null;
  private _lastTicketCreatedAt: string | null = null;
  private _cashierCollected = false;
  collectingCashierCash = false;
  collectingTicketId: string | null = null;
  lastIssuedVehicleNumber: string | null = null;

  // =======================
  // Daily collect summary (Supervisor)
  // =======================
  collectSummary: CollectDailyTicketsResponse | null = null;
  collectLoading = false;

  // Supervisor collect
  showSupervisorCollectModal = false;
  supervisorUsername = '';
  supervisorPassword = '';
  supervisorCollectLoading = false;
  supervisorCollectError: string | null = null;

  // Ticket Details Modal
  showTicketDetailsModal = false;
  selectedTicketForModal: TicketDto | null = null;

  // =======================
  // Tickets list / filters
  // =======================
  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;

  q = '';
  action: '' | TicketAction = '';
  gate: string = '';

  // =======================
  // Issue ticket QR state
  // =======================
  adding = false;
  currentIssuedQr: string | null = null;
  currentIssuedQrType: 'image' | 'text' | null = null;

  // =======================
  // Scan / admit
  // =======================
  scanBuffer = '';
  scanning = false;
  scannedTicket: TicketDetailsDto | null = null;
  collecting = false;

  totalPriceToday = 0;
  scannedFile: { name: string; url: string; safeUrl?: any; type: string; bytes: any } | null = null;

  // =======================
  // Real-time search
  // =======================
  searchingTickets = false;
  searchResults: TicketDto[] = [];

  // =======================
  // Getters / Setters
  // =======================
  get lastIssuedPrice(): number | null {
    return this._lastTicketPrice;
  }
  set lastIssuedPrice(v: number | null) {
    this._lastTicketPrice = v;
  }

  get lastIssuedCreatedAt(): string | null {
    return this._lastTicketCreatedAt;
  }
  set lastIssuedCreatedAt(v: string | null) {
    this._lastTicketCreatedAt = v;
  }

  get lastIssuedCollected(): boolean {
    return this._cashierCollected;
  }
  set lastIssuedCollected(v: boolean) {
    this._cashierCollected = v;
  }

  get cashierConfirming(): boolean {
    return this.collectingCashierCash;
  }
  set cashierConfirming(v: boolean) {
    this.collectingCashierCash = v;
  }

  get isSupervisor(): boolean {
    return this.auth.isSupervisor;
  }

  @ViewChild('scanBox') scanBox?: ElementRef<HTMLInputElement>;

  // =======================
  // i18n Dictionary
  // =======================
  private readonly dict: Record<AppLang, Record<string, string>> = {
    ar: {
      issue_ticket: 'إصدار تذكرة',
      issue_ticket_subscriber: 'إصدار تذكرة للعميل',
      entry: 'دخول',
      no_ticket_yet: 'لا توجد تذكرة بعد — اضغط "إنشاء تذكرة"',
      add_new_ticket: 'إضافة تذكرة جديدة',
      create_ticket: 'إنشاء تذكرة',
      print_ticket: 'طباعة التذكرة',
      ticket_id: 'رقم التذكرة',
      scan_admit: 'المسح والسماح بالدخول',
      scanner_ready: 'الماسح جاهز',
      scan_label: 'امسح QR / ألصق الكود',
      scan_placeholder: 'ضع المؤشر هنا ثم امسح...',
      id: 'المعرّف',
      plate: 'رقم السيارة',
      start: 'البداية',
      end: 'النهاية',
      price: 'السعر',
      exceed: 'قيمة التجاوز',
      total: 'الإجمالي',
      admit: 'سماح بالدخول',
      tickets_entry_title: 'التذاكر — دخول',
      search_id_plate: 'بحث بالمعرّف / اللوحة',
      all_actions: 'كل الإجراءات',
      all_gates: 'كل البوابات',
      action_in: 'دخول',
      action_out: 'خروج',
      time: 'الوقت',
      action: 'الإجراء',
      gate: 'البوابة',
      no_tickets: 'لا توجد تذاكر',
      prev: 'السابق',
      next: 'التالي',
      showing: 'عرض',
      of: 'من',
      admit_done: 'تم التحصيل بنجاح',
      chip_entry: 'دخول',
      focus_to_scan: 'ضع المؤشر هنا ثم امسح...',
      ticket_number: 'التذاكر',
      select_gate: 'اختيار البوابة',
      choose_gate: 'اختر البوابة',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      no_gates_available: 'لا توجد بوابات متاحة',
      gate_devices: 'أجهزة البوابة',
      devices_status: 'حالة الأجهزة',
      pc_device: 'PC',
      lpr_device: 'كاميرا قراءة اللوحات (LPR)',
      device_connected: 'متصل / مفعّل',
      device_not_connected: 'غير متوفر',
      ip_address: 'العنوان',
      no_gate_devices: 'لم يتم ربط أجهزة بهذه البوابة بعد',
      cardData: 'بيانات الكارت',
      cardNumber: 'رقم الكارت',
      readCard: 'قراءة الكارت',
      reading: 'جاري القراءة…',
      readCardTitle: 'قراءة UID من القارئ',
      cashier_status: 'حالة التحصيل',
      cashier_collected: 'تم التحصيل من الزائر',
      cashier_not_collected: 'لم يتم التحصيل بعد',
      cashier_confirm_button: 'تأكيد تحصيل الكاشير',
      created_at: 'تاريخ الإنشاء',
      fees: 'الرسوم',
      cashier_collected_yes: 'تم التحصيل من الزائر',
      cashier_collected_no: 'لم يتم التحصيل بعد',
      cashier_collected_short: 'تم',
      customer_name: 'اسم العميل',
      phone: 'الهاتف',
      national_id: 'الرقم القومي',
      vehicle_number: 'رقم المركبة',
      expiryDate: 'تاريخ الانتهاء',
      balance: 'الرصيد',
      total_fees_today: 'إجمالي الرسوم اليوم',
      collectAllToday: 'تحصيل اليوم',
      collect_summary: 'ملخص تحصيل اليوم',
      total_collected_amount: 'إجمالي المبلغ المحصَّل',
      total_collected_tickets: 'عدد التذاكر المحصَّلة',
      collected_at: 'وقت التحصيل',
      last_collection_time: 'وقت آخر تحصيل',
      collect: 'تحصيل',
      collected: 'تم التحصيل',
      actions: 'الإجراءات',
      save: 'حفظ',
      enter_plate_first: 'يرجى إدخال رقم السيارة أولاً',
      no_card_for_subscriber: 'لا يوجد رقم كارت لعميل مشترك',
      qr_invalid_warning: 'تم إصدار التذكرة بنجاح، لكن QR code غير صالح.',
      enter_supervisor_creds: 'يرجى إدخال اسم المستخدم وكلمة المرور للسوبرفايزر',
      supervisor_login_failed: 'فشل الدخول كـ Supervisor. تأكد من البيانات أو الصلاحيات.',
      enter_card_first: 'يرجى إدخال رقم الكارت أولاً',
      no_card_summary: 'لا توجد بيانات عضوية لهذا الكارت',
      nfc_read_error: 'تعذر قراءة الكارت. تأكد من تشغيل قارئ الـ NFC.',
      incorrect_credentials: 'اسم المستخدم أو كلمة المرور غير صحيحة',
      // Search
      search_tickets_placeholder: 'ابحث برقم التذكرة، اللوحة، أو الكارت',
      helpTour: 'شرح الواجهة',
    },
    en: {
      issue_ticket: 'Issue Ticket',
      issue_ticket_subscriber: 'Issue ticket (subscriber)',
      entry: 'ENTRY',
      no_ticket_yet: 'No ticket yet — click "Create Ticket"',
      add_new_ticket: 'Add New Ticket',
      create_ticket: 'Create Ticket',
      print_ticket: 'Print Ticket',
      ticket_id: 'Ticket ID',
      scan_admit: 'Scan & Admit',
      scanner_ready: 'Scanner ready',
      scan_label: 'Scan QR / Paste Code',
      scan_placeholder: 'Focus here then scan...',
      id: 'ID',
      plate: 'Plate',
      start: 'Start',
      end: 'End',
      price: 'Price',
      exceed: 'Exceed',
      total: 'Total',
      admit: 'Admit',
      tickets_entry_title: 'Tickets — Entry',
      search_id_plate: 'Search ID / Plate',
      all_actions: 'All actions',
      all_gates: 'All gates',
      action_in: 'IN',
      action_out: 'OUT',
      time: 'Time',
      action: 'Action',
      gate: 'Gate',
      no_tickets: 'No tickets',
      prev: 'Prev',
      next: 'Next',
      showing: 'Showing',
      of: 'of',
      admit_done: 'Collected successfully',
      chip_entry: 'ENTRY',
      focus_to_scan: 'Focus here then scan...',
      ticket_number: 'Tickets',
      select_gate: 'Select Gate',
      choose_gate: 'Choose Gate',
      cancel: 'Cancel',
      confirm: 'Confirm',
      no_gates_available: 'No gates available',
      gate_devices: 'Gate Devices',
      devices_status: 'Devices Status',
      pc_device: 'PC',
      lpr_device: 'LPR Camera',
      device_connected: 'Connected / Enabled',
      device_not_connected: 'Not available',
      ip_address: 'IP Address',
      no_gate_devices: 'No devices are linked to this gate yet',
      cardData: 'Card data',
      cardNumber: 'Card number',
      readCard: 'Read card',
      reading: 'Reading…',
      readCardTitle: 'Read UID from reader',
      cashier_status: 'Cashier status',
      cashier_collected: 'Cash collected from visitor',
      cashier_not_collected: 'Not collected yet',
      cashier_confirm_button: 'Confirm cashier collection',
      created_at: 'Created at',
      fees: 'Fees',
      cashier_collected_yes: 'Cash collected from visitor',
      cashier_collected_no: 'Not collected yet',
      cashier_collected_short: 'OK',
      cardSummary: 'Card summary',
      no_card_summary: 'No membership data for this card',
      customer_name: 'Customer name',
      phone: 'Phone',
      national_id: 'National ID',
      vehicle_number: 'Vehicle number',
      expiryDate: 'Expiry date',
      balance: 'Balance',
      total_fees_today: 'Total fees today',
      collectAllToday: 'Collect today',
      collect_summary: 'Daily collection summary',
      total_collected_amount: 'Total collected amount',
      total_collected_tickets: 'Total collected tickets',
      collected_at: 'Collected at',
      last_collection_time: 'Last collection time',
      collect: 'Collect',
      collected: 'Collected',
      actions: 'Actions',
      save: 'Save',
      enter_plate_first: 'Please enter vehicle number first',
      no_card_for_subscriber: 'No card number for subscriber',
      qr_invalid_warning: 'Ticket issued successfully, but QR code is invalid.',
      enter_supervisor_creds: 'Please enter supervisor username and password',
      supervisor_login_failed: 'Supervisor login failed. Check credentials or permissions.',
      enter_card_first: 'Please enter card number first',
      nfc_read_error: 'Failed to read card. Make sure NFC reader is running.',
      incorrect_credentials: 'Incorrect user name or password',
      // Search
      search_tickets_placeholder: 'Search by ticket, plate, or card number',
      helpTour: 'Help Tour',
    },
  };

  t = (k: string) => (this.dict as any)[this.i18n.current]?.[k] ?? k;
  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  // =======================
  // Lifecycle
  // =======================
  ngOnInit(): void {
    this.initGatePeripheral();
    this.loadGates();
    this.loadEntryGates();
    this.loadTicketsForEntry();

    this.scanHub.start().then(() => {
      const gateId = this.auth.getGateId();
      if (gateId) {
        this.scanHub.joinStation(gateId.toString());
      }
    });

    this.hubSubscriptions.add(
      this.scanHub.scan$.subscribe((msg) => {
        console.log('TicketComponent: Received scan event', msg.fileName);
        this.handleScannedFile(msg);
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
      '%c TicketComponent: [SCAN EVENT] Handling file: ' + msg.fileName,
      'color: #00ff00; font-weight: bold;',
    );
    console.table({
      fileName: msg.fileName,
      contentType: msg.contentType,
      stationId: msg.stationId,
      bytesLength: (msg.bytes as any)?.length || 'N/A',
    });
    this.toast.success(this.t('scanner_ready') + ': ' + msg.fileName);

    // Cleanup old URL if exists
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

      console.log('TicketComponent: Final data size:', data.length);
      const blob = new Blob([data as any], { type: msg.contentType });
      const rawUrl = URL.createObjectURL(blob);

      this.scannedFile = {
        name: msg.fileName,
        url: rawUrl,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl),
        type: msg.contentType,
        bytes: msg.bytes,
      };

      console.log('TicketComponent: Successfully processed file', {
        name: msg.fileName,
        type: msg.contentType,
        size: data.length,
      });

      this.cdr.markForCheck();
    } catch (err) {
      console.error('TicketComponent: Error rendering scan', err);
      this.toast.error('Error rendering scan');
    }
  }

  ngOnDestroy(): void {
    this.hubSubscriptions.unsubscribe();
  }

  // =======================
  // Shared backend error handler
  // =======================
  private handleBackendError(context: string, err: any): void {
    console.error(context, err);
    this.toast.fromProblem(err);
  }

  // =======================
  // Gate / Auth init
  // =======================
  private initGatePeripheral(): void {
    this.cashierToken = this.auth.token;
    this.gatePeripheral = this.auth.getGateData();

    if (this.gatePeripheral || !this.auth.isLoggedIn()) return;

    this.auth.checkGate().subscribe({
      next: (res) => {
        this.gatePeripheral = res?.gateDevicePeripheral ?? this.auth.getGateData();
      },
      error: (err) => {
        this.handleBackendError('CheckGate error', err);
        this.gatePeripheral = this.auth.getGateData();
      },
    });
  }

  // =======================
  // GATES LOADING
  // =======================
  private loadGates(): void {
    this.gateLoading = true;

    this.gateSvc.getAll().subscribe({
      next: (all) => {
        this.gatesList = (all ?? []).filter(
          (g) => g.gateType === GateType.Entrance || g.gateType === GateType.Exit,
        );
        if (this.gatesList.length > 0) {
          this.showGateSelectionModal = true;
        } else {
          this.toast.warn(this.t('no_gates_available'));
        }
      },
      error: (err) => {
        this.handleBackendError('Gate/GetAll error (all gates)', err);
      },
      complete: () => {
        this.gateLoading = false;
      },
    });
  }

  private loadEntryGates(): void {
    this.gateLoading = true;

    this.gateSvc.getAll().subscribe({
      next: (all) => {
        this.gatesList = (all ?? []).filter((g) => g.gateType === GateType.Entrance);
      },
      error: (err) => {
        this.handleBackendError('Gate/GetAll error (entry gates)', err);
      },
      complete: () => {
        this.gateLoading = false;
      },
    });
  }

  selectGate(): void {
    if (!this.selectedGateId) {
      this.toast.warn(this.t('choose_gate'));
      return;
    }

    this.gateSaving = true;

    this.auth.selectGate(this.selectedGateId, GateType.Entrance).subscribe({
      next: (res) => {
        this.showGateSelectionModal = false;
        this.gatePeripheral = res?.gateDevicePeripheral ?? this.auth.getGateData();
        this.toast.success(this.t('select_gate'));
        this.loadTicketsForEntry();

        if (this.selectedGateId) {
          this.scanHub.joinStation(this.selectedGateId.toString());
        }
      },

      error: (err) => {
        this.handleBackendError('selectGate error', err);
      },
      complete: () => {
        this.gateSaving = false;
      },
    });
  }

  confirmGateSelection(): void {
    this.selectGate();
  }

  // =======================
  // Create ticket (Normal / Subscriber)
  // =======================
  createTicket(vehicleNumber?: string): void {
    if (this.adding) return;

    const trimmed = vehicleNumber?.trim();
    if (vehicleNumber !== undefined && !trimmed) {
      this.toast.warn(this.t('enter_plate_first'));
      return;
    }

    this.prepareNewTicketState();
    this.lastIssuedVehicleNumber = trimmed ?? null;

    const payload = {
      isSubscriber: false,
      vehicleNumber: trimmed,
      scannedFile: this.scannedFile?.bytes,
    };
    console.log('CREATING TICKET PAYLOAD:', payload);

    this.ticketsSvc.addTicket(payload).subscribe({
      next: (res) => this.handleIssuedTicketResponse(res),
      error: (e) => {
        this.handleBackendError('AddTicket (normal) error', e);
        this.adding = false;
      },
      complete: () => {
        this.adding = false;
      },
    });
  }

  createSubscriberTicket(): void {
    if (this.adding) return;

    const card = this.cardNumber?.trim();
    if (!card) {
      this.toast.warn(this.t('no_card_for_subscriber'));
      return;
    }

    this.prepareNewTicketState();
    this.lastIssuedVehicleNumber = this.cardSummary?.vehicleNumber?.trim() ?? null;

    const payload = {
      isSubscriber: true,
      cardNumber: card,
      scannedFile: this.scannedFile?.bytes,
    };
    console.log('CREATING SUBSCRIBER TICKET PAYLOAD:', payload);

    this.ticketsSvc.addTicket(payload).subscribe({
      next: (res) => this.handleIssuedTicketResponse(res),
      error: (e) => {
        this.handleBackendError('AddTicket (subscriber) error', e);
        this.adding = false;
      },
      complete: () => {
        this.adding = false;
      },
    });
  }

  private prepareNewTicketState(): void {
    this.adding = true;
    this.currentIssuedQr = null;
    this.currentIssuedQrType = null;
    this.lastIssuedTicketId = null;
    this.lastIssuedTicketInfo = null;
    this._lastTicketPrice = null;
    this._lastTicketCreatedAt = null;
    this._cashierCollected = false;
  }

  private handleIssuedTicketResponse(res: IssuedTicketResponse | null): void {
    this.adding = false;
    if (!res) return;

    // Clear scanned file state
    this.scannedFile = null;

    this.lastIssuedTicketId = res.ticketId ?? null;
    this.lastIssuedTicketInfo = res.ticketInfo ?? null;
    this.lastIssuedPrice = res.price ?? null;
    this.lastIssuedCreatedAt = res.createdAt ?? null;

    const fromResponse: string | undefined = (res as any)?.vehicleNumber;
    if (fromResponse && fromResponse.trim().length > 0) {
      this.lastIssuedVehicleNumber = fromResponse.trim();
    } else {
      this.lastIssuedVehicleNumber = null;
    }

    const normalizedQr = this.normalizeQrImage(res.qrCode);

    if (!normalizedQr) {
      console.warn('Invalid qrCode returned from AddTicket', res.qrCode);

      this.currentIssuedQr = null;
      this.currentIssuedQrType = null;

      // هنا الرسالة محلية لأنها حالة خاصة (API رجع قيمة غير قابلة للاستخدام)
      this.toast.error(this.t('qr_invalid_warning'));

      this.loadTicketsForEntry();
      return;
    }

    this.currentIssuedQr = normalizedQr;
    this.currentIssuedQrType = 'image';

    this.toast.success(this.t('create_ticket'));
    this.printTicket();
    this.loadTicketsForEntry();
  }

  // =======================
  // Printing
  // =======================
  printTicket(): void {
    if (!this.currentIssuedQr) return;

    const imgSrc =
      this.currentIssuedQrType === 'image'
        ? this.currentIssuedQr
        : this.qrDataUrl(this.currentIssuedQr);

    const popup = window.open('', '_blank', 'width=400,height=600');
    if (!popup) return;

    const createdAtText = this.buildCreatedAtText();
    const gateNumber = this.gatePeripheral?.gateNumber ?? '—';

    const html = this.buildTicketPrintHtml({
      imgSrc,
      createdAt: createdAtText,
      gateNumber,
      ticketInfo: this.lastIssuedTicketInfo,
      price: this.lastIssuedPrice,
      vehicleNumber: this.lastIssuedVehicleNumber,
    });

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
  }

  private buildCreatedAtText(): string {
    if (!this.lastIssuedCreatedAt) return '—';

    return new Date(this.lastIssuedCreatedAt).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private buildTicketPrintHtml(opts: {
    imgSrc: string;
    createdAt: string;
    gateNumber: string | number;
    ticketInfo: string | null;
    price: number | null;
    vehicleNumber: string | null;
  }): string {
    const ticketIdBlock = this.lastIssuedTicketId
      ? `
      <div class="ticket-id">
        رقم التذكرة: ${opts.ticketInfo}
      </div>`
      : '';

    const priceRow =
      opts.price !== null && opts.price !== undefined
        ? `
        <div class="info-row">
          <span class="label">الرسوم:</span>
          <span class="value price">${opts.price} ج.م</span>
        </div>`
        : '';

    const vehicleRow = opts.vehicleNumber
      ? `
      <div class="info-row">
        <span class="label">رقم السيارة:</span>
        <span class="value">${opts.vehicleNumber}</span>
      </div>`
      : '';

    const extraInfo = opts.ticketInfo
      ? `
      <div class="extra-info">
        ${opts.ticketInfo}
      </div>`
      : '';

    return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>NPark</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          @page {
            size: 80mm 50mm;
            margin: 0;
          }

          body {
            margin: 0;
            padding: 2mm;
            font-family: Arial, sans-serif;
            direction: rtl;
          }

          .wrap {
            width: 76mm;
            height: 46mm;
            display: flex;
            flex-direction: row;
            justify-content: space-between;
            align-items: stretch;
          }

          .info-side {
            flex: 1;
            max-width: 42mm;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            padding-inline-end: 1.5mm;
          }

          .info-top {
            display: flex;
            flex-direction: column;
            gap: 1mm;
          }

          .header-title {
            font-size: 11px;
            font-weight: bold;
            color: #000;
            text-align: center;
            margin-bottom: 1mm;
          }

          .ticket-id {
            width: 100%;
            text-align: center;
            font-size: 9px;
            font-weight: bold;
            color: #000;
            padding: 1mm;
            background: #f0f0f0;
            border-radius: 1mm;
          }

          .info-section {
            width: 100%;
            border: 0.3mm solid #000;
            border-radius: 1mm;
            padding: 1mm 1.5mm;
            background: #fff;
            margin-top: 1mm;
          }

          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 8.2px;
            padding: 0.35mm 0;
          }

          .label {
            font-weight: 600;
            color: #000;
          }

          .value {
            font-weight: 700;
            color: #000;
          }

          .price {
            font-size: 8.5px;
          }

          .extra-info {
            font-size: 8px;
            color: #000;
            text-align: center;
            font-weight: bold;
            margin-top: 1mm;
          }

          .footer-link {
            margin-top: 2mm;
            font-size: 9.5px;
            color: #000;
            font-weight: bold;
            text-align: center;
          }

          .qr-side {
            width: 30mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .qr-container {
            width: 28mm;
            height: 28mm;
          }

          .qr-container img {
            width: 100%;
            height: 100%;
            display: block;
          }

          @media print {
            body {
              padding: 1mm;
            }
          }
        </style>
      </head>
      <body onload="window.print(); window.close();">
        <div class="wrap">
          <div class="info-side">
            <div class="info-top">
              ${ticketIdBlock}
              <div class="info-section">
                ${priceRow}
                <div class="info-row">
                  <span class="label">التاريخ والوقت:</span>
                  <span class="value">${opts.createdAt}</span>
                </div>
                ${vehicleRow}
                <div class="info-row">
                  <span class="label">رقم البوابة:</span>
                  <span class="value">${opts.gateNumber}</span>
                </div>
              </div>
              ${extraInfo}
            </div>
            <div class="footer-link">www.niletronix.com</div>
          </div>

          <div class="qr-side">
            <div class="qr-container">
              <img src="${opts.imgSrc}" alt="QR Code" />
            </div>
          </div>
        </div>
      </body>
    </html>`;
  }

  qrDataUrl(text: string): string {
    return `data:text/plain,${encodeURIComponent(text)}`;
  }

  // =======================
  // Supervisor daily collect
  // =======================
  collectDailyForGate(): void {
    if (this.collectLoading) return;

    this.collectLoading = true;
    this.collectSummary = null;

    this.ticketsSvc.collectDailyTickets().subscribe({
      next: (res) => {
        this.collectSummary = res;
        this.toast.success(this.t('admit_done'));
        this.loadTicketsForEntry();
      },
      error: (err) => {
        this.handleBackendError('collectDailyForGate error', err);
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
    const gateData = this.auth.getGateData();
    const gateNumber = gateData?.gateNumber ?? null;
    const gateType = gateData?.gateType ?? null;

    if (!user || !pwd) {
      this.supervisorCollectError = this.t('enter_supervisor_creds');
      return;
    }

    this.supervisorCollectError = null;
    this.supervisorCollectLoading = true;
    this.collectSummary = null;

    this.ticketsSvc
      .collectDailyTicketsAsSupervisor({
        userName: user,
        password: pwd,
        gateType,
        gateNumber,
      })
      .subscribe({
        next: (res) => {
          this.collectSummary = res;
          this.toast.success(this.t('admit_done'));
          this.loadTicketsForEntry();
        },
        error: (err) => {
          if (err?.status === 403) {
            const msg = this.t('incorrect_credentials');
            this.supervisorCollectError = msg;
            this.toast.error(msg);
          } else {
            this.handleBackendError('submitSupervisorCollect error', err);
            this.supervisorCollectError = this.errorExtractor.extractErrorMessage(
              err,
              this.t('supervisor_login_failed'),
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

  // =======================
  // Scan / admit
  // =======================
  selectAll(el: HTMLInputElement): void {
    setTimeout(() => el.select(), 0);
  }

  onScanEnter(): void {
    const code = this.scanBuffer?.trim();
    if (!code) return;
    this.fetchTicketByQr(code);
  }

  fetchTicketByQr(code: string): void {
    this.scanning = true;
    this.scannedTicket = null;

    // جاهز لو حبيت تفعل Endpoint بعدين
    // this.ticketsSvc.getTicketByQr(code).subscribe({
    //   next: (t) => (this.scannedTicket = t),
    //   error: (err) => {
    //     this.handleBackendError('getTicketByQr error', err);
    //   },
    //   complete: () => {
    //     this.scanning = false;
    //   },
    // });
  }

  collect(t: TicketDetailsDto): void {
    this.collecting = true;

    this.ticketsSvc.collect(t.id).subscribe({
      next: () => {
        this.toast.success(this.t('admit_done'));
        this.loadTicketsForEntry();
      },
      error: (err) => {
        this.handleBackendError('collect error', err);
      },
      complete: () => {
        this.collecting = false;
      },
    });
  }

  // =======================
  // Collect from table
  // =======================
  collectTicketFromTable(ticketId: string): void {
    if (this.collectingTicketId) return;

    this.collectingTicketId = ticketId;

    this.ticketsSvc.collectCashier(ticketId).subscribe({
      next: (ok) => {
        if (ok) {
          this.markTicketAsCashierCollected(ticketId);
          this.loadTicketsForEntry();
        }
      },
      error: (err) => {
        this.handleBackendError('collectTicketFromTable error', err);
        this.collectingTicketId = null;
      },
      complete: () => {
        this.collectingTicketId = null;
      },
    });
  }

  // =======================
  // Card summary
  // =======================
  loadCardSummary(cardNumber?: string): void {
    const cn = (cardNumber ?? this.cardNumber)?.trim().toUpperCase();
    if (!cn) {
      this.toast.warn(this.t('enter_card_first'));
      return;
    }

    this.loadingCardSummary = true;

    this.ticketsSvc.getCardSummary(cn).subscribe({
      next: (summary) => {
        if (!summary) {
          this.cardSummary = null;
          this.toast.warn(this.t('no_card_summary'));
        } else {
          this.cardSummary = summary;
        }
      },
      error: (err) => {
        this.handleBackendError('getCardSummary error', err);
        this.cardSummary = null;
      },
      complete: () => {
        this.loadingCardSummary = false;
      },
    });
  }

  clearCardSummary(event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.cardSummary = null;
    this.cardNumber = '';
    this.scanBuffer = '';
  }

  // =======================
  // NFC read card
  // =======================
  async readCard(): Promise<void> {
    if (this.readingCard()) return;
    this.readingCard.set(true);

    try {
      const uid = await this.nfc.readUID();
      const normalized = String(uid).trim().toUpperCase();

      this.cardNumber = normalized;
      this.scanBuffer = normalized;

      this.resetTicketPreview();
      this.cardSummary = null;

      this.loadCardSummary(normalized);
    } catch (err: any) {
      console.error(err);
      // ده Error محلي (NFC) مش من الباك
      this.toast.error(err?.message || this.t('nfc_read_error'));
    } finally {
      this.readingCard.set(false);
    }
  }

  private resetTicketPreview(): void {
    this.lastIssuedTicketId = null;
    this.lastIssuedTicketInfo = null;
    this.lastIssuedPrice = null;
    this.lastIssuedCreatedAt = null;
    this._cashierCollected = false;
    this.collectingCashierCash = false;
  }

  // =======================
  // Cashier collect confirmation
  // =======================
  confirmCashier(): void {
    this.confirmCashierCollection();
  }

  confirmCashierCollection(): void {
    if (!this.lastIssuedTicketId || this._cashierCollected || this.collectingCashierCash) {
      return;
    }

    this.collectingCashierCash = true;

    this.ticketsSvc.collectCashier(String(this.lastIssuedTicketId)).subscribe({
      next: (ok) => {
        if (ok) {
          this._cashierCollected = true;
          this.markTicketAsCashierCollected(this.lastIssuedTicketId!);
          this.toast.success(this.t('cashier_collected'));
          this.loadTicketsForEntry();
        }
      },
      error: (err) => {
        this.handleBackendError('confirmCashierCollection error', err);
        this.collectingCashierCash = false;
      },
      complete: () => {
        this.collectingCashierCash = false;
      },
    });
  }

  // =======================
  // Real-time search handlers
  // =======================
  onSearchTickets(query: string): void {
    if (!query?.trim()) {
      this.searchResults = [];
      return;
    }

    this.searchingTickets = true;

    this.ticketsSvc.searchTickets(query).subscribe({
      next: (results) => {
        this.searchResults = results;
      },
      error: (err) => {
        this.handleBackendError('searchTickets error', err);
      },
      complete: () => {
        this.searchingTickets = false;
      },
    });
  }

  onTicketSelected(ticket: TicketDto): void {
    this.searchResults = [];

    const identifier = ticket.ticketNumber || String(ticket.id);
    const summaryText = ticket.info ? ` - ${ticket.info}` : '';

    this.lastIssuedTicketId = ticket.id ?? null;
    this.lastIssuedTicketInfo = ticket.info ?? null;
    this.lastIssuedPrice = ticket.price ?? null;
    this.lastIssuedCreatedAt = ticket.time ?? null;
    this.lastIssuedVehicleNumber = ticket.plate ?? null;
    this._cashierCollected = ticket.isCollectedByCashier ?? false;

    this.currentIssuedQr = null;
    this.currentIssuedQrType = null;

    // Show Details Modal
    this.selectedTicketForModal = ticket;
    this.showTicketDetailsModal = true;

    if (this._cashierCollected) {
      this.toast.warn(
        this.i18n.current === 'ar'
          ? `التذكرة ${identifier} تم تحصيلها مسبقًا${summaryText}`
          : `Ticket ${identifier} was already collected${summaryText}`,
      );
    } else {
      this.toast.success(
        this.i18n.current === 'ar'
          ? `تم اختيار التذكرة: ${identifier}${summaryText}`
          : `Selected ticket: ${identifier}${summaryText}`,
      );
    }
  }

  private markTicketAsCashierCollected(ticketId: string | number): void {
    const idStr = String(ticketId);

    this.tickets = this.tickets.map((t) =>
      String(t.id) === idStr ? { ...t, isCollectedByCashier: true } : t,
    );

    this.applyFilters();
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

      const okA = !this.action || t.action === this.action;
      const okG = !this.gate || t.gate === this.gate;
      return okQ && okA && okG;
    });
  }

  closeTicketDetailsModal(): void {
    this.showTicketDetailsModal = false;
    this.selectedTicketForModal = null;
  }

  private normalizeQrImage(qr: string | null | undefined): string | null {
    if (!qr) return null;
    const v = String(qr).trim();

    if (/^(data:image\/|blob:|https?:\/\/)/i.test(v)) return v;

    const clean = v.replace(/\s+/g, '');

    // HEX → Base64
    if (/^[0-9A-Fa-f]+$/.test(clean)) {
      try {
        const base64 = this.hexToBase64(clean);
        return `data:image/png;base64,${base64}`;
      } catch (err) {
        console.error('Failed to convert HEX to base64:', err);
        return null;
      }
    }

    // Base64 image
    if (/^[A-Za-z0-9+/=]+$/.test(clean)) {
      return `data:image/png;base64,${clean}`;
    }

    return null;
  }

  private hexToBase64(hexString: string): string {
    const bytes: number[] = [];
    for (let i = 0; i < hexString.length; i += 2) {
      bytes.push(parseInt(hexString.substring(i, i + 2), 16));
    }
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  private loadTicketsForEntry(ticketNumber: string = ''): void {
    this.loading = true;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    this.ticketsSvc.getTicketsForEntry(startOfDay.toISOString(), ticketNumber).subscribe({
      next: (res) => {
        this.totalPriceToday = res.totalPrice ?? 0;

        this.tickets = (res.items ?? []).sort(
          (a: TicketDto, b: TicketDto) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        );

        if (this.lastIssuedTicketId && this._cashierCollected) {
          this.markTicketAsCashierCollected(this.lastIssuedTicketId);
        } else {
          this.applyFilters();
        }
      },
      error: (err) => {
        this.handleBackendError('loadTicketsForEntry error', err);
        this.tickets = [];
        this.applyFilters();
      },
      complete: () => {
        this.loading = false;
      },
    });
  }
}
