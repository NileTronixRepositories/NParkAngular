import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

import { NfcReaderService } from '../../Services/registration/nfc-reader.service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { GateDevicesBlockComponent } from './gate-devices-block-component/gate-devices-block-component';
import { IssueTicketBlockComponent } from './issue-ticket-block-component/issue-ticket-block-component';
import { TicketsTableBlockComponent } from './tickets-table-block-component/tickets-table-block-component';

@Component({
  selector: 'app-ticket-component',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GateDevicesBlockComponent,
    IssueTicketBlockComponent,
    TicketsTableBlockComponent,
  ],
  templateUrl: './ticket-component.html',
  styleUrls: ['./ticket-component.css'],
})
export class TicketComponent {
  // ===== Services =====
  svc = inject(TicketsServices);
  i18n = inject(LanguageService);
  private gateSvc = inject(GateServices);
  private auth = inject(AuthService);
  private nfc = inject(NfcReaderService);
  private toast = inject(ToastServices);

  // ===== Gate selection =====
  showGateSelectionModal = false;
  gatesList: GateDto[] = [];
  selectedGateId: number | null = null;
  gateLoading = false;
  gateSaving = false;

  gatePeripheral: GateDevicePeripheral | null = null;
  cashierToken: string | null = null;

  // ===== Manual inputs =====
  manualLprPlate: string = '';
  cardNumber: string = '';
  readingCard = signal(false);

  // ===== Card summary (subscriber) =====
  cardSummary: ParkingCardSummaryDto | null = null;
  loadingCardSummary = false;

  // ===== Ticket summary / cashier =====
  lastIssuedTicketId: string | number | null = null;
  lastIssuedTicketInfo: string | null = null;
  lastTicketPrice: number | null = null;
  lastTicketCreatedAt: string | null = null;
  cashierCollected = false;
  collectingCashierCash = false;
  collectingTicketId: string | null = null;
  lastIssuedVehicleNumber: string | null = null;

  // ===== Daily collect summary (Supervisor) =====
  collectSummary: CollectDailyTicketsResponse | null = null;
  collectLoading = false;

  // ==== Supervisor collect =====
  showSupervisorCollectModal = false;
  supervisorUsername: string = '';
  supervisorPassword: string = '';
  supervisorCollectLoading = false;
  supervisorCollectError: string | null = null;

  // ===== Tickets list / filters =====
  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;

  q = '';
  action: '' | TicketAction = '';
  gate: string = '';

  // ===== Issue ticket QR state =====
  adding = false;
  currentIssuedQr: string | null = null;
  currentIssuedQrType: 'image' | 'text' | null = null;

  // ===== Scan / admit =====
  scanBuffer = '';
  scanning = false;
  scannedTicket: TicketDetailsDto | null = null;
  collecting = false;

  totalPriceToday: number = 0;

  get lastIssuedPrice(): number | null {
    return this.lastTicketPrice;
  }
  set lastIssuedPrice(v: number | null) {
    this.lastTicketPrice = v;
  }

  get lastIssuedCreatedAt(): string | null {
    return this.lastTicketCreatedAt;
  }
  set lastIssuedCreatedAt(v: string | null) {
    this.lastTicketCreatedAt = v;
  }

  get lastIssuedCollected(): boolean {
    return this.cashierCollected;
  }
  set lastIssuedCollected(v: boolean) {
    this.cashierCollected = v;
  }

  get cashierConfirming(): boolean {
    return this.collectingCashierCash;
  }
  set cashierConfirming(v: boolean) {
    this.collectingCashierCash = v;
  }

  confirmCashier() {
    return this.confirmCashierCollection();
  }

  get isSupervisor(): boolean {
    return this.auth.isSupervisor;
  }

  @ViewChild('scanBox') scanBox?: ElementRef<HTMLInputElement>;

