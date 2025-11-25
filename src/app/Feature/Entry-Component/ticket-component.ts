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
import { GateServices, GateDto } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateDevicePeripheral, GateType } from '../../Domain/Auth/auth.models';

import { NfcReaderService } from '../../Services/registration/nfc-reader.service';
import { ToastServices } from '../../Services/Toster/toast-services';

@Component({
  selector: 'app-ticket-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ticket-component.html',
  styleUrl: './ticket-component.css',
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

      // Card summary
      cardSummary: 'ملخص الكارت',
      no_card_summary: 'لا توجد بيانات عضوية لهذا الكارت',
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
      total_collected_amount: 'إجمالي المبلغ المحصَّل',
      total_collected_tickets: 'عدد التذاكر المحصَّلة',
      collected_at: 'وقت التحصيل',
      last_collection_time: 'وقت آخر تحصيل',
    },
    en: {
      issue_ticket: 'Issue Ticket',
      issue_ticket_subscriber: 'Issue ticket (subscriber)',
      entry: 'ENTRY',
      no_ticket_yet: 'No ticket yet — click “Create Ticket”',
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
    },
  };

  t = (k: string) => this.dict[this.i18n.current]?.[k] ?? k;
  dir = () => this.i18n.dir();
  isRTL = () => this.i18n.isRTL();

  // ===== Tickets list / filters =====
  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;
  Math = Math;

  q = '';
  action: '' | TicketAction = '';
  gate: string = '';

  page = 1;
  pageSize = 10;

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

  get isSupervisor(): boolean {
    return this.auth.isSupervisor;
  }

  @ViewChild('scanBox') scanBox?: ElementRef<HTMLInputElement>;

  // ================== Lifecycle ==================
  ngOnInit(): void {
    this.loadGates();
    this.loadEntryGates();
    this.loadTicketsForEntry();

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
    if (!res) {
      return;
    }

    this.lastIssuedTicketId = res.ticketId;
    this.lastIssuedTicketInfo = res.ticketInfo ?? null;
    this.lastTicketPrice = res.price ?? null;
    this.lastTicketCreatedAt = res.createdAt ?? null;

    const fromResponse: string | undefined = (res as any)?.vehicleNumber;
    if (fromResponse && fromResponse.trim().length > 0) {
      this.lastIssuedVehicleNumber = fromResponse.trim();
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

    const w = window.open('', '_blank', 'width=420,height=600');
    if (!w) return;

    const html = `
        <html>
          <head>
            <title>Print Ticket</title>
            <style>
              body{margin:0;padding:16px;font-family:Arial, sans-serif;}
              .wrap{display:flex;flex-direction:column;align-items:center;gap:12px;}
              img{max-width:100%;height:auto;border:1px solid #ddd;border-radius:8px;padding:8px;}
              .id{font-size:14px;color:#555}
              .btn{display:none}
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="wrap">
              <img src="${imgSrc}" />
              ${
                this.lastIssuedTicketInfo
                  ? `<div class="id">${this.lastIssuedTicketInfo}</div>`
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
        // احفظ الملخص علشان يتعرض في الكارت
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
    this.page = 1;
  }

  pageItems() {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  pagesCount() {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  private normalizeQrImage(value?: string | null): string | null {
    if (!value) return null;
    const v = String(value).trim();

    if (/^(data:image\/|blob:|https?:\/\/)/i.test(v)) return v;

    const clean = v.replace(/\s+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(clean)) {
      return `data:image/png;base64,${clean}`;
    }
    return null;
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
