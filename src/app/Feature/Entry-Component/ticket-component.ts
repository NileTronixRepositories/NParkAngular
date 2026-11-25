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
import { Subscription, firstValueFrom, timer } from 'rxjs';
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
  CardMembershipCheckResponse,
  AddTicketRequest,
  EntryConfirmationStatus,
} from '../../Domain/tickets/tickets.model';
import {
  GateOperationResponse,
  generateGateRequestId,
  isFailedGateOperationStatus,
  isInFlightGateOperationStatus,
  isUncertainGateOutcome,
} from '../../Domain/Gate/gate-operation.models';
import { GateOperationService } from '../../Services/Gate/gate-operation.service';
import { GateOperationStoreService } from '../../Services/Gate/gate-operation-store.service';
import { DashboardHubService } from '../../Services/OverView/dashboard-hub.service';

import { TicketsServices } from '../../Services/Tickets/tickets-services';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import {
  GateConnectionInfo,
  GateServices,
  OpenGateResponse,
} from '../../Services/Gate/gate-services';
import { GatePeripheralFacade } from '../../Services/Gate/gate-peripheral.facade';
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
import { ScannerAttachmentService } from '../../Services/Gate/scanner-attachment.service';
import {
  LprSignalRService,
  MqttCaptureDetectedEvent,
  LprVehicleDetectedEvent,
} from '../../Services/Gate/lpr-signalr.service';
import { EntryTourService } from '../../Services/Entry/entry-tour.service';
import { SupervisorModalBlockComponent } from '../Shared/supervisor-modal-block-component/supervisor-modal-block-component';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { TicketDetailsModalBlockComponent } from '../Shared/ticket-details-modal-block-component/ticket-details-modal-block-component';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { PricingSchemaDto } from '../../Domain/registration/registration-model';
import { Registrationservice } from '../../Services/registration/registrationservice';
import { TicketPrintService } from '../../Services/Print/ticket-print.service';

type LprMembershipStatus = 'idle' | 'checking' | 'subscriber' | 'non-subscriber' | 'error';

type CardMembershipStatus = 'idle' | 'checking' | 'member' | 'not-member' | 'error';