  // ===== i18n =====
  private dict: Record<AppLang, Record<string, string>> = {
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
      fetching_details: 'جاري جلب تفاصيل التذكرة...',
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

      // NFC / card
      cardData: 'بيانات الكارت',
      cardNumber: 'رقم الكارت',
      readCard: 'قراءة الكارت',
      reading: 'جاري القراءة…',
      readCardTitle: 'قراءة UID من القارئ',

      // Cashier summary
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

      // Collect summary
      collect_summary: 'ملخص تحصيل اليوم',
      total_collected_amount: 'إجمالي المبلغ المحصَّل',
      total_collected_tickets: 'عدد التذاكر المحصَّلة',
      collected_at: 'وقت التحصيل',
      last_collection_time: 'وقت آخر تحصيل',
      collect: 'تحصيل',
      collected: 'تم التحصيل',
      actions: 'الإجراءات',
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
      fetching_details: 'Fetching ticket details...',
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

      // NFC / card
      cardData: 'Card data',
      cardNumber: 'Card number',
      readCard: 'Read card',
      reading: 'Reading…',
      readCardTitle: 'Read UID from reader',

      // Cashier summary
      cashier_status: 'Cashier status',
      cashier_collected: 'Cash collected from visitor',
      cashier_not_collected: 'Not collected yet',
      cashier_confirm_button: 'Confirm cashier collection',

      created_at: 'Created at',
      fees: 'Fees',
      cashier_collected_yes: 'Cash collected from visitor',
      cashier_collected_no: 'Not collected yet',
      cashier_collected_short: 'OK',

      // Card summary
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

      // Collect summary
      collect_summary: 'Daily collection summary',
      total_collected_amount: 'Total collected amount',
      total_collected_tickets: 'Total collected tickets',
      collected_at: 'Collected at',
      last_collection_time: 'Last collection time',
      collect: 'Collect',
      collected: 'Collected',
      actions: 'Actions',
    },
  };

  t = (k: string) => this.dict[this.i18n.current]?.[k] ?? k;
  dir = () => this.i18n.dir();
  isRTL = () => this.i18n.isRTL();

  // ================== Lifecycle ==================
  ngOnInit(): void {
    this.loadGates();
    this.loadEntryGates();
    this.loadTicketsForEntry();
    this.cashierToken = this.auth.token;
    this.gatePeripheral = this.auth.getGateData();

    if (!this.gatePeripheral && this.auth.isLoggedIn()) {
      this.auth.checkGate().subscribe({
        next: (res) => {
          if (res?.gateDevicePeripheral) {
            this.gatePeripheral = res.gateDevicePeripheral;
          } else {
            this.gatePeripheral = this.auth.getGateData();
          }
        },
        error: (err) => {
          console.error('CheckGate error', err);
          this.toast.fromProblem(err);
          this.gatePeripheral = this.auth.getGateData();
        },
      });
    }
  }

  // ================== Gate loading ==================
  private loadGates() {
    this.gateLoading = true;
    this.gateSvc.getAll().subscribe({
      next: (all) => {
        this.gatesList = (all ?? []).filter(
          (g) => g.gateType === GateType.Entrance || g.gateType === GateType.Exit
        );
        this.gateLoading = false;

        if (this.gatesList.length > 0) {
          this.showGateSelectionModal = true;
        } else {
          this.toast.warn(this.t('no_gates_available'));
        }
      },
      error: (err) => {
        console.error('Gate/GetAll error', err);
        this.gateLoading = false;
        this.toast.fromProblem(err);
      },
    });
  }

  private loadEntryGates() {
    this.gateLoading = true;
    this.gateSvc.getAll().subscribe({
      next: (all) => {
        this.gatesList = (all ?? []).filter((g) => g.gateType === GateType.Entrance);
        this.gateLoading = false;
      },
      error: (err) => {
        console.error('Gate/GetAll error', err);
        this.gateLoading = false;
        this.toast.fromProblem(err);
      },
    });
  }

  selectGate() {
    if (!this.selectedGateId) {
      this.toast.warn(this.t('choose_gate'));
      return;
    }

    this.gateSaving = true;

    this.auth.selectGate(this.selectedGateId, GateType.Entrance).subscribe({
      next: (res) => {
        this.gateSaving = false;
        this.showGateSelectionModal = false;

        if (res?.gateDevicePeripheral) {
          this.gatePeripheral = res.gateDevicePeripheral;
        } else {
          this.gatePeripheral = this.auth.getGateData();
        }

        this.toast.success(this.t('select_gate'));
        this.loadTicketsForEntry();
      },
      error: (err) => {
        console.error('selectGate error', err);
        this.gateSaving = false;
        this.toast.fromProblem(err);
      },
    });
  }

  confirmGateSelection() {
    this.selectGate();
  }

  // ================== Create ticket (Normal / Subscriber) ==================
  createTicket(vehicleNumber?: string) {
    if (this.adding) return;

    const trimmed = vehicleNumber?.trim();
    if (vehicleNumber !== undefined && !trimmed) {
      this.toast.warn('يرجى إدخال رقم السيارة أولاً');
      return;
    }

    this.prepareNewTicketState();
    this.lastIssuedVehicleNumber = trimmed ?? null;

    this.svc
      .addTicket({
        isSubscriber: false,
        vehicleNumber: trimmed,
      })
      .subscribe({
        next: (res: IssuedTicketResponse | null) => this.handleIssuedTicketResponse(res),
        complete: () => (this.adding = false),
        error: (e) => {
          console.error('AddTicket (normal) error', e);
          this.adding = false;
          this.toast.fromProblem(e);
        },
      });
  }

  createSubscriberTicket() {
    if (this.adding) return;

    const card = this.cardNumber?.trim();
    if (!card) {
      this.toast.warn('لا يوجد رقم كارت لعميل مشترك');
      return;
    }

    this.prepareNewTicketState();
    this.lastIssuedVehicleNumber = this.cardSummary?.vehicleNumber?.trim() ?? null;

    this.svc
      .addTicket({
        isSubscriber: true,
        cardNumber: card,
      })
      .subscribe({
        next: (res: IssuedTicketResponse | null) => this.handleIssuedTicketResponse(res),
        complete: () => (this.adding = false),
        error: (e) => {
          console.error('AddTicket (subscriber) error', e);
          this.adding = false;
          this.toast.fromProblem(e);
        },
      });
  }

  private prepareNewTicketState() {
    this.adding = true;
    this.currentIssuedQr = null;
    this.currentIssuedQrType = null;
    this.lastIssuedTicketId = null;
    this.lastIssuedTicketInfo = null;
    this.lastTicketPrice = null;
    this.lastTicketCreatedAt = null;
    this.cashierCollected = false;
  }

