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
import { Subscription, forkJoin, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

import {
  TicketDto,
  TicketAction,
  TicketDetailsDto,
  IssuedTicketResponse,
  ParkingCardSummaryDto,
  CollectDailyTicketsResponse,
  MembershipCheckResponse,
} from '../../Domain/tickets/tickets.model';

import { TicketsServices } from '../../Services/Tickets/tickets-services';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import {
  GateConnectionInfo,
  GateServices,
  OpenGateResponse,
} from '../../Services/Gate/gate-services';
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
import { PricingSchemaDto } from '../../Domain/registration/registration-model';
import { Registrationservice } from '../../Services/registration/registrationservice';
import { LocalPrintService } from '../../Services/Print/local-print.service';
import { environment } from '../../Shared/environment/environment';

type LprMembershipStatus = 'idle' | 'checking' | 'subscriber' | 'non-subscriber' | 'error';

type CardMembershipStatus = 'idle' | 'checking' | 'member' | 'not-member' | 'error';

interface EntryVehicleImage {
  name: string;
  url: string;
  safeUrl?: SafeResourceUrl;
  type: string;
  file: File;
}

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
  private readonly router = inject(Router);
  private readonly registrationSvc = inject(Registrationservice);
  private readonly localPrint = inject(LocalPrintService);

  startTour(): void {
    this.entryTour.startTour();
  }

  // =======================
  // Gate selection
  // =======================
  showGateSelectionModal = false;
  gatesList: GateDto[] = [];
  selectedGateId: string | number | null = null;
  gateLoading = false;
  gateSaving = false;

  gatePeripheral: GateDevicePeripheral | null = null;
  cashierToken: string | null = null;
  gateConnectionInfo: GateConnectionInfo | null = null;
  gateConnectionLoading = false;
  gateConnectionError: string | null = null;
  snapshotLoading = false;
  snapshotError: string | null = null;
  openGateLoading = false;
  openGateError: string | null = null;
  lastOpenGateResponse: OpenGateResponse | null = null;

  // =======================
  // Manual inputs / card
  // =======================
  manualLprPlate = '';
  cardNumber = '';
  readonly readingCard = signal(false);
  cardMembershipStatus: CardMembershipStatus = 'idle';
  private lprMembershipCheckTimer?: ReturnType<typeof setTimeout>;
  private lastCheckedLprVehicleNumber = '';
  private readonly lprMembershipCache = new Map<string, MembershipCheckResponse>();
  private readonly autoCreatedLprVehicleNumbers = new Set<string>();
  currentLprVehicleNumber: string | null = null;
  lprMembershipStatus: LprMembershipStatus = 'idle';
  lprMembershipCardNumber: string | null = null;
  pricingSchemas: PricingSchemaDto[] = [];
  pricingSchemasLoading = false;
  selectedPricingSchemaId = '';

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
  scannedFile: EntryVehicleImage | null = null;
  uploadedVehicleImages: EntryVehicleImage[] = [];

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

  get hasVehicleImages(): boolean {
    return !!this.scannedFile || this.uploadedVehicleImages.length > 0;
  }

  get isSupervisor(): boolean {
    return this.auth.isSupervisor;
  }

  get activeGateId(): string | number | null {
    return this.auth.getGateId();
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
      lpr_non_subscriber_manual: 'هذه المركبة غير مشتركة. اضغط إنشاء تذكرة لإصدار تذكرة عادية.',
      membership_check_failed: 'تعذر التحقق من الاشتراك لهذه المركبة.',
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
      supervisor_mode: 'وضع المشرف',
      lpr_status_checking: 'جار التحقق من الاشتراك...',
      lpr_status_subscriber: 'تم التعرف على مشترك. سيتم إنشاء التذكرة تلقائيا.',
      lpr_status_non_subscriber: 'المركبة غير مشتركة. اختر تعريفة ثم أنشئ التذكرة يدويا.',
      lpr_status_error: 'فشل التحقق من الاشتراك.',
      pricing_schema: 'التعريفة',
      select_pricing_schema: 'اختر التعريفة',
      select_pricing_schema_first: 'يرجى اختيار التعريفة أولا',
      create_lpr_ticket: 'إنشاء تذكرة LPR',
      vehicle_images: 'صور المركبة',
      vehicle_images_optional: 'صور المركبة اختيارية.',
      vehicle_images_attached: 'تم إرفاق صور المركبة',
      printing_failed: 'تعذر إرسال أوامر الطباعة إلى خدمة الطابعة المحلية.',
      printing_sent: 'تم إرسال أوامر الطباعة بنجاح.',
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
      lpr_non_subscriber_manual:
        'This vehicle is not a subscriber. Click Create Ticket to issue a normal ticket.',
      membership_check_failed: 'Could not check membership for this vehicle.',
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
      supervisor_mode: 'Supervisor mode',
      lpr_status_checking: 'Checking membership...',
      lpr_status_subscriber: 'Subscriber detected. Creating ticket automatically.',
      lpr_status_non_subscriber:
        'Non-subscriber detected. Select a pricing schema and create the ticket manually.',
      lpr_status_error: 'Membership lookup failed.',
      pricing_schema: 'Pricing schema',
      select_pricing_schema: 'Select pricing schema',
      select_pricing_schema_first: 'Please select a pricing schema first',
      create_lpr_ticket: 'Create LPR ticket',
      vehicle_images: 'Vehicle images',
      vehicle_images_optional: 'Vehicle images are optional.',
      vehicle_images_attached: 'Vehicle images attached',
      printing_failed: 'Failed to send print jobs to the local printer service.',
      printing_sent: 'Print jobs were sent successfully.',
      gate_info: 'Gate connection info',
      control_id: 'Control ID',
      camera_url: 'Camera URL',
      camera_snapshot: 'Camera snapshot',
      take_snapshot: 'Take snapshot',
      retry_snapshot: 'Retry snapshot',
      continue_without_image: 'Continue without image',
      gate_connection_failed: 'Cannot load gate connection information.',
      gate_connection_loading: 'Loading gate connection information.',
      snapshot_failed: 'Failed to load camera snapshot.',
      card_not_member: 'This card is not registered as a membership.',
      card_membership_failed: 'Failed to check card membership.',
      open_gate_success: 'Gate opened successfully.',
      open_gate_failed: 'Ticket created successfully, but gate open failed.',
      retry_open_gate: 'Retry open gate',
    },
  };

  t = (k: string) => (this.dict as any)[this.i18n.current]?.[k] ?? this.dict.en[k] ?? k;
  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  // =======================
  // Lifecycle
  // =======================
  ngOnInit(): void {
    this.initGatePeripheral();
    this.loadGateConnectionInfo();
    this.loadGates();
    this.loadEntryGates();
    this.loadTicketsForEntry();
    this.ensurePricingSchemasLoaded();

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
      const file = new File([blob], msg.fileName, {
        type: msg.contentType || 'application/octet-stream',
      });

      const scannedAttachment: EntryVehicleImage = {
        name: msg.fileName,
        url: rawUrl,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl),
        type: msg.contentType,
        file,
      };

      this.scannedFile = scannedAttachment;
      this.uploadedVehicleImages = [...this.uploadedVehicleImages, scannedAttachment];

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
    if (this.lprMembershipCheckTimer) {
      clearTimeout(this.lprMembershipCheckTimer);
    }
    this.uploadedVehicleImages.forEach((file) => this.revokeImageUrl(file));
    if (
      this.scannedFile &&
      !this.uploadedVehicleImages.some((file) => file.url === this.scannedFile?.url)
    ) {
      this.revokeImageUrl(this.scannedFile);
    }
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

    // If not logged in, don't redirect
    if (!this.auth.isLoggedIn()) return;

    // If no gate selected, redirect to gate selection page
    if (!this.gatePeripheral) {
      this.toast.warn(
        this.i18n.current === 'ar' ? 'يرجى اختيار بوابة أولاً' : 'Please select a gate first',
      );
      this.router.navigate(['/gate-selection']);
      return;
    }
  }

  private loadGateConnectionInfo(gateId: string | number | null = this.auth.getGateId()): void {
    if (!gateId) {
      this.gateConnectionInfo = null;
      this.gateConnectionError = this.t('gate_connection_failed');
      return;
    }

    this.gateConnectionLoading = true;
    this.gateConnectionError = null;
    this.snapshotError = null;

    this.gateSvc.getGateConnectionInfo(gateId).subscribe({
      next: (info) => {
        this.gateConnectionInfo = info;
        this.mergeGateConnectionIntoPeripheral(info);

        const cameraUrl = info.onvifCameraSetting?.url?.trim();
        if (cameraUrl) {
          this.loadCameraSnapshot(cameraUrl);
        }
      },
      error: (err) => {
        console.error('Gate connection-info error', err);
        this.gateConnectionInfo = null;
        this.gateConnectionError = this.t('gate_connection_failed');
        this.toast.error(this.t('gate_connection_failed'));
      },
      complete: () => {
        this.gateConnectionLoading = false;
      },
    });
  }

  private mergeGateConnectionIntoPeripheral(info: GateConnectionInfo): void {
    const current = this.gatePeripheral;
    if (!current) return;

    this.gatePeripheral = {
      ...current,
      pcIp: info.pcIp ?? current.pcIp,
      lprIp: info.lprIp ?? current.lprIp,
      hasPc: !!info.pcIp || current.hasPc,
      hasLpr: !!info.lprIp || current.hasLpr,
    };
  }

  private ensureGateConnectionReady(): boolean {
    if (this.gateConnectionInfo && !this.gateConnectionError) {
      return true;
    }

    this.toast.warn(
      this.gateConnectionLoading ? this.t('gate_connection_loading') : this.t('gate_connection_failed'),
    );
    return false;
  }

  retrySnapshot(): void {
    const cameraUrl = this.gateConnectionInfo?.onvifCameraSetting?.url?.trim();
    if (!cameraUrl) return;
    this.loadCameraSnapshot(cameraUrl);
  }

  continueWithoutImage(): void {
    this.snapshotError = null;
  }

  private loadCameraSnapshot(cameraUrl: string): void {
    this.snapshotLoading = true;
    this.snapshotError = null;

    this.gateSvc.getSnapshot(cameraUrl).subscribe({
      next: (blob) => {
        const file = new File([blob], `gate-snapshot-${Date.now()}.jpg`, {
          type: blob.type || 'image/jpeg',
        });
        this.attachSnapshotFile(file);
      },
      error: (err) => {
        console.error('Camera snapshot error', err);
        this.snapshotError = this.t('snapshot_failed');
        this.toast.warn(this.t('snapshot_failed'));
      },
      complete: () => {
        this.snapshotLoading = false;
      },
    });
  }

  private attachSnapshotFile(file: File): void {
    const rawUrl = URL.createObjectURL(file);
    const snapshotAttachment: EntryVehicleImage = {
      name: file.name,
      url: rawUrl,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl),
      type: file.type || 'image/jpeg',
      file,
    };

    this.uploadedVehicleImages
      .filter((item) => item.name.startsWith('gate-snapshot-'))
      .forEach((item) => this.revokeImageUrl(item));

    this.uploadedVehicleImages = [
      ...this.uploadedVehicleImages.filter((item) => !item.name.startsWith('gate-snapshot-')),
      snapshotAttachment,
    ];
    this.scannedFile = snapshotAttachment;
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
        this.loadGateConnectionInfo(this.selectedGateId);

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
  onManualLprPlateChange(value: string): void {
    this.manualLprPlate = value;

    const vehicleNumber = this.normalizeVehicleNumber(value);
    if (this.lprMembershipCheckTimer) {
      clearTimeout(this.lprMembershipCheckTimer);
    }

    this.currentLprVehicleNumber = vehicleNumber || null;

    if (vehicleNumber.length < 3) {
      this.resetLprLookupState(vehicleNumber || null);
      this.lastCheckedLprVehicleNumber = '';
      return;
    }

    this.resetLprLookupState(vehicleNumber);

    this.lprMembershipCheckTimer = setTimeout(() => {
      const currentVehicleNumber = this.normalizeVehicleNumber(this.manualLprPlate);
      if (
        !currentVehicleNumber ||
        currentVehicleNumber !== vehicleNumber ||
        currentVehicleNumber === this.lastCheckedLprVehicleNumber
      ) {
        return;
      }

      this.checkCurrentLprMembership(true);
    }, 650);
  }

  onManualLprPlateBlur(): void {
    this.checkCurrentLprMembership(true);
  }

  async onVehicleImagesSelected(files: FileList | null): Promise<void> {
    if (!files?.length) return;

    const uploaded: EntryVehicleImage[] = [];

    for (const file of Array.from(files)) {
      const rawUrl = URL.createObjectURL(file);
      uploaded.push({
        name: file.name,
        url: rawUrl,
        safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl),
        type: file.type || 'application/octet-stream',
        file,
      });
    }

    this.uploadedVehicleImages = [...this.uploadedVehicleImages, ...uploaded];
    this.scannedFile = uploaded[uploaded.length - 1] ?? this.scannedFile;
  }

  removeVehicleImage(index: number): void {
    if (index < 0 || index >= this.uploadedVehicleImages.length) return;

    const removed = this.uploadedVehicleImages[index];
    this.uploadedVehicleImages = this.uploadedVehicleImages.filter((_, i) => i !== index);

    if (this.scannedFile?.url === removed?.url) {
      this.scannedFile = this.findLastScannedAttachment();
    }

    this.revokeImageUrl(removed);
  }

  selectVehicleImagePreview(index: number): void {
    if (index < 0 || index >= this.uploadedVehicleImages.length) return;
    this.scannedFile = this.uploadedVehicleImages[index];
  }

  createTicket(vehicleNumber?: string): void {
    if (this.adding) return;
    if (!this.ensureGateConnectionReady()) return;

    const normalizedVehicleNumber =
      vehicleNumber !== undefined
        ? this.normalizeVehicleNumber(vehicleNumber)
        : (this.currentLprVehicleNumber ?? undefined);

    if (vehicleNumber !== undefined && !normalizedVehicleNumber) {
      this.toast.warn(this.t('enter_plate_first'));
      return;
    }

    if (normalizedVehicleNumber) {
      this.currentLprVehicleNumber = normalizedVehicleNumber;

      if (
        this.currentLprVehicleNumber === normalizedVehicleNumber &&
        (this.lprMembershipStatus === 'non-subscriber' || this.lprMembershipStatus === 'error')
      ) {
        this.createNonSubscriberLprTicket(normalizedVehicleNumber);
        return;
      }

      const cachedMembership = this.lprMembershipCache.get(normalizedVehicleNumber);

      if (cachedMembership) {
        this.applyLprMembershipResult(normalizedVehicleNumber, cachedMembership, false);
        if (!cachedMembership.isExist) {
          this.createNonSubscriberLprTicket(normalizedVehicleNumber);
        }
        return;
      }

      this.checkLprMembership(normalizedVehicleNumber, false);
      return;
    }

    const pricingSchemaId = this.selectedPricingSchemaId?.trim();
    if (!pricingSchemaId) {
      this.ensurePricingSchemasLoaded();
      this.toast.warn(this.t('select_pricing_schema_first'));
      return;
    }

    this.createNormalTicket(undefined, false, pricingSchemaId);
  }

  createSubscriberTicket(): void {
    if (this.adding) return;
    if (!this.ensureGateConnectionReady()) return;

    const card = this.cardNumber?.trim();
    if (!card) {
      this.toast.warn(this.t('no_card_for_subscriber'));
      return;
    }

    this.checkCardMembershipAndCreate(card);
  }

  onCardNumberInput(value: string): void {
    this.cardNumber = value;
    this.cardMembershipStatus = value?.trim() ? 'idle' : 'idle';
  }

  private checkCardMembershipAndCreate(cardNumber: string): void {
    if (!this.ensureGateConnectionReady()) return;

    const normalizedCard = cardNumber.trim().toUpperCase();
    if (!normalizedCard) {
      this.toast.warn(this.t('enter_card_first'));
      return;
    }

    this.cardMembershipStatus = 'checking';

    this.ticketsSvc.checkMembershipByCardNumber(normalizedCard).subscribe({
      next: (res) => {
        if (!res.isMember) {
          this.cardMembershipStatus = 'not-member';
          this.toast.warn(this.t('card_not_member'));
          return;
        }

        this.cardMembershipStatus = 'member';
        this.createSubscriberTicketWithPayload({
          cardNumber: normalizedCard,
          vehicleNumber: this.cardSummary?.vehicleNumber?.trim() || undefined,
        });
      },
      error: (err) => {
        this.cardMembershipStatus = 'error';
        this.handleBackendError('check-by-card-number error', err);
        this.toast.warn(this.t('card_membership_failed'));
      },
    });
  }

  private checkCurrentLprMembership(autoCreateSubscriber: boolean): void {
    const vehicleNumber = this.normalizeVehicleNumber(this.manualLprPlate);
    if (vehicleNumber.length < 3) return;

    this.currentLprVehicleNumber = vehicleNumber;

    const cachedMembership = this.lprMembershipCache.get(vehicleNumber);
    if (cachedMembership) {
      this.applyLprMembershipResult(vehicleNumber, cachedMembership, autoCreateSubscriber);
      return;
    }

    this.checkLprMembership(vehicleNumber, autoCreateSubscriber);
  }

  private checkLprMembership(vehicleNumber: string, autoCreateSubscriber: boolean): void {
    if (!this.ensureGateConnectionReady()) {
      this.lprMembershipStatus = 'error';
      return;
    }

    this.lastCheckedLprVehicleNumber = vehicleNumber;
    this.currentLprVehicleNumber = vehicleNumber;
    this.lprMembershipStatus = 'checking';
    this.lprMembershipCardNumber = null;

    this.ticketsSvc.isMembership(vehicleNumber).subscribe({
      next: (membership) => {
        this.lprMembershipCache.set(vehicleNumber, membership);
        this.applyLprMembershipResult(vehicleNumber, membership, autoCreateSubscriber);
      },
      error: (err) => {
        this.handleBackendError('IsMemberShip error', err);
        this.lprMembershipStatus = 'error';
        this.lprMembershipCardNumber = null;
        this.toast.warn(this.t('membership_check_failed'));
      },
    });
  }

  private applyLprMembershipResult(
    vehicleNumber: string,
    membership: MembershipCheckResponse,
    autoCreateSubscriber: boolean,
  ): void {
    this.currentLprVehicleNumber = vehicleNumber;
    const cardNumber = this.getMembershipCardNumber(membership);

    if (membership.isExist) {
      this.lprMembershipStatus = 'subscriber';
      this.lprMembershipCardNumber = cardNumber;
      this.selectedPricingSchemaId = '';

      if (cardNumber) {
        this.cardNumber = cardNumber;
      }
      if (membership.summary) {
        this.cardSummary = membership.summary;
      }

      if (autoCreateSubscriber) {
        if (this.autoCreatedLprVehicleNumbers.has(vehicleNumber)) return;
        this.autoCreatedLprVehicleNumbers.add(vehicleNumber);
        setTimeout(() => this.autoCreatedLprVehicleNumbers.delete(vehicleNumber), 10000);
      }

      this.createSubscriberTicketForVehicle(vehicleNumber, membership);
      return;
    }

    this.lprMembershipStatus = 'non-subscriber';
    this.lprMembershipCardNumber = null;
    this.cardSummary = null;
    this.cardNumber = '';
    this.ensurePricingSchemasLoaded();

    if (autoCreateSubscriber) {
      const pricingSchemaId = this.selectedPricingSchemaId?.trim();
      if (pricingSchemaId) {
        this.createNormalTicket(vehicleNumber, false, pricingSchemaId);
        return;
      }

      this.toast.warn(this.t('select_pricing_schema_first'));
    }
  }

  private ensurePricingSchemasLoaded(): void {
    if (this.pricingSchemasLoading || this.pricingSchemas.length) return;

    this.pricingSchemasLoading = true;

    this.registrationSvc.getAll().subscribe({
      next: (schemas) => {
        this.pricingSchemas = (schemas ?? []).map((schema: any) => ({
          id: schema.id ?? schema.Id ?? '',
          name: schema.name ?? schema.Name ?? '',
          description: schema.description ?? schema.Description ?? null,
        }));
      },
      error: (err) => {
        this.handleBackendError('Get Pricing Schemas error', err);
      },
      complete: () => {
        this.pricingSchemasLoading = false;
      },
    });
  }

  private createNonSubscriberLprTicket(vehicleNumber?: string): void {
    const normalizedVehicleNumber = vehicleNumber
      ? this.normalizeVehicleNumber(vehicleNumber)
      : this.currentLprVehicleNumber;

    if (!normalizedVehicleNumber) {
      this.toast.warn(this.t('enter_plate_first'));
      return;
    }

    const pricingSchemaId = this.selectedPricingSchemaId?.trim();
    if (!pricingSchemaId) {
      this.ensurePricingSchemasLoaded();
      this.toast.warn(this.t('select_pricing_schema_first'));
      this.lprMembershipStatus = 'non-subscriber';
      return;
    }

    this.createNormalTicket(normalizedVehicleNumber, false, pricingSchemaId);
  }

  private createNormalTicket(
    vehicleNumber?: string,
    statePrepared = false,
    pricingSchemaId?: string,
  ): void {
    if (!statePrepared) {
      if (this.adding) return;
      this.prepareNewTicketState();
    }

    const normalizedVehicleNumber = vehicleNumber
      ? this.normalizeVehicleNumber(vehicleNumber)
      : undefined;

    this.lastIssuedVehicleNumber = normalizedVehicleNumber ?? null;
    const vehicleImages = this.getVehicleImagePayloads();

    const payload = {
      isSubscriber: false,
      vehicleNumber: normalizedVehicleNumber,
      pricingSchemaId,
      vehicleImages,
    };
    console.log('CREATING TICKET PAYLOAD:', payload);

    this.ticketsSvc.addTicket(payload).subscribe({
      next: (res) => this.handleIssuedTicketResponse(res),
      error: (e) => {
        this.handleBackendError('AddTicket (normal) error', e);
        this.adding = false;
      },
    });
  }

  private createSubscriberTicketForVehicle(
    vehicleNumber: string,
    membership: MembershipCheckResponse,
    statePrepared = false,
  ): void {
    const card = this.getMembershipCardNumber(membership);
    this.cardNumber = card ?? '';
    this.cardSummary = membership.summary ?? this.cardSummary;

    this.createSubscriberTicketWithPayload(
      {
        cardNumber: card ?? undefined,
        vehicleNumber,
      },
      statePrepared,
    );
  }

  private loadSubscriberCardThenCreateTicket(vehicleNumber: string, statePrepared: boolean): void {
    if (!statePrepared) {
      if (this.adding) return;
      this.prepareNewTicketState();
    }

    this.ticketsSvc.getCardSummaryByVehicleNumber(vehicleNumber).subscribe({
      next: (summary) => {
        const card = summary?.cardNumber ?? (summary as any)?.CardNumber ?? null;
        if (!card) {
          this.toast.warn(this.t('no_card_for_subscriber'));
          this.adding = false;
          return;
        }

        this.cardNumber = String(card).trim();
        this.cardSummary = summary;

        this.createSubscriberTicketWithPayload(
          {
            cardNumber: this.cardNumber,
            vehicleNumber,
          },
          true,
        );
      },
      error: (err) => {
        this.handleBackendError('GetCardSummary by vehicle number error', err);
        this.adding = false;
      },
    });
  }

  private createSubscriberTicketWithPayload(
    data: { cardNumber?: string; vehicleNumber?: string },
    statePrepared = false,
  ): void {
    if (!statePrepared) {
      if (this.adding) return;
      this.prepareNewTicketState();
    }

    const normalizedVehicleNumber = data.vehicleNumber
      ? this.normalizeVehicleNumber(data.vehicleNumber)
      : undefined;

    this.lastIssuedVehicleNumber = normalizedVehicleNumber ?? null;
    const vehicleImages = this.getVehicleImagePayloads();

    const payload = {
      isSubscriber: true,
      vehicleNumber: normalizedVehicleNumber,
      cardNumber: data.cardNumber,
      vehicleImages,
    };
    console.log('CREATING SUBSCRIBER TICKET PAYLOAD:', payload);

    this.ticketsSvc.addTicket(payload).subscribe({
      next: (res) => this.handleIssuedTicketResponse(res),
      error: (e) => {
        this.handleBackendError('AddTicket (subscriber) error', e);
        this.adding = false;
      },
    });
  }

  private getMembershipCardNumber(membership: MembershipCheckResponse): string | null {
    const card =
      membership.cardNumber ??
      (membership.summary as any)?.cardNumber ??
      (membership.summary as any)?.CardNumber ??
      null;

    return card ? String(card).trim() : null;
  }

  private normalizeVehicleNumber(value: string | undefined | null): string {
    return (value ?? '').replace(/\s+/g, '').trim().toUpperCase();
  }

  private resetLprLookupState(vehicleNumber: string | null): void {
    this.currentLprVehicleNumber = vehicleNumber;
    this.lprMembershipStatus = 'idle';
    this.lprMembershipCardNumber = null;
    this.selectedPricingSchemaId = '';
  }

  private getVehicleImagePayloads(): File[] {
    if (this.uploadedVehicleImages.length) {
      return this.uploadedVehicleImages
        .map((file) => file.file)
        .filter((file): file is File => !!file);
    }

    return [this.scannedFile?.file ?? null].filter((file): file is File => !!file);
  }

  private revokeImageUrl(file: EntryVehicleImage | null | undefined): void {
    if (file?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
  }

  private findLastScannedAttachment(): EntryVehicleImage | null {
    for (let i = this.uploadedVehicleImages.length - 1; i >= 0; i--) {
      const file = this.uploadedVehicleImages[i];
      if (file?.url?.startsWith('blob:')) {
        return file;
      }
    }

    return null;
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
    if (!res) {
      this.adding = false;
      return;
    }

    this.uploadedVehicleImages.forEach((file) => this.revokeImageUrl(file));
    if (
      this.scannedFile &&
      !this.uploadedVehicleImages.some((file) => file.url === this.scannedFile?.url)
    ) {
      this.revokeImageUrl(this.scannedFile);
    }
    this.scannedFile = null;
    this.uploadedVehicleImages = [];
    this.selectedPricingSchemaId = '';
    this.lprMembershipStatus = 'idle';
    this.lprMembershipCardNumber = null;
    this.currentLprVehicleNumber = null;
    this.manualLprPlate = '';
    this.lastCheckedLprVehicleNumber = '';

    this.lastIssuedTicketId = res.ticketId ?? null;
    this.lastIssuedTicketInfo = res.ticketInfo ?? null;
    this.lastIssuedPrice = res.price ?? null;
    this.lastIssuedCreatedAt = res.createdAt ?? null;

    const fromResponse: string | undefined = (res as any)?.vehicleNumber;
    if (fromResponse && fromResponse.trim().length > 0) {
      this.lastIssuedVehicleNumber = fromResponse.trim();
    }

    const normalizedQr = this.normalizeQrImage(res.qrCode);

    if (!normalizedQr) {
      console.warn('Invalid qrCode returned from AddTicket', res.qrCode);

      this.currentIssuedQr = null;
      this.currentIssuedQrType = null;

      // هنا الرسالة محلية لأنها حالة خاصة (API رجع قيمة غير قابلة للاستخدام)
    }

    if (normalizedQr) {
      this.currentIssuedQr = normalizedQr;
      this.currentIssuedQrType = 'image';
    }

    this.finalizeIssuedTicketAfterCreate();
  }

  private finalizeIssuedTicketAfterCreate(): void {
    this._cashierCollected = true;

    if (this.lastIssuedTicketId) {
      this.markTicketAsCashierCollected(this.lastIssuedTicketId);
    }

    this.toast.success(this.t('create_ticket'));
    this.openGateAfterTicketCreate();

    if (!this.currentIssuedQr) {
      this.toast.error(this.t('qr_invalid_warning'));
    } else {
      this.printTicketDocuments();
    }

    this.loadTicketsForEntry();
    this.adding = false;
  }

  retryOpenGate(): void {
    this.openGateAfterTicketCreate();
  }

  private openGateAfterTicketCreate(): void {
    const controllerId = this.gateConnectionInfo?.controlIp?.trim();
    if (!controllerId) {
      this.openGateError = this.t('open_gate_failed');
      this.toast.warn(this.t('open_gate_failed'));
      return;
    }

    this.openGateLoading = true;
    this.openGateError = null;
    this.lastOpenGateResponse = null;

    this.gateSvc.openGate(controllerId).subscribe({
      next: (res) => {
        this.lastOpenGateResponse = res;
        this.toast.success(this.t('open_gate_success'));
      },
      error: (err) => {
        console.error('OpenGate error', err);
        this.openGateError = this.t('open_gate_failed');
        this.toast.error(this.t('open_gate_failed'));
      },
      complete: () => {
        this.openGateLoading = false;
      },
    });
  }

  // =======================
  // Printing
  // =======================
  printTicketDocuments(): void {
    if (!this.currentIssuedQr) return;

    const imgSrc =
      this.currentIssuedQrType === 'image'
        ? this.currentIssuedQr
        : this.qrDataUrl(this.currentIssuedQr);

    const createdAtText = this.buildCreatedAtText();
    const gateNumber = this.gatePeripheral?.gateNumber ?? '—';
    const isExit = this.gatePeripheral?.gateType === GateType.Exit;
    const dateTimeLabel = isExit ? 'تاريخ الخروج:' : 'تاريخ الدخول:';

    const qrTicketHtml = this.buildQrTicketPrintHtml({
      imgSrc,
      createdAt: createdAtText,
      gateNumber,
      ticketInfo: this.lastIssuedTicketInfo,
      dateTimeLabel: dateTimeLabel,
    });

    const feesTicketHtml = this.buildFeesTicketPrintHtml({
      createdAt: createdAtText,
      gateNumber,
      ticketInfo: this.lastIssuedTicketInfo,
      vehicleNumber: this.lastIssuedVehicleNumber,
      price: this.lastIssuedPrice,
      dateTimeLabel: dateTimeLabel,
    });

    this.printHtmlNative(qrTicketHtml, feesTicketHtml);
  }

  private printHtmlNative(qrHtml: string, feesHtml: string): void {
    const qrJob = {
      printerName: environment.qrPrinterName,
      htmlContent: qrHtml,
      jobName: `QR-Ticket-${this.lastIssuedTicketId ?? 'unknown'}`,
    };

    const feesJob = {
      printerName: environment.receiptPrinterName,
      htmlContent: feesHtml,
      jobName: `Receipt-Ticket-${this.lastIssuedTicketId ?? 'unknown'}`,
    };

    forkJoin([this.localPrint.printHtml(qrJob), this.localPrint.printHtml(feesJob)]).subscribe({
      next: () => {
        this.toast.success(this.t('printing_sent'));
      },
      error: (err) => {
        console.error('[printHtmlNative] Print jobs failed', err);
        this.toast.error(this.t('printing_failed'));
      },
    });
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

  private buildQrTicketPrintHtml(opts: {
    imgSrc: string;
    createdAt: string;
    gateNumber: string | number;
    ticketInfo: string | null;
    dateTimeLabel: string;
  }): string {
    return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>NPark QR Ticket</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          @page {
            margin: 0;
            size: 80mm auto;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: 'Arial', sans-serif;
            direction: rtl;
            width: 80mm;
            color: #000;
            background: #fff;
            font-weight: 900;
            overflow: hidden;
          }

          .rotation-wrapper {
            width: 80mm;
            padding: 2mm;
            transform: rotate(90deg);
            transform-origin: top left;
            position: absolute;
            top: 0;
            left: 80mm; /* Move it back into view after rotation */
            height: 80mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .ticket-wrapper {
            width: 76mm; 
            border: 0.6mm solid #000;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            gap: 1mm;
          }

          .header-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
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
            font-size: 13px;
          }

          .label {
            white-space: nowrap;
          }

          .value {
            text-align: left;
            direction: ltr;
            font-size: 13px;
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
            font-size: 10px;
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
              <span>رقم التذكرة:</span>
              <span style="direction: ltr;">${opts.ticketInfo || '---'}</span>
            </div>

            <div class="main-row">
              <div class="info-side">
                <div class="info-item">
                  <span class="label">${opts.dateTimeLabel}</span>
                  <span class="value">${opts.createdAt}</span>
                </div>
                <div class="info-item">
                  <span class="label">رقم البوابة:</span>
                  <span class="value">${opts.gateNumber}</span>
                </div>
              </div>

              <div class="qr-side">
                <img src="${opts.imgSrc}" alt="QR" />
              </div>
            </div>

            <div class="footer-line">
              <div>www.niletronix.com</div>
            </div>
          </div>
        </div>
      </body>
    </html>`;
  }

  private buildFeesTicketPrintHtml(opts: {
    createdAt: string;
    gateNumber: string | number;
    ticketInfo: string | null;
    vehicleNumber: string | null;
    price: number | null;
    dateTimeLabel: string;
  }): string {
    const priceText = opts.price !== null && opts.price !== undefined ? `${opts.price} ج.م` : '---';

    return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>NPark Payment Receipt</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          @page {
            margin: 0;
            size: 80mm auto;
          }

          body {
            margin: 0;
            padding: 1mm;
            font-family: 'Arial', sans-serif;
            direction: rtl;
            width: 80mm;
            font-weight: 900;
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

          .receipt-title {
            font-size: 20px;
            font-weight: 900;
            color: #000;
          }

          .receipt-subtitle {
            font-size: 13px;
            font-weight: 900;
            margin-top: 0.5mm;
          }

          .receipt-body {
            display: flex;
            flex-direction: column;
            gap: 1mm;
          }

          .receipt-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            padding: 1mm 0;
            border-bottom: 0.2mm solid #000;
          }

          .receipt-row:last-child {
            border-bottom: none;
          }

          .receipt-label {
            font-weight: bold;
          }

          .receipt-value {
            font-weight: 900;
          }

          .total-section {
            margin-top: 1mm;
            background: #f0f0f0;
            padding: 2mm;
            border-radius: 1mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 0.6mm solid #000;
          }

          .total-label {
            font-size: 16px;
            font-weight: 900;
          }

          .total-value {
            font-size: 20px;
            font-weight: 900;
          }

          .receipt-footer {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            margin-top: 1mm;
          }
        </style>
      </head>
      <body>
        <div class="receipt-wrap">
          <div class="receipt-header">
            <div class="receipt-title">إيصال دفع</div>
            <div class="receipt-subtitle">NPark Management System</div>
          </div>
          
          <div class="receipt-body">
            <div class="receipt-row">
              <span class="receipt-label">رقم التذكرة:</span>
              <span class="receipt-value">${opts.ticketInfo ?? '---'}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">رقم السيارة:</span>
              <span class="receipt-value">${opts.vehicleNumber ?? '---'}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">رقم البوابة:</span>
              <span class="receipt-value">${opts.gateNumber}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">${opts.dateTimeLabel}</span>
              <span class="receipt-value" style="direction: ltr;">${opts.createdAt}</span>
            </div>
          </div>

          <div class="total-section">
            <span class="total-label">الإجمالي:</span>
            <span class="total-value">${priceText}</span>
          </div>

          <div class="receipt-footer">
            شكراً لزيارتكم<br>
            www.niletronix.com
          </div>
        </div>
      </body>
    </html>`;
  }

  private resetIssuedTicketOutput(): void {
    this.currentIssuedQr = null;
    this.currentIssuedQrType = null;
    this.lastIssuedTicketId = null;
    this.lastIssuedTicketInfo = null;
    this.lastIssuedPrice = null;
    this.lastIssuedCreatedAt = null;
    this.lastIssuedVehicleNumber = null;
    this._cashierCollected = false;
    this.collectingCashierCash = false;
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
    // Backend removed /Ticket/CollectCashier for entry cashier flow.
    this.markTicketAsCashierCollected(ticketId);
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
      this.checkCardMembershipAndCreate(normalized);
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
    if (!this.lastIssuedTicketId || this._cashierCollected) {
      return;
    }

    // Backend removed /Ticket/CollectCashier for entry cashier flow.
    this._cashierCollected = true;
    this.markTicketAsCashierCollected(this.lastIssuedTicketId);
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
      const ticketNumber = String(t.ticketNumber ?? '').toLowerCase();

      const okQ =
        !q ||
        t.plate.toLowerCase().includes(q) ||
        String(t.id).toLowerCase().includes(q) ||
        ticketNumber.includes(q) ||
        info.includes(q);

      const okA = !this.action || t.action === this.action;
      const okG = !this.gate || t.gate === this.gate;
      return okQ && okA && okG;
    });
  }

  closeTicketDetailsModal(): void {
    this.showTicketDetailsModal = false;
    this.selectedTicketForModal = null;
  }

  private normalizeQrImage(qr: string | number[] | null | undefined): string | null {
    if (!qr) return null;
    if (Array.isArray(qr)) {
      try {
        const binary = String.fromCharCode(...qr);
        return `data:image/png;base64,${btoa(binary)}`;
      } catch (err) {
        console.error('Failed to convert QR byte array to base64:', err);
        return null;
      }
    }

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