interface EntryVehicleImage {
  name: string;
  url: string;
  safeUrl?: SafeResourceUrl;
  type: string;
  file: File;
  source?: 'scanner' | 'snapshot' | 'upload';
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
  private readonly gatePeripheralFacade = inject(GatePeripheralFacade);
  private readonly auth = inject(AuthService);
  private readonly nfc = inject(NfcReaderService);
  private readonly toast = inject(ToastServices);
  private readonly entryTour = inject(EntryTourService);
  private readonly scanHub = inject(ScanHubService);
  private readonly scannerAttachment = inject(ScannerAttachmentService);
  private readonly lprSignalR = inject(LprSignalRService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly errorExtractor = inject(ErrorExtractorService);
  private readonly hubSubscriptions = new Subscription();
  private readonly localHealth = inject(LocalHealthService);
  private readonly router = inject(Router);
  private readonly registrationSvc = inject(Registrationservice);
  private readonly ticketPrint = inject(TicketPrintService);
  private readonly gateOperationSvc = inject(GateOperationService);
  private readonly gateOperationStore = inject(GateOperationStoreService);
  private readonly dashboardHub = inject(DashboardHubService);

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
  lastIssuedValidExitDate: string | null = null;
  lastIssuedEntryConfirmationStatus: EntryConfirmationStatus | null = null;
  private confirmedEntryOperationIds = new Set<string>();

  // =======================
  // Manual inputs / card
  // =======================
  manualLprPlate = '';
  cardNumber = '';
  readonly readingCard = signal(false);
  cardMembershipStatus: CardMembershipStatus = 'idle';
  private lprMembershipCheckTimer?: ReturnType<typeof setTimeout>;
  private cardMembershipCheckTimer?: ReturnType<typeof setTimeout>;
  private lastCheckedLprVehicleNumber = '';
  private lastCheckedCardNumber = '';
  private readonly lprMembershipCache = new Map<string, MembershipCheckResponse>();
  private readonly cardMembershipCache = new Map<string, CardMembershipCheckResponse>();
  private readonly autoCreatedLprVehicleNumbers = new Set<string>();
  private readonly autoCreatedCardNumbers = new Set<string>();
  currentLprVehicleNumber: string | null = null;
  lprMembershipStatus: LprMembershipStatus = 'idle';
  lprMembershipCardNumber: string | null = null;
  pricingSchemas: PricingSchemaDto[] = [];
  pricingSchemasLoading = false;
  selectedPricingSchemaId = '';
  showMissingLprVehicleHint = false;
  lprFocusRequest = 0;

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
  supervisorCollectToken: string | null = null;

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
  printQrEnabled = true;
  printReceiptEnabled = true;

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
      scanner_ready: 'كاميرا الرؤية الأمامية',
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
      ticket_details: 'تفاصيل',
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
      no_uncollected_tickets: 'لا توجد تذاكر غير محصلة لهذه البوابة.',
      gate_number: 'رقم البوابة',
      gate_type: 'نوع البوابة',
      gate_type_entry: 'دخول',
      gate_type_exit: 'خروج',
      collect: 'تحصيل',
      collected: 'تم التحصيل',
      actions: 'الإجراءات',
      save: 'حفظ',
      enter_plate_first: 'يرجى إدخال رقم السيارة أولاً',
      lpr_non_subscriber_manual: 'هذه المركبة غير مشتركة. اضغط إنشاء تذكرة لإصدار تذكرة عادية.',
      membership_check_failed: 'تعذر التحقق من الاشتراك لهذه المركبة.',
      no_card_for_subscriber: 'لا يوجد رقم كارت لعميل مشترك',
      create_ticket_failed: 'فشل إنشاء تذكرة',
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
      no_enter_price_schemas: 'لا توجد أسعار دخول. يرجى إنشاء سعر دخول أولا.',
      lpr_vehicle_number_missing_after_pricing: 'لم يتم إدخال رقم سيارة من LPR',
      create_lpr_ticket: 'إنشاء تذكرة LPR',
      vehicle_images: 'ماسح الصور',
      vehicle_images_optional: 'صور المركبة اختيارية.',
      vehicle_images_attached: 'تم إرفاق صور المركبة',
      printing_failed: 'تعذر إرسال أوامر الطباعة إلى خدمة الطابعة المحلية.',
      printing_sent: 'تم إرسال أوامر الطباعة بنجاح.',
      collect_receipt_printer_missing: 'طابعة الإيصال غير مفعلة لهذه البوابة.',
      print_options: 'خيارات الطباعة',
      print_qr: 'QR',
      print_receipt: 'الإيصال',
      select_print_option: 'اختر نوع طباعة واحد على الأقل',
      gate_info: 'بيانات اتصال البوابة',
      control_id: 'معرّف وحدة التحكم',
      camera_url: 'رابط الكاميرا',
      camera_snapshot: 'لقطة الكاميرا',
      take_snapshot: 'التقاط صورة',
      retry_snapshot: 'إعادة التقاط الصورة',
      continue_without_image: 'المتابعة بدون صورة',
      gate_connection_failed: 'تعذر تحميل بيانات اتصال البوابة.',
      gate_connection_loading: 'جاري تحميل بيانات اتصال البوابة.',
      snapshot_failed: 'تعذر تحميل لقطة الكاميرا.',
      scanner_photo_required: 'صورة الـ Scanner مطلوبة لهذه البوابة.',
      card_not_member: 'هذا الكارت غير مسجل كعضوية.',
      card_membership_failed: 'تعذر التحقق من عضوية الكارت.',
      open_gate_success: 'تم فتح البوابة بنجاح.',
      open_gate_failed: 'تم إنشاء التذكرة بنجاح، لكن تعذر فتح البوابة.',
      retry_open_gate: 'إعادة فتح البوابة',
      save_to_pc: 'حفظ على الجهاز',
      currency: 'ج.م',
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
      scanner_ready: 'Front View Cam',
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
      ticket_details: 'Details',
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
      no_uncollected_tickets: 'There are no uncollected tickets for this gate.',
      gate_number: 'Gate number',
      gate_type: 'Gate type',
      gate_type_entry: 'Entry',
      gate_type_exit: 'Exit',
      collect: 'Collect',
      collected: 'Collected',
      actions: 'Actions',
      save: 'Save',
      enter_plate_first: 'Please enter vehicle number first',
      lpr_non_subscriber_manual:
        'This vehicle is not a subscriber. Click Create Ticket to issue a normal ticket.',
      membership_check_failed: 'Could not check membership for this vehicle.',
      no_card_for_subscriber: 'No card number for subscriber',
      create_ticket_failed: 'Failed to create ticket.',
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
      no_enter_price_schemas: 'No enter price schemas found. Please create one first.',
      lpr_vehicle_number_missing_after_pricing: 'No LPR vehicle number entered',
      create_lpr_ticket: 'Create LPR ticket',
      vehicle_images: 'Vehicle images',
      vehicle_images_optional: 'Vehicle images are optional.',
      vehicle_images_attached: 'Vehicle images attached',
      printing_failed: 'Failed to send print jobs to the local printer service.',
      printing_sent: 'Print jobs were sent successfully.',
      collect_receipt_printer_missing: 'Receipt printer is not configured for this gate.',
      print_options: 'Print options',
      print_qr: 'QR',
      print_receipt: 'Receipt',
      select_print_option: 'Select at least one print option.',
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
      scanner_photo_required: 'Scanner photo is required for this gate.',
      card_not_member: 'This card is not registered as a membership.',
      card_membership_failed: 'Failed to check card membership.',
      open_gate_success: 'Gate opened successfully.',
      open_gate_failed: 'Ticket created successfully, but gate open failed.',
      retry_open_gate: 'Retry open gate',
      save_to_pc: 'Save to PC',
      currency: 'EGP',
      lpr_vehicle_received: 'LPR vehicle received',
    },
  };

  t = (k: string) => this.i18n.translate(this.dict, k);
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
    this.loadEntryTicketsForCurrentMode();
    this.ensurePricingSchemasLoaded();

    this.scanHub.start().then(() => {
      const gateId = this.auth.getGateId();
      if (gateId) {
        this.scanHub.joinStation(gateId.toString());
      }
    });

    this.lprSignalR
      .start()
      .then(() => {
        console.log('[Entry LPR SignalR] connected', {
          gateId: this.auth.getGateId(),
        });
      })
      .catch((err) => console.error('LPR SignalR (Entry) connection error', err));

    this.dashboardHub
      .start()
      .catch((err) => console.error('DashboardHub (Entry) connection error', err));

    this.hubSubscriptions.add(
      this.gateOperationStore.operationUpdates$.subscribe((op) => {
        this.handleEntryGateOperationUpdate(op);
      }),
    );

    const currentGateId = this.auth.getGateId();
    if (currentGateId) {
      this.hubSubscriptions.add(
        this.gateOperationStore
          .recoverForGate(String(currentGateId))
          .subscribe((ops) => {
            const activeEntry = ops.find(
              (o) => o.operationType === 'Entry' && isInFlightGateOperationStatus(o.status),
            );
            if (activeEntry) {
              this.lastOpenGateResponse = activeEntry;
              if (activeEntry.ticketId) {
                this.lastIssuedTicketId = activeEntry.ticketId;
                this.lastIssuedEntryConfirmationStatus = 'Pending';
              }
              this.cdr.markForCheck();
            }
          }),
      );
    }

    this.hubSubscriptions.add(
      this.scanHub.scan$.subscribe((msg) => {
        console.log('TicketComponent: Received scan event', msg.fileName);
        this.handleScannedFile(msg);
      }),
    );

    this.hubSubscriptions.add(
      this.lprSignalR.vehicleDetected$.subscribe((event) => {
        console.log('[Entry LPR SignalR] lprVehicleDetected received', event);
        this.handleLprVehicleDetected(event);
      }),
    );

    this.hubSubscriptions.add(
      this.lprSignalR.mqttCaptureDetected$.subscribe((event) => {
        console.log('[Entry LPR SignalR] mqttCaptureDetected received', event);
        this.handleMqttCaptureDetected(event);
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
      const attachment = this.scannerAttachment.fromScanMessage(msg);

      const scannedAttachment: EntryVehicleImage = {
        name: attachment.name,
        url: attachment.url,
        safeUrl: attachment.safeUrl,
        type: attachment.type,
        file: attachment.file,
        source: 'scanner',
      };

      this.uploadedVehicleImages = [...this.uploadedVehicleImages, scannedAttachment];

      console.log('TicketComponent: Successfully processed file', {
        name: msg.fileName,
        type: msg.contentType,
        size: attachment.size,
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
    if (this.cardMembershipCheckTimer) {
      clearTimeout(this.cardMembershipCheckTimer);
    }
    this.uploadedVehicleImages.forEach((file) => this.revokeImageUrl(file));
    if (
      this.scannedFile &&
      !this.uploadedVehicleImages.some((file) => file.url === this.scannedFile?.url)
    ) {
      this.revokeImageUrl(this.scannedFile);
    }
    this.entryTour.cancelTour();
    this.hubSubscriptions.unsubscribe();
    this.lprSignalR.stop();
  }

  private handleLprVehicleDetected(event: LprVehicleDetectedEvent): void {
    const currentGateId = this.auth.getGateId();
    const isCurrentGate = this.isCurrentGateEvent(event.gateId);
    const rawVehicleNumber = event.vehicleNumber ?? '';

    console.log('[Entry LPR SignalR] gate match check', {
      eventGateId: event.gateId,
      currentGateId,
      isCurrentGate,
      rawVehicleNumber,
    });

    if (!isCurrentGate) return;

    const vehicleNumber = this.normalizeVehicleNumber(rawVehicleNumber);
    if (!vehicleNumber) {
      console.warn('[Entry LPR SignalR] ignored empty vehicleNumber', event);
      return;
    }

    this.onManualLprPlateChange(vehicleNumber);
    this.onManualLprPlateBlur();
    console.log('[Entry LPR SignalR] applied raw vehicleNumber to Entry UI', {
      rawVehicleNumber,
      vehicleNumber,
      gateId: currentGateId,
    });
    this.toast.success(`${this.t('lpr_vehicle_received')}: ${vehicleNumber}`);
    this.cdr.markForCheck();
  }

  private isCurrentGateEvent(gateId: string | number | null | undefined): boolean {
    const currentGateId = this.auth.getGateId();
    if (!gateId || !currentGateId) return false;

    return String(gateId).trim().toLowerCase() === String(currentGateId).trim().toLowerCase();
  }

  private handleMqttCaptureDetected(event: MqttCaptureDetectedEvent): void {
    const eventDeviceId = this.normalizeDeviceId(event.deviceId);
    const currentControlId = this.normalizeDeviceId(this.gateConnectionInfo?.controlIp);
    const shouldCapture = event.captureId && !!eventDeviceId && eventDeviceId === currentControlId;

    console.log('[Entry LPR SignalR] MQTT capture match check', {
      eventDeviceId,
      currentControlId,
      captureId: event.captureId,
      shouldCapture,
    });

    if (!shouldCapture) return;

    const cameraUrl = this.gatePeripheralFacade.cameraUrl(this.gateConnectionInfo);
    if (!cameraUrl) {
      this.snapshotError = this.t('snapshot_failed');
      this.toast.warn(this.t('snapshot_failed'));
      return;
    }

    if (this.snapshotLoading) return;
    this.loadCameraSnapshot(cameraUrl);
  }

  private normalizeDeviceId(value: string | number | null | undefined): string {
    return String(value ?? '')
      .trim()
      .toLowerCase();
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
      this.applyGatePrinterOptions(null);
      this.gateConnectionError = this.t('gate_connection_failed');
      return;
    }

    this.gateConnectionLoading = true;
    this.gateConnectionError = null;
    this.snapshotError = null;

    this.gatePeripheralFacade.getConnectionInfo(gateId).subscribe({
      next: (info) => {
        this.gateConnectionInfo = info;
        this.applyGatePrinterOptions(info);
        this.mergeGateConnectionIntoPeripheral(info);

        const cameraUrl = this.gatePeripheralFacade.cameraUrl(info);
        if (cameraUrl) {
          this.loadCameraSnapshot(cameraUrl);
        }
      },
      error: (err) => {
        console.error('Gate connection-info error', err);
        this.gateConnectionInfo = null;
        this.applyGatePrinterOptions(null);
        this.gateConnectionError = this.t('gate_connection_failed');
        this.toast.error(this.t('gate_connection_failed'));
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

  private applyGatePrinterOptions(info: GateConnectionInfo | null): void {
    const options = this.gatePeripheralFacade.printerOptions(info);
    this.printQrEnabled = options.printQrEnabled;
    this.printReceiptEnabled = options.printReceiptEnabled;
  }

  private ensureGateConnectionReady(): boolean {
    if (this.gateConnectionInfo && !this.gateConnectionError) {
      return true;
    }

    this.toast.warn(
      this.gateConnectionLoading
        ? this.t('gate_connection_loading')
        : this.t('gate_connection_failed'),
    );
    return false;
  }

  retrySnapshot(): void {
    const cameraUrl = this.gatePeripheralFacade.cameraUrl(this.gateConnectionInfo);
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
        this.attachSnapshotFile(this.scannerAttachment.fromSnapshotBlob(blob).file);
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

  private async captureSnapshotForPricingTicket(): Promise<boolean> {
    const cameraUrl = this.gatePeripheralFacade.cameraUrl(this.gateConnectionInfo);
    if (!cameraUrl) return false;

    this.snapshotLoading = true;
    this.snapshotError = null;

    try {
      const blob = await firstValueFrom(this.gateSvc.getSnapshot(cameraUrl));
      this.attachSnapshotFile(this.scannerAttachment.fromSnapshotBlob(blob).file);
      return true;
    } catch (err) {
      console.error('Camera snapshot error', err);
      this.snapshotError = this.t('snapshot_failed');
      this.toast.warn(this.t('snapshot_failed'));
      return false;
    } finally {
      this.snapshotLoading = false;
      this.cdr.markForCheck();
    }
  }

  private attachSnapshotFile(file: File): void {
    const rawUrl = URL.createObjectURL(file);
    const snapshotAttachment: EntryVehicleImage = {
      name: file.name,
      url: rawUrl,
      safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl),
      type: file.type || 'image/jpeg',
      file,
      source: 'snapshot',
    };

    if (
      this.scannedFile &&
      this.isSnapshotAttachment(this.scannedFile) &&
      !this.uploadedVehicleImages.some((attachment) => attachment.url === this.scannedFile?.url)
    ) {
      this.revokeImageUrl(this.scannedFile);
    }

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
        this.loadEntryTicketsForCurrentMode();
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
    const vehicleNumber = this.normalizeVehicleNumber(value);
    const searchValue = this.normalizeMembershipSearchValue(vehicleNumber);
    this.manualLprPlate = vehicleNumber;

    if (this.lprMembershipCheckTimer) {
      clearTimeout(this.lprMembershipCheckTimer);
    }
    if (this.cardMembershipCheckTimer) {
      clearTimeout(this.cardMembershipCheckTimer);
    }

    this.currentLprVehicleNumber = vehicleNumber || null;
    this.showMissingLprVehicleHint = !!this.selectedPricingSchemaId && !searchValue;

    if (searchValue.length < 3) {
      this.resetLprLookupState(vehicleNumber || null);
      this.lastCheckedLprVehicleNumber = '';
      return;
    }

    this.resetLprLookupState(vehicleNumber);

    this.lprMembershipCheckTimer = setTimeout(() => {
      const currentVehicleNumber = this.normalizeVehicleNumber(this.manualLprPlate);
      const currentSearchValue = this.normalizeMembershipSearchValue(currentVehicleNumber);
      if (
        !currentSearchValue ||
        currentSearchValue !== searchValue ||
        currentSearchValue === this.lastCheckedLprVehicleNumber
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
        source: 'upload',
      });
    }

    this.uploadedVehicleImages = [...this.uploadedVehicleImages, ...uploaded];
  }

  removeVehicleImage(index: number): void {
    if (index < 0 || index >= this.uploadedVehicleImages.length) return;

    const removed = this.uploadedVehicleImages[index];
    this.uploadedVehicleImages = this.uploadedVehicleImages.filter((_, i) => i !== index);

    this.revokeImageUrl(removed);
  }

  selectVehicleImagePreview(index: number): void {
    if (index < 0 || index >= this.uploadedVehicleImages.length) return;
  }

  async onPricingSchemaSelected(pricingSchemaId: string): Promise<void> {
    if (this.adding || this.snapshotLoading) return;

    const selectedId = pricingSchemaId?.trim();
    if (!selectedId) return;

    this.selectedPricingSchemaId = selectedId;

    const vehicleNumber = this.normalizeMembershipSearchValue(
      this.manualLprPlate || this.currentLprVehicleNumber,
    );
    this.showMissingLprVehicleHint = !vehicleNumber;
    if (!vehicleNumber) {
      this.toast.warn(this.t('enter_plate_first'));
      this.requestLprPlateFocus();
      return;
    }

    if (!this.ensureGateConnectionReady()) return;

    const captured = await this.captureSnapshotForPricingTicket();
    if (!captured && this.gatePeripheralFacade.cameraUrl(this.gateConnectionInfo)) {
      return;
    }

    this.createTicket();
  }

  createTicket(vehicleNumber?: string): void {
    if (this.adding) return;
    if (!this.ensureGateConnectionReady()) return;

    const normalizedVehicleNumber =
      vehicleNumber !== undefined
        ? this.normalizeMembershipSearchValue(vehicleNumber)
        : this.normalizeMembershipSearchValue(this.currentLprVehicleNumber);

    if (vehicleNumber !== undefined && !normalizedVehicleNumber) {
      this.toast.warn(this.t('enter_plate_first'));
      this.showMissingLprVehicleHint = true;
      this.requestLprPlateFocus();
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

    this.showMissingLprVehicleHint = true;
    this.toast.warn(this.t('enter_plate_first'));
    this.requestLprPlateFocus();
    return;
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
    const normalizedCard = this.normalizeCardNumber(value);
    this.cardNumber = normalizedCard;

    if (this.cardMembershipCheckTimer) {
      clearTimeout(this.cardMembershipCheckTimer);
    }

    if (normalizedCard.length < 3) {
      this.resetCardLookupState();
      this.lastCheckedCardNumber = '';
      return;
    }

    this.cardMembershipStatus = 'idle';
    this.cardSummary = null;

    this.cardMembershipCheckTimer = setTimeout(() => {
      const currentCardNumber = this.normalizeCardNumber(this.cardNumber);
      if (
        !currentCardNumber ||
        currentCardNumber !== normalizedCard ||
        currentCardNumber === this.lastCheckedCardNumber
      ) {
        return;
      }

      this.checkCardMembershipAndCreate(currentCardNumber, true, false);
    }, 650);
  }

  private checkCardMembershipAndCreate(
    cardNumber: string,
    autoCreateSubscriber = true,
    showWarnings = true,
  ): void {
    if (!this.ensureGateConnectionReady()) return;

    const normalizedCard = this.normalizeCardNumber(cardNumber);
    if (!normalizedCard) {
      this.toast.warn(this.t('enter_card_first'));
      return;
    }

    const cachedMembership = this.cardMembershipCache.get(normalizedCard);
    if (cachedMembership) {
      this.applyCardMembershipResult(
        normalizedCard,
        cachedMembership,
        autoCreateSubscriber,
        showWarnings,
      );
      return;
    }

    this.lastCheckedCardNumber = normalizedCard;
    this.cardMembershipStatus = 'checking';

    this.ticketsSvc.checkMembershipByCardNumber(normalizedCard).subscribe({
      next: (res) => {
        if (this.normalizeCardNumber(this.cardNumber) !== normalizedCard) {
          return;
        }

        this.cardMembershipCache.set(normalizedCard, res);
        this.applyCardMembershipResult(normalizedCard, res, autoCreateSubscriber, showWarnings);
      },
      error: (err) => {
        if (this.normalizeCardNumber(this.cardNumber) !== normalizedCard) {
          return;
        }

        this.cardMembershipStatus = 'error';
        this.handleBackendError('check-by-card-number error', err);
        if (showWarnings) {
          this.toast.warn(this.t('card_membership_failed'));
        }
      },
    });
  }

  private applyCardMembershipResult(
    cardNumber: string,
    membership: CardMembershipCheckResponse,
    autoCreateSubscriber: boolean,
    showWarnings: boolean,
  ): void {
    this.cardNumber = cardNumber;

    if (!membership.isMember) {
      this.cardMembershipStatus = 'not-member';
      this.cardSummary = null;

      if (showWarnings) {
        this.toast.warn(this.t('card_not_member'));
      }
      return;
    }

    this.cardMembershipStatus = 'member';
    this.selectedPricingSchemaId = '';

    if (membership.summary) {
      this.cardSummary = membership.summary;
    }

    if (!autoCreateSubscriber) return;
    if (this.autoCreatedCardNumbers.has(cardNumber)) return;

    this.autoCreatedCardNumbers.add(cardNumber);
    setTimeout(() => this.autoCreatedCardNumbers.delete(cardNumber), 10000);

    this.createSubscriberTicketWithPayload({
      cardNumber: membership.cardNumber?.trim() || cardNumber,
      vehicleNumber:
        membership.vehicleNumber?.trim() ||
        membership.summary?.vehicleNumber?.trim() ||
        this.cardSummary?.vehicleNumber?.trim() ||
        undefined,
    });
  }

  private checkCurrentLprMembership(autoCreateSubscriber: boolean): void {
    const displayValue = this.normalizeVehicleNumber(this.manualLprPlate);
    const vehicleNumber = this.normalizeMembershipSearchValue(displayValue);
    if (vehicleNumber.length < 3) return;

    this.currentLprVehicleNumber = displayValue || vehicleNumber;

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

    this.ticketsSvc.membershipExists(vehicleNumber).subscribe({
      next: (membership) => {
        this.lprMembershipCache.set(vehicleNumber, membership);
        this.applyLprMembershipResult(vehicleNumber, membership, autoCreateSubscriber);
      },
      error: (err) => {
        this.handleBackendError('membership-exists error', err);
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
    const resolvedVehicleNumber = this.getMembershipVehicleNumber(membership, vehicleNumber);
    const cardNumber = this.getMembershipCardNumber(membership);
    this.currentLprVehicleNumber = resolvedVehicleNumber;

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

      this.createSubscriberTicketFromMembership(vehicleNumber, membership);
      return;
    }

    this.applyLprNonSubscriberResult(vehicleNumber, autoCreateSubscriber);
  }

  private tryCardMembershipFromLprInput(inputText: string, autoCreateSubscriber: boolean): void {
    const normalizedCard = this.normalizeCardNumber(inputText);
    if (normalizedCard.length < 3) {
      this.applyLprNonSubscriberResult(inputText, autoCreateSubscriber);
      return;
    }

    const cachedMembership = this.cardMembershipCache.get(normalizedCard);
    if (cachedMembership) {
      this.applyLprCardFallbackResult(
        inputText,
        normalizedCard,
        cachedMembership,
        autoCreateSubscriber,
      );
      return;
    }

    this.lastCheckedCardNumber = normalizedCard;
    this.cardMembershipStatus = 'checking';

    this.ticketsSvc.checkMembershipByCardNumber(normalizedCard).subscribe({
      next: (membership) => {
        this.cardMembershipCache.set(normalizedCard, membership);
        this.applyLprCardFallbackResult(
          inputText,
          normalizedCard,
          membership,
          autoCreateSubscriber,
        );
      },
      error: (err) => {
        this.cardMembershipStatus = 'error';
        this.handleBackendError('check-by-card-number from LPR input error', err);
        this.applyLprNonSubscriberResult(inputText, autoCreateSubscriber);
      },
    });
  }

  private applyLprCardFallbackResult(
    inputText: string,
    cardNumber: string,
    membership: CardMembershipCheckResponse,
    autoCreateSubscriber: boolean,
  ): void {
    if (membership.isMember) {
      this.currentLprVehicleNumber =
        membership.vehicleNumber?.trim() || membership.summary?.vehicleNumber?.trim() || inputText;
      this.lprMembershipStatus = 'subscriber';
      this.lprMembershipCardNumber = membership.cardNumber?.trim() || cardNumber;
      this.selectedPricingSchemaId = '';
      this.applyCardMembershipResult(cardNumber, membership, autoCreateSubscriber, false);
      return;
    }

    this.applyLprNonSubscriberResult(inputText, autoCreateSubscriber);
  }

  private applyLprNonSubscriberResult(vehicleNumber: string, autoCreateSubscriber: boolean): void {
    this.lprMembershipStatus = 'non-subscriber';
    this.lprMembershipCardNumber = null;
    this.cardSummary = null;
    this.cardNumber = '';
    this.cardMembershipStatus = 'idle';
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

    this.registrationSvc.getEnterPriceSchemasForSelection().subscribe({
      next: (schemas) => {
        this.pricingSchemas = (schemas ?? []).map((schema: any) => ({
          id: schema.id ?? schema.Id ?? '',
          name: schema.name ?? schema.Name ?? '',
          description: schema.description ?? schema.Description ?? null,
          salary: Number(schema.salary ?? schema.Salary ?? 0),
        }));
        if (
          this.selectedPricingSchemaId &&
          !this.pricingSchemas.some((schema) => schema.id === this.selectedPricingSchemaId)
        ) {
          this.selectedPricingSchemaId = '';
        }
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
      ? this.normalizeMembershipSearchValue(vehicleNumber)
      : this.normalizeMembershipSearchValue(this.currentLprVehicleNumber);

    if (!normalizedVehicleNumber) {
      this.toast.warn(this.t('enter_plate_first'));
      this.showMissingLprVehicleHint = true;
      this.requestLprPlateFocus();
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
    const scannerPhoto = this.getScannerPhotoPayload();
    if (!this.ensureRequiredScannerPhoto(scannerPhoto)) return;

    if (!statePrepared) {
      if (this.adding) return;
      this.prepareNewTicketState();
    }

    const normalizedVehicleNumber = vehicleNumber
      ? this.normalizeVehicleNumber(vehicleNumber)
      : undefined;

    this.lastIssuedVehicleNumber = normalizedVehicleNumber ?? null;
    const ticketsImages = this.getVehicleImagePayloads();

    const payload: AddTicketRequest = {
      isSubscriber: false,
      vehicleNumber: normalizedVehicleNumber,
      pricingSchemaId,
      scannerPhoto,
      ticketsImages,
    };
    console.log('CREATING TICKET PAYLOAD:', payload);

    this.ticketsSvc.addTicket(payload).subscribe({
      next: (res) => this.handleIssuedTicketResponse(res),
      error: (e) => {
        this.handleAddTicketFailure('AddTicket (normal) error', e, normalizedVehicleNumber);
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

  private createSubscriberTicketFromMembership(
    searchValue: string,
    membership: MembershipCheckResponse,
    statePrepared = false,
  ): void {
    const card = this.getMembershipCardNumber(membership);
    const vehicleNumber = this.getMembershipVehicleNumber(membership, searchValue);

    this.cardNumber = card ?? '';
    this.cardSummary = membership.summary ?? this.cardSummary;

    this.createSubscriberTicketWithPayload(
      {
        cardNumber: card ?? undefined,
        vehicleNumber: vehicleNumber ?? undefined,
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
    const scannerPhoto = this.getScannerPhotoPayload();
    if (!this.ensureRequiredScannerPhoto(scannerPhoto)) return;

    if (!statePrepared) {
      if (this.adding) return;
      this.prepareNewTicketState();
    }

    const normalizedVehicleNumber = data.vehicleNumber
      ? this.normalizeVehicleNumber(data.vehicleNumber)
      : undefined;

    this.lastIssuedVehicleNumber = normalizedVehicleNumber ?? null;
    const ticketsImages = this.getVehicleImagePayloads();

    const payload: AddTicketRequest = {
      isSubscriber: true,
      vehicleNumber: normalizedVehicleNumber,
      cardNumber: data.cardNumber,
      scannerPhoto,
      ticketsImages,
    };
    console.log('CREATING SUBSCRIBER TICKET PAYLOAD:', payload);

    this.ticketsSvc.addTicket(payload).subscribe({
      next: (res) => this.handleIssuedTicketResponse(res),
      error: (e) => {
        this.handleAddTicketFailure(
          'AddTicket (subscriber) error',
          e,
          normalizedVehicleNumber,
          data.cardNumber,
        );
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

  private getMembershipVehicleNumber(
    membership: MembershipCheckResponse,
    fallback: string,
  ): string | null {
    const vehicle =
      membership.vehicleNumber ??
      (membership.summary as any)?.vehicleNumber ??
      (membership.summary as any)?.VehicleNumber ??
      null;

    if (vehicle && String(vehicle).trim()) {
      return this.normalizeMembershipSearchValue(String(vehicle));
    }

    const card = this.getMembershipCardNumber(membership);
    if (card && this.normalizeCardNumber(card) === this.normalizeCardNumber(fallback)) {
      return null;
    }

    return this.normalizeMembershipSearchValue(fallback);
  }

  private normalizeVehicleNumber(value: string | undefined | null): string {
    return String(value ?? '').trim();
  }

  private normalizeCardNumber(value: string | undefined | null): string {
    return String(value ?? '')
      .replace(/\s+/g, '')
      .trim()
      .toUpperCase();
  }

  private normalizeMembershipSearchValue(value: string | undefined | null): string {
    return String(value ?? '')
      .replace(/\s+/g, '')
      .trim()
      .toUpperCase();
  }

  private resetLprLookupState(vehicleNumber: string | null): void {
    this.currentLprVehicleNumber = vehicleNumber;
    this.lprMembershipStatus = 'idle';
    this.lprMembershipCardNumber = null;
    this.selectedPricingSchemaId = '';
    this.showMissingLprVehicleHint = false;
  }

  private resetCardLookupState(): void {
    this.cardMembershipStatus = 'idle';
    this.cardSummary = null;
  }

  private getVehicleImagePayloads(): File[] {
    const files = this.uploadedVehicleImages
      .map((file) => file.file)
      .filter((file): file is File => !!file);

    if (
      this.scannedFile?.file &&
      !this.uploadedVehicleImages.some((file) => file.url === this.scannedFile?.url)
    ) {
      files.push(this.scannedFile.file);
    }

    return Array.from(new Set(files));
  }

  private getScannerPhotoPayload(): File | null {
    for (let i = this.uploadedVehicleImages.length - 1; i >= 0; i--) {
      const attachment = this.uploadedVehicleImages[i];
      if (this.isScannerAttachment(attachment)) {
        return attachment.file;
      }
    }

    const currentPreview = this.scannedFile;
    if (!currentPreview || !this.isScannerAttachment(currentPreview)) return null;
    return currentPreview.file;
  }

  private ensureRequiredScannerPhoto(scannerPhoto: File | null): boolean {
    if (this.gateConnectionInfo?.hasScanner !== true) return true;
    if (scannerPhoto) return true;

    this.toast.warn(this.t('scanner_photo_required'));
    this.adding = false;
    this.cdr.markForCheck();
    return false;
  }

  private revokeImageUrl(file: EntryVehicleImage | null | undefined): void {
    if (file?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(file.url);
    }
  }

  private requestLprPlateFocus(): void {
    this.lprFocusRequest += 1;
    this.cdr.markForCheck();
  }

  private resolveActivePreviewAfterAdd(attachment: EntryVehicleImage): EntryVehicleImage {
    if (this.isImageAttachment(attachment)) {
      return attachment;
    }

    if (this.isImageAttachment(this.scannedFile)) {
      return this.scannedFile;
    }

    return this.findPreferredPreviewAttachment() ?? attachment;
  }

  private findPreferredPreviewAttachment(
    candidates: EntryVehicleImage[] = this.uploadedVehicleImages,
  ): EntryVehicleImage | null {
    const pool = [...candidates, ...this.uploadedVehicleImages];

    for (let i = pool.length - 1; i >= 0; i--) {
      const file = pool[i];
      if (this.isSnapshotAttachment(file) && this.isImageAttachment(file)) {
        return file;
      }
    }

    for (let i = pool.length - 1; i >= 0; i--) {
      const file = pool[i];
      if (this.isImageAttachment(file)) {
        return file;
      }
    }

    return null;
  }

  private isImageAttachment(file: EntryVehicleImage | null | undefined): file is EntryVehicleImage {
    return !!file?.type?.startsWith('image/');
  }

  private isSnapshotAttachment(file: EntryVehicleImage | null | undefined): boolean {
    return file?.source === 'snapshot' || !!file?.name?.startsWith('gate-snapshot-');
  }

  private isScannerAttachment(file: EntryVehicleImage | null | undefined): boolean {
    return file?.source === 'scanner';
  }

  private prepareNewTicketState(): void {
    this.adding = true;
    this.showMissingLprVehicleHint = false;
    this.currentIssuedQr = null;
    this.currentIssuedQrType = null;
    this.lastIssuedTicketId = null;
    this.lastIssuedTicketInfo = null;
    this._lastTicketPrice = null;
    this._lastTicketCreatedAt = null;
    this._cashierCollected = false;
    this.openGateLoading = false;
    this.openGateError = null;
    this.lastOpenGateResponse = null;
  }

  private handleIssuedTicketResponse(res: IssuedTicketResponse | null): void {
    if (!this.isAddTicketSuccess(res)) {
      this.handleAddTicketFailure('AddTicket returned unsuccessful response', res);
      return;
    }
    const issued = res as IssuedTicketResponse;

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
    this.showMissingLprVehicleHint = false;
    this.lprMembershipStatus = 'idle';
    this.lprMembershipCardNumber = null;
    this.currentLprVehicleNumber = null;
    this.manualLprPlate = '';
    this.lastCheckedLprVehicleNumber = '';
    this.cardMembershipStatus = 'idle';
    this.cardNumber = '';
    this.cardSummary = null;
    this.lastCheckedCardNumber = '';

    this.lastIssuedTicketId = issued.ticketId;
    this.lastIssuedTicketInfo = issued.ticketInfo ?? null;
    this.lastIssuedPrice = issued.price ?? null;
    this.lastIssuedCreatedAt = issued.createdAt ?? null;
    this.lastIssuedValidExitDate = issued.validExitDate ?? null;
    this.lastIssuedEntryConfirmationStatus = issued.entryConfirmationStatus ?? 'Pending';
    this._cashierCollected = !!issued.isCashierCollected;

    const fromResponse: string | undefined = (issued as any)?.vehicleNumber;
    if (fromResponse && fromResponse.trim().length > 0) {
      this.lastIssuedVehicleNumber = fromResponse.trim();
    }

    const normalizedQr = this.ticketPrint.normalizeQrImage(issued.qrCode);

    if (!normalizedQr) {
      console.warn('Invalid qrCode returned from AddTicket', issued.qrCode);

      const fallbackTicketText = issued.ticketInfo ?? issued.ticketId ?? null;
      this.currentIssuedQr = fallbackTicketText;
      this.currentIssuedQrType = fallbackTicketText ? 'text' : null;

      // هنا الرسالة محلية لأنها حالة خاصة (API رجع قيمة غير قابلة للاستخدام)
    }

    if (normalizedQr) {
      this.currentIssuedQr = normalizedQr;
      this.currentIssuedQrType = 'image';
    }

    this.finalizeIssuedTicketAfterCreate(!!issued.success);
  }

  private finalizeIssuedTicketAfterCreate(addTicketSucceeded = false): void {
    if (this.lastIssuedTicketId && this._cashierCollected) {
      this.markTicketAsCashierCollected(this.lastIssuedTicketId);
    }

    this.toast.success(this.t('create_ticket'));
    this.printTicketDocuments();
    this.openGateAfterTicketCreate();

    if (!this.currentIssuedQr && !addTicketSucceeded) {
      this.toast.error(this.t('qr_invalid_warning'));
    }

    this.loadEntryTicketsForCurrentMode();
    this.adding = false;
  }

  private isAddTicketSuccess(res: any): boolean {
    if (!res || typeof res !== 'object') return false;
    const ticketId = String(res.ticketId ?? res.TicketId ?? '').trim();
    return ticketId.length > 0;
  }

  private handleAddTicketFailure(
    context: string,
    err: any,
    vehicleNumber?: string | null,
    cardNumber?: string | null,
  ): void {
    console.error(context, err);

    const message = this.errorExtractor.extractErrorMessage(err, this.t('create_ticket_failed'));

    this.currentIssuedQr = null;
    this.currentIssuedQrType = null;
    this.lastIssuedTicketId = null;
    this.lastIssuedTicketInfo = null;
    this.lastIssuedPrice = null;
    this.lastIssuedCreatedAt = null;
    this._cashierCollected = false;
    this.collectingCashierCash = false;
    this.openGateLoading = false;
    this.lastOpenGateResponse = null;
    this.openGateError = message;
    this.adding = false;

    if (vehicleNumber) {
      this.autoCreatedLprVehicleNumbers.delete(vehicleNumber);
    }
    if (cardNumber) {
      this.autoCreatedCardNumbers.delete(this.normalizeCardNumber(cardNumber));
    }

    if (this.lprMembershipStatus === 'subscriber') {
      this.lprMembershipStatus = 'error';
    }

    if (this.cardMembershipStatus === 'member' || this.cardMembershipStatus === 'checking') {
      this.cardMembershipStatus = 'error';
    }

    if (this.isMissingVehicleNumberError(message)) {
      this.showMissingLprVehicleHint = true;
      this.requestLprPlateFocus();
    }

    this.toast.error(message);
  }

  private isMissingVehicleNumberError(message: string): boolean {
    const normalized = String(message ?? '').toLowerCase();
    return (
      normalized.includes('vehicle number') ||
      normalized.includes('vehicle is required') ||
      normalized.includes('plate') ||
      normalized.includes('رقم المركبة') ||
      normalized.includes('رقم السيارة')
    );
  }

  retryOpenGate(): void {
    const current = this.lastOpenGateResponse;

    // If an operation is still in-flight, refresh its authoritative state instead of duplicating
    if (current?.operationId && isInFlightGateOperationStatus(current.status)) {
      this.openGateLoading = true;
      this.gateOperationStore.refreshOperation(current.operationId).subscribe({
        next: (refreshed) => {
          if (refreshed) {
            this.applyEntryGateOperation(refreshed);
          }
        },
        complete: () => {
          this.openGateLoading = false;
        },
      });
      return;
    }

    // Terminal failure / TimedOut (or no operation) issues a brand-new Gate/open request with a fresh requestId
    this.openGateAfterTicketCreate();
  }

  private openGateAfterTicketCreate(): void {
    const controllerId = this.gatePeripheralFacade.controlId(this.gateConnectionInfo);
    const ticketId = this.lastIssuedTicketId ? String(this.lastIssuedTicketId).trim() : '';

    if (!controllerId || !ticketId) {
      this.openGateError = this.t('open_gate_failed');
      this.toast.warn(this.t('open_gate_failed'));
      return;
    }

    this.openGateLoading = true;
    this.openGateError = null;
    this.lastOpenGateResponse = null;

    this.gateOperationSvc
      .openGate({
        controllerId,
        ticketId,
        operationType: 'Entry',
        requestId: generateGateRequestId(),
      })
      .subscribe({
        next: (httpRes) => {
          if (httpRes.body) {
            const op = this.gateOperationStore.upsertOperation(httpRes.body, true);
            this.applyEntryGateOperation(op, httpRes.status);
          }
        },
        error: (err) => {
          console.error('OpenGate error', err);
          // Retain original TicketId, payment, and QR — never re-issue ticket
          this.openGateError = this.errorExtractor.extractErrorMessage(
            err,
            this.t('open_gate_failed'),
          );
          this.toast.error(this.openGateError);
        },
        complete: () => {
          this.openGateLoading = false;
        },
      });
  }

  private handleEntryGateOperationUpdate(op: GateOperationResponse): void {
    if (op.operationType !== 'Entry') return;

    const matchesCurrentOp =
      this.lastOpenGateResponse?.operationId &&
      this.lastOpenGateResponse.operationId === op.operationId;
    const matchesCurrentTicket =
      this.lastIssuedTicketId &&
      op.ticketId &&
      String(this.lastIssuedTicketId).toLowerCase() === String(op.ticketId).toLowerCase();

    if (!matchesCurrentOp && !matchesCurrentTicket) return;

    this.applyEntryGateOperation(op);
    this.cdr.markForCheck();
  }

  private applyEntryGateOperation(op: GateOperationResponse, httpStatus?: number): void {
    this.lastOpenGateResponse = op;

    if (op.status === 'Completed') {
      this.openGateError = null;
      this.lastIssuedEntryConfirmationStatus = 'Confirmed';
      if (!this.confirmedEntryOperationIds.has(op.operationId)) {
        this.confirmedEntryOperationIds.add(op.operationId);
        this.toast.success(
          this.i18n.current === 'ar' ? 'تم تأكيد الدخول بنجاح' : 'Entry confirmed',
        );
        this.loadEntryTicketsForCurrentMode();
      }
      return;
    }

    if (httpStatus === 202 || isInFlightGateOperationStatus(op.status)) {
      this.openGateError = null;
      this.lastIssuedEntryConfirmationStatus = 'Pending';
      this.gateOperationStore.startPolling(op.operationId);
      return;
    }

    if (isFailedGateOperationStatus(op.status)) {
      this.gateOperationStore.stopPolling(op.operationId);
      this.openGateLoading = false;
      this.openGateError =
        op.status === 'TimedOut'
          ? this.i18n.current === 'ar'
            ? 'انتهت مهلة انتظار البوابة — يمكنك المحاولة مرة أخرى'
            : 'Gate command timed out — you can try again'
          : this.i18n.current === 'ar'
            ? 'فشل تنفيذ أمر فتح البوابة'
            : 'Gate execution failed';
      this.toast.error(this.openGateError);
      return;
    }

    if (isUncertainGateOutcome(op.status)) {
      this.openGateError =
        this.i18n.current === 'ar'
          ? 'حالة تنفيذ أمر البوابة غير معروفة'
          : 'Gate execution outcome unknown';
      this.toast.warn(this.openGateError);
    }
  }

  // =======================
  // Printing
  // =======================
  printTicketDocuments(): void {
    if (!this.printQrEnabled && !this.printReceiptEnabled) {
      this.toast.warn(this.t('select_print_option'));
      return;
    }

    const jobs = this.ticketPrint.buildEntryIssuedTicketJobs({
      printQrEnabled: this.printQrEnabled,
      printReceiptEnabled: this.printReceiptEnabled,
      currentIssuedQr: this.currentIssuedQr,
      currentIssuedQrType: this.currentIssuedQrType,
      lastIssuedTicketId: this.lastIssuedTicketId,
      lastIssuedTicketInfo: this.lastIssuedTicketInfo,
      lastIssuedVehicleNumber: this.lastIssuedVehicleNumber,
      lastIssuedPrice: this.lastIssuedPrice,
      lastIssuedCreatedAt: this.lastIssuedCreatedAt,
      gateNumber: this.gatePeripheral?.gateNumber ?? '---',
      isExitGate: this.gatePeripheral?.gateType === GateType.Exit,
      qrPrinterName: this.gateConnectionInfo?.qrPrinterName,
      receiptPrinterName: this.gateConnectionInfo?.receiptPrinterName,
    });

    if (!jobs.length) {
      this.toast.warn(this.t('select_print_option'));
      return;
    }

    this.ticketPrint.printHtmlJobs(jobs).subscribe({
      next: () => {
        this.toast.success(this.t('printing_sent'));
      },
      error: (err) => {
        console.error('[printEntryIssuedTicket] Print jobs failed', err);
        this.toast.error(this.t('printing_failed'));
      },
    });
  }

  private printCollectSummaryReceipt(summary: CollectDailyTicketsResponse): void {
    const job = this.ticketPrint.buildEntryCollectSummaryJob({
      summary,
      receiptPrinterName: this.gateConnectionInfo?.receiptPrinterName,
      printReceiptEnabled: this.printReceiptEnabled,
      gateNumber: this.getCollectionGateNumber(),
      gateTypeLabel: this.getCollectionGateTypeLabel(),
    });

    if (!job) {
      this.toast.warn(this.t('collect_receipt_printer_missing'));
      return;
    }

    this.ticketPrint.printHtmlJobs([job]).subscribe({
      next: () => this.toast.success(this.t('printing_sent')),
      error: (err) => {
        console.error('[printCollectSummaryReceipt] Print failed', err);
        this.toast.error(this.t('printing_failed'));
      },
    });
  }

  getCollectionGateNumber(): string | number {
    return this.gatePeripheral?.gateNumber ?? this.auth.getGateData()?.gateNumber ?? '---';
  }

  getCollectionGateTypeLabel(): string {
    const gateType = this.gatePeripheral?.gateType ?? this.auth.getGateData()?.gateType ?? null;
    const numericGateType = Number(gateType);

    if (numericGateType === GateType.Exit) return this.t('gate_type_exit');
    if (numericGateType === GateType.Entrance) return this.t('gate_type_entry');

    return '---';
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

    this.ticketsSvc.collectEnterTickets().subscribe({
      next: (res) => {
        this.collectSummary = res;
        this.toast.success(this.t('admit_done'));
        this.printCollectSummaryReceipt(res);
        this.loadEntryTicketsForCurrentMode();
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
    const gateId = this.auth.getGateId();
    const gateData = this.auth.getGateData();
    const gateType = GateType.Entrance;
    const gateNumber = gateData?.gateNumber ?? null;

    if (!user || !pwd) {
      this.supervisorCollectError = this.t('enter_supervisor_creds');
      return;
    }

    if (!gateId) {
      this.supervisorCollectError = this.t('choose_gate');
      return;
    }

    if (!gateNumber || Number(gateNumber) <= 0) {
      this.supervisorCollectError = this.t('choose_gate');
      return;
    }

    this.supervisorCollectError = null;
    this.supervisorCollectLoading = true;
    this.collectSummary = null;
    this.supervisorCollectToken = null;

    this.ticketsSvc
      .startEntryCollectAsSupervisor({
        userName: user,
        password: pwd,
        gateId,
        gateType,
        gateNumber,
      })
      .subscribe({
        next: (session) => {
          this.supervisorCollectToken = session.token;
          this.collectSummary = session.summary;
          if (!session.summary.totalTicketsCollected) {
            this.toast.warn(this.t('no_uncollected_tickets'));
          }
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

  confirmSupervisorCollection(): void {
    if (!this.supervisorCollectToken || this.supervisorCollectLoading) return;

    this.supervisorCollectError = null;
    this.supervisorCollectLoading = true;

    this.ticketsSvc.collectEnterTicketsWithSupervisorToken(this.supervisorCollectToken).subscribe({
      next: (res) => {
        this.collectSummary = res;
        this.toast.success(this.t('admit_done'));
        this.printCollectSummaryReceipt(res);
        this.loadEntryTicketsForCurrentMode();
      },
      error: (err) => {
        this.handleBackendError('collectEnterTicketsWithSupervisorToken error', err);
        this.supervisorCollectError = this.errorExtractor.extractErrorMessage(
          err,
          this.t('supervisor_login_failed'),
        );
        this.supervisorCollectLoading = false;
      },
      complete: () => {
        this.supervisorCollectLoading = false;
      },
    });
  }

  onCollectClick(): void {
    if (this.loading || this.collectLoading || this.supervisorCollectLoading) return;

    if (this.isSupervisor) {
      this.loadUncollectedEnterTicketsForCollect(() => this.collectDailyForGate());
      return;
    }

    this.openSupervisorCollectModal();
  }

  openSupervisorCollectModal(): void {
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.supervisorCollectError = null;
    this.collectSummary = null;
    this.supervisorCollectToken = null;
    this.showSupervisorCollectModal = true;
  }

  closeSupervisorCollectModal(): void {
    if (this.supervisorCollectLoading) return;

    this.showSupervisorCollectModal = false;
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.supervisorCollectError = null;
    this.collectSummary = null;
    this.supervisorCollectToken = null;
  }

  finishSupervisorCollect(): void {
    if (this.supervisorCollectLoading) return;
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
        this.loadEntryTicketsForCurrentMode();
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

    if (this.cardMembershipCheckTimer) {
      clearTimeout(this.cardMembershipCheckTimer);
    }

    this.cardSummary = null;
    this.cardNumber = '';
    this.scanBuffer = '';
    this.cardMembershipStatus = 'idle';
    this.lastCheckedCardNumber = '';
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

      this.onManualLprPlateChange(normalized);
      this.onManualLprPlateBlur();
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

  private loadEntryTicketsForCurrentMode(ticketNumber: string = ''): void {
    if (this.isSupervisor) {
      this.loadUncollectedEnterTickets();
      return;
    }

    this.loadTicketsForEntry(ticketNumber);
  }

  private loadUncollectedEnterTicketsForCollect(afterLoad: () => void): void {
    this.loadUncollectedEnterTickets((count) => {
      if (count <= 0) {
        this.toast.warn(this.t('no_uncollected_tickets'));
        return;
      }

      afterLoad();
    });
  }

  private loadUncollectedEnterTickets(afterLoad?: (count: number) => void): void {
    this.loading = true;

    this.ticketsSvc.getUncollectedEnterTickets().subscribe({
      next: (res) => {
        this.totalPriceToday = res.totalPrice ?? 0;

        this.tickets = (res.items ?? []).sort(
          (a: TicketDto, b: TicketDto) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        );

        this.applyFilters();
        afterLoad?.(res.totalTicketsCount ?? this.tickets.length);
      },
      error: (err) => {
        this.handleBackendError('loadUncollectedEnterTickets error', err);
        this.tickets = [];
        this.totalPriceToday = 0;
        this.applyFilters();
      },
      complete: () => {
        this.loading = false;
      },
    });
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