private handleIssuedTicketResponse(res: IssuedTicketResponse | null) {
  if (!res) return;

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

  const normalized = this.normalizeQrImage(res.qrCode);

  if (!normalized) {
    console.warn('Invalid qrCode returned from AddTicket', res.qrCode);

    this.currentIssuedQr = null;
    this.currentIssuedQrType = null;

    this.toast.error(
      'تم إصدار التذكرة بنجاح، لكن QR code غير صالح. برجاء مراجعة إعدادات الطابعة أو خدمة الـ QR.'
    );

    this.loadTicketsForEntry();
    return;
  }

  this.currentIssuedQr = normalized;
  this.currentIssuedQrType = 'image';

  this.toast.success(this.t('create_ticket'));
  this.printTicket();
  this.loadTicketsForEntry();
}


printTicket() {
  if (!this.currentIssuedQr) return;

  const imgSrc =
    this.currentIssuedQrType === 'image'
      ? this.currentIssuedQr
      : this.qrDataUrl(this.currentIssuedQr);

  const w = window.open('', '_blank', 'width=420,height=700');
  if (!w) return;

  const createdAt = this.lastIssuedCreatedAt
    ? new Date(this.lastIssuedCreatedAt).toLocaleString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const currentUser = this.auth.userName || '—';

  const ticketIdBlock = this.lastIssuedTicketId
    ? `
      <div class="ticket-id">
        رقم التذكرة: ${this.lastIssuedTicketId}
      </div>
    `
    : '';

  const priceRow =
    this.lastIssuedPrice !== null && this.lastIssuedPrice !== undefined
      ? `
        <div class="info-row">
          <span class="label">الرسوم:</span>
          <span class="value price">${this.lastIssuedPrice} ج.م</span>
        </div>
      `
      : '';

  const vehicleRow = this.lastIssuedVehicleNumber
    ? `
      <div class="info-row">
        <span class="label">رقم السيارة:</span>
        <span class="value">${this.lastIssuedVehicleNumber}</span>
      </div>
    `
    : '';

  const extraInfo = this.lastIssuedTicketInfo
    ? `
      <div class="extra-info">
        ${this.lastIssuedTicketInfo}
      </div>
    `
    : '';

  const html = `
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

          /* مقاس الورقة تقريبًا 80mm * 50mm (بيزنس كارد أفقي) */
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

          .footer-link {
            margin-top: 2mm;               
            font-size: 9.5px;
            color: #000;
            font-weight: bold;
            text-align: center;
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
          <!-- الجانب الأيسر: العنوان + رقم التذكرة + المعلومات -->
          <div class="info-side">
            <div class="info-top">
              <div class="header-title">NPark</div>
              ${ticketIdBlock}
              <div class="info-section">
                ${priceRow}
                <div class="info-row">
                  <span class="label">التاريخ والوقت:</span>
                  <span class="value">${createdAt}</span>
                </div>
                ${vehicleRow}
                <div class="info-row">
                  <span class="label">الموظف:</span>
                  <span class="value">${currentUser}</span>
                </div>
              </div>
              ${extraInfo}
            </div>
            <div class="footer-link">www.niletronix.com</div>
          </div>

          <div class="qr-side">
            <div class="qr-container">
              <img src="${imgSrc}" alt="QR Code" />
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  w.document.open();
  w.document.write(html);
  w.document.close();
}



  qrDataUrl(text: string) {
    return `data:text/plain,${encodeURIComponent(text)}`;
  }

  // =========== Supervisor daily collect ===========

  collectDailyForGate() {
    if (this.collectLoading) return;

    this.collectLoading = true;
    this.collectSummary = null;

    this.svc.collectDailyTickets().subscribe({
      next: (res: CollectDailyTicketsResponse) => {
        this.collectSummary = res;
        this.toast.success(this.t('admit_done'));
        this.loadTicketsForEntry();
      },
      complete: () => {
        this.collectLoading = false;
      },
      error: (err) => {
        console.error('collectDailyForGate error', err);
        this.collectLoading = false;
        this.collectSummary = null;
        this.toast.fromProblem(err);
      },
    });
  }

  submitSupervisorCollect() {
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
          this.loadTicketsForEntry();
        },
        error: (err) => {
          console.error('submitSupervisorCollect error', err);
          this.supervisorCollectError = 'فشل الدخول كـ Supervisor. تأكد من البيانات أو الصلاحيات.';
          this.toast.fromProblem(err);
          this.supervisorCollectLoading = false;
        },
        complete: () => {
          this.supervisorCollectLoading = false;
        },
      });
  }

  onCollectClick() {
    if (this.isSupervisor) {
      this.collectDailyForGate();
      return;
    }
    this.openSupervisorCollectModal();
  }

  openSupervisorCollectModal() {
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.supervisorCollectError = null;
    this.collectSummary = null;
    this.showSupervisorCollectModal = true;
  }

  closeSupervisorCollectModal() {
    if (this.supervisorCollectLoading) return;
    this.showSupervisorCollectModal = false;
    this.supervisorUsername = '';
    this.supervisorPassword = '';
    this.supervisorCollectError = null;
    this.collectSummary = null;
  }

  finishSupervisorCollect() {
    this.auth.updateToken(this.cashierToken ?? '');
    this.closeSupervisorCollectModal();
  }

  // ===== Scan / admit =====

  selectAll(el: HTMLInputElement) {
    setTimeout(() => el.select(), 0);
  }

  onScanEnter() {
    const code = this.scanBuffer?.trim();
    if (!code) return;
    this.fetchTicketByQr(code);
  }

  fetchTicketByQr(code: string) {
    this.scanning = true;
    this.scannedTicket = null;

    this.svc.getTicketByQr(code).subscribe({
      next: (t) => (this.scannedTicket = t),
      complete: () => (this.scanning = false),
      error: (err) => {
        console.error('getTicketByQr error', err);
        this.scanning = false;
        this.toast.fromProblem(err);
      },
    });
  }

  collect(t: TicketDetailsDto) {
    this.collecting = true;
    this.svc.collect(t.id).subscribe({
      next: () => {
        this.toast.success(this.t('admit_done'));
        this.loadTicketsForEntry();
      },
      complete: () => (this.collecting = false),
      error: (err) => {
        console.error('collect error', err);
        this.collecting = false;
        this.toast.fromProblem(err);
      },
    });
  }

  // ================== Collect from table ==================
  collectTicketFromTable(ticketId: string) {
    if (this.collectingTicketId) return;

    this.collectingTicketId = ticketId;

    this.svc.collectCashier(ticketId).subscribe({
      next: (ok) => {
        if (ok) {
          this.markTicketAsCashierCollected(ticketId);
          this.loadTicketsForEntry();
        }
      },
      error: (err) => {
        this.toast.fromProblem(err);
        this.collectingTicketId = null;
      },
      complete: () => {
        this.collectingTicketId = null;
      },
    });
  }

  // ================== Card summary ==================
  loadCardSummary(cardNumber?: string) {
    const cn = (cardNumber ?? this.cardNumber)?.trim().toUpperCase();
    if (!cn) {
      this.toast.warn('يرجى إدخال رقم الكارت أولاً');
      return;
    }

    this.loadingCardSummary = true;
    this.svc.getCardSummary(cn).subscribe({
      next: (summary) => {
        if (!summary) {
          this.cardSummary = null;
          this.toast.warn(this.t('no_card_summary'));
        } else {
          this.cardSummary = summary;
        }
      },
      error: (err) => {
        console.error('getCardSummary error', err);
        this.cardSummary = null;
        this.toast.fromProblem(err);
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

  // ================== NFC read card ==================
  async readCard() {
    if (this.readingCard()) return;
    this.readingCard.set(true);

    try {
      const uid = await this.nfc.readUID();
      const normalized = String(uid).trim().toUpperCase();

      this.cardNumber = normalized;
      this.scanBuffer = normalized;

      this.lastIssuedTicketId = null;
      this.lastIssuedTicketInfo = null;
      this.lastIssuedPrice = null;
      this.lastIssuedCreatedAt = null;
      this.cashierCollected = false;
      this.collectingCashierCash = false;

      this.cardSummary = null;

      this.loadCardSummary(normalized);
    } catch (err: any) {
      console.error(err);
      this.toast.error(err?.message || 'تعذر قراءة الكارت. تأكد من تشغيل قارئ الـ NFC.');
    } finally {
      this.readingCard.set(false);
    }
  }

  // ================== Cashier collect confirmation ==================
  confirmCashierCollection() {
    if (!this.lastIssuedTicketId || this.cashierCollected || this.collectingCashierCash) {
      return;
    }

    this.collectingCashierCash = true;

    this.svc.collectCashier(String(this.lastIssuedTicketId)).subscribe({
      next: (ok) => {
        if (ok) {
          this.cashierCollected = true;
          this.markTicketAsCashierCollected(this.lastIssuedTicketId!);
          this.toast.success(this.t('cashier_collected'));
          this.loadTicketsForEntry();
        } else {
          this.toast.error('CollectCashier failed (Ticket not found or validation error).');
        }
      },
      error: (err) => {
        console.error('CollectCashier error', err);
        this.collectingCashierCash = false;
        this.toast.fromProblem(err);
      },
      complete: () => {
        this.collectingCashierCash = false;
      },
    });
  }

  private markTicketAsCashierCollected(ticketId: string | number) {
    const idStr = String(ticketId);

    this.tickets = this.tickets.map((t) =>
      String(t.id) === idStr ? { ...t, isCollectedByCashier: true } : t
    );

    this.applyFilters();
  }

  // ================== List / Filters ==================
  gates(): string[] {
    return Array.from(new Set(this.tickets.map((t) => t.gate))).sort();
  }

  applyFilters() {
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

  private normalizeQrImage(value?: string | null): string | null {
    if (!value) return null;
    const v = String(value).trim();

    if (/^(data:image\/|blob:|https?:\/\/)/i.test(v)) return v;

    const clean = v.replace(/\s+/g, '');

    if (/^[0-9A-Fa-f]+$/.test(clean)) {
      try {
        const base64 = this.hexToBase64(clean);
        return `data:image/png;base64,${base64}`;
      } catch (err) {
        console.error('Failed to convert HEX to base64:', err);
        return null;
      }
    }

     if (/^[A-Za-z0-9+/=]+$/.test(clean)) {
      return `data:image/png;base64,${clean}`;
    }

    return null;
  }
 
  private hexToBase64(hexString: string): string {
     const bytes: number[] = [];
    for (let i = 0; i < hexString.length; i += 2) {
      bytes.push(parseInt(hexString.substr(i, 2), 16));
    }

     const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  private loadTicketsForEntry(ticketNumber: string = '') {
    this.loading = true;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    this.svc.getTicketsForEntry(startOfDay.toISOString(), ticketNumber).subscribe({
      next: (res) => {
        this.totalPriceToday = res.totalPrice ?? 0;

        this.tickets = (res.items ?? []).sort(
          (a: TicketDto, b: TicketDto) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );

        if (this.lastIssuedTicketId && this.cashierCollected) {
          this.markTicketAsCashierCollected(this.lastIssuedTicketId);
        } else {
          this.applyFilters();
        }

        this.loading = false;
      },
      error: (err) => {
        console.error('loadTicketsForEntry error', err);
        this.tickets = [];
        this.applyFilters();
        this.loading = false;
        this.toast.fromProblem(err);
      },
    });
  }
}
