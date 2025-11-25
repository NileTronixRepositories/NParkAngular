import { Component, ElementRef, inject, Inject, ViewChild } from '@angular/core';
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
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { GateServices, GateDto } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType, GateDevicePeripheral } from '../../Domain/Auth/auth.models';
import { ToastServices } from '../../Services/Toster/toast-services';
import { NfcReaderService } from '../../Services/registration/nfc-reader.service';

@Component({
  selector: 'app-exitgate-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './exitgate-component.html',
  styleUrls: ['./exitgate-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>{
        ar: {
          exitTicket: 'تذكرة الخروج',
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
          fetching: 'جاري جلب تفاصيل التذكرة...',
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

          // manual plate (block 1)
          manual_plate_label: 'إدخال رقم السيارة يدويًا',
          manual_plate_placeholder: 'اكتب رقم السيارة يدويًا في حالة عدم توفر أي جهاز',
          send_manual_plate: 'تسجيل مرور المركبة يدويًا',

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

          // NEW: QR scan button (لـ HTML الجديد)
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
        },
        en: {
          exitTicket: 'Exit Ticket',
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
          fetching: 'Fetching ticket details...',
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

          // NEW: QR scan (لـ HTML الجديد)
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
        },
      },
    },
  ],
})
export class ExitgateComponent {
  private svc = inject(TicketsServices);
  private gateSvc = inject(GateServices);
  private auth = inject(AuthService);
  private toast = inject(ToastServices);
  private nfc = inject(NfcReaderService);

  constructor(public lang: LanguageService, @Inject(I18N_DICT) private dict: I18nDict) {}

  // ===== Gate devices =====
  gatesList: GateDto[] = [];
  selectedGateId: number | null = null;
  gateLoading = false;
  gateSaving = false;
  gatePeripheral: GateDevicePeripheral | null = null;

  // manual plate (block 1)
  manualPlate: string = '';
  manualPlateSubmitting = false;

  // ===== Cashier / supervisor tokens =====
  cashierToken: string | null = null;

  totalPriceToday: number = 0;

  // QR input (scanBox)
  scanBuffer = '';
  scanning = false;
  scanningQR = false;

  scannedTicket: TicketDetailsDto | null = null;
  collecting = false;

  // NFC
  readingCard = false;

  // Exit ticket log
  addingExitTicket = false;
  exitTicketAdded = false;

  // Daily collect
  collectLoading = false;
  collectSummary: CollectDailyTicketsResponse | null = null;

  // Supervisor collect modal
  showSupervisorCollectModal = false;
  supervisorUsername: string = '';
  supervisorPassword: string = '';
  supervisorCollectLoading = false;
  supervisorCollectError: string | null = null;

  // Manual input (card / QR) block 2
  manualInput: string = '';
  searchingManual = false;
  salarySummary: CalculateSalaryResponse | null = null;

  // Tickets list
  tickets: TicketDto[] = [];
  filtered: TicketDto[] = [];
  loading = false;
  Math = Math;

  q = '';
  action: TicketAction | '' = 'OUT';
  gate: string = '';

  page = 1;
  pageSize = 10;

  @ViewChild('scanBox') scanBox?: ElementRef<HTMLInputElement>;

  get isSupervisor(): boolean {
    return this.auth.isSupervisor;
  }

  ngOnInit(): void {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

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

    this.loadExitGates();
    this.loadTicketsForExit(startOfDay.toISOString());
  }

  private loadExitGates() {
    this.gateLoading = true;
    this.gateSvc.getAll().subscribe({
      next: (all) => {
        this.gatesList = (all ?? []).filter((g) => g.gateType === GateType.Exit);
        this.gateLoading = false;
      },
      error: (err) => {
        console.error('Gate/GetAll error', err);
        this.gateLoading = false;
        this.toast.fromProblem(err);
      },
    });
  }

  private loadTicketsForExit(startDateIso: string, ticketNumber: string = '') {
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
      complete: () => (this.loading = false),
      error: (err) => {
        console.error('getTicketsForExit error', err);
        this.loading = false;
        this.toast.fromProblem(err);
      },
    });
  }

  confirmGateSelection() {
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
        console.error('selectGate error', err);
        this.gateSaving = false;
        this.toast.fromProblem(err);
      },
    });
  }

  // ===== Block 1: manual plate when no devices =====
  submitManualPlate() {
    const plate = this.manualPlate?.trim();
    if (!plate) return;

    this.manualPlateSubmitting = true;

    this.svc.captureManualPlate(plate).subscribe({
      next: (ok) => {
        if (ok) {
          this.toast.success(this.t('send_manual_plate'));
          this.manualPlate = '';
        } else {
          this.toast.error('تعذر تسجيل المركبة يدويًا');
        }
      },
      error: (err) => {
        console.error('submitManualPlate error', err);
        this.toast.fromProblem(err);
      },
      complete: () => {
        this.manualPlateSubmitting = false;
      },
    });
  }

  // ===== Scanner / QR / manual card =====
  selectAll(el: HTMLInputElement) {
    setTimeout(() => el.select(), 0);
  }

  // زرار Scan QR الجديد
  scanQRCode() {
    if (this.scanningQR) return;

    this.scanningQR = true;
    this.scanBuffer = '';
    this.manualInput = '';
    this.scannedTicket = null;
    this.salarySummary = null;
    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    setTimeout(() => {
      const el = this.scanBox?.nativeElement;
      if (el) {
        el.focus();
        this.selectAll(el);
      }
    }, 0);
  }

  onScanEnter() {
    const code = this.scanBuffer?.trim();
    if (!code) return;

    this.scanningQR = false;
    this.manualInput = '';

    this.fetchTicketAndSalaryByQr(code);
  }

  searchManual() {
    const code = this.manualInput?.trim();
    if (!code) return;

    this.searchingManual = true;
    this.scanBuffer = '';
    this.fetchSalaryForCard(code);
  }

  /** QR Ticket: Get ticket + salary via CalculateQrCodeTicketSalary */
  private fetchTicketAndSalaryByQr(code: string) {
    this.scanning = true;
    this.searchingManual = true;
    this.scannedTicket = null;
    this.salarySummary = null;

    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    // تفاصيل التذكرة
    this.svc.getTicketByQr(code).subscribe({
      next: (t) => {
        this.scannedTicket = t;
      },
      error: (err) => {
        console.error('getTicketByQr error', err);
        this.toast.fromProblem(err);
        this.scanning = false;
        this.searchingManual = false;
      },
      complete: () => {
        this.scanning = false;
      },
    });

    // حساب Salary
    this.svc.calculateTicketSalary(code).subscribe({
      next: (summary) => {
        this.salarySummary = summary;
      },
      error: (err) => {
        console.error('calculateTicketSalary error', err);
        this.toast.fromProblem(err);
      },
      complete: () => {
        this.searchingManual = false;
      },
    });
  }

  /** Subscriber card: CalculateSalaryForSubscriberCommand فقط */
  private fetchSalaryForCard(cardNumber: string) {
    this.scanning = false;
    this.searchingManual = true;
    this.scannedTicket = null;
    this.salarySummary = null;

    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    this.svc.calculateSubscriberSalary(cardNumber).subscribe({
      next: (summary) => {
        this.salarySummary = summary;
      },
      error: (err) => {
        console.error('calculateSubscriberSalary error', err);
        this.toast.fromProblem(err);
      },
      complete: () => {
        this.searchingManual = false;
      },
    });
  }

  addExitTicket(t: TicketDetailsDto) {
    if (this.addingExitTicket || !t?.id) return;

    this.addingExitTicket = true;

    this.svc.addExitTicket(String(t.id)).subscribe({
      next: (ok) => {
        if (ok) {
          this.exitTicketAdded = true;
          alert(this.t('exitTicketAdded'));
        } else {
          alert(this.t('exitTicketAddFailed'));
        }
      },
      error: (err) => {
        console.error('addExitTicket error', err);
        alert(this.t('exitTicketAddFailed'));
      },
      complete: () => {
        this.addingExitTicket = false;
      },
    });
  }

  confirmExit() {
    if (!this.scannedTicket || !this.salarySummary) return;

    if (!this.salarySummary.isExitValid) {
      this.toast.error(this.t('exit_not_valid_msg'));
      return;
    }

    this.collect(this.scannedTicket);
  }

  // طباعة الـ summary
  printSummary() {
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

  collect(t: TicketDetailsDto) {
    this.collecting = true;
    this.svc.collect(t.id).subscribe({
      next: () => {
        this.toast.success(this.t('collectedOk'));
        this.scanBuffer = '';
        this.manualInput = '';
        this.scannedTicket = null;
        this.salarySummary = null;
        this.reloadList();
      },
      complete: () => (this.collecting = false),
      error: (err) => {
        console.error('collect error', err);
        this.collecting = false;
        this.toast.fromProblem(err);
      },
    });
  }

  // ===== List =====
  reloadList() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    this.loadTicketsForExit(startOfDay.toISOString());
  }

  gates(): string[] {
    return Array.from(new Set(this.tickets.map((t) => t.gate))).sort();
  }

  applyFilters() {
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

  pageItems() {
    const start = (this.page - 1) * this.pageSize;
    return this.filtered.slice(start, start + this.pageSize);
  }

  pagesCount() {
    return Math.max(1, Math.ceil(this.filtered.length / this.pageSize));
  }

  // ===== NFC read card =====
  async readCard() {
    if (this.readingCard) return;
    this.readingCard = true;

    try {
      const uid = await this.nfc.readUID();
      const normalized = String(uid).trim().toUpperCase();

      // الكارت = حساب Salary فقط
      this.scanBuffer = '';
      this.manualInput = normalized;

      this.fetchSalaryForCard(normalized);
    } catch (err: any) {
      console.error(err);
      this.toast.error(err?.message || 'تعذر قراءة الكارت. تأكد من توصيل وتشغيل قارئ الـ NFC.');
    } finally {
      this.readingCard = false;
    }
  }

  // ===== Daily collect (supervisor / cashier) =====
  collectDailyForGate() {
    if (this.collectLoading) return;

    this.collectLoading = true;
    this.collectSummary = null;

    this.svc.collectDailyTickets().subscribe({
      next: (res: CollectDailyTicketsResponse) => {
        this.collectSummary = res;
        this.toast.success(this.t('collectDailyOk'));

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        this.loadTicketsForExit(startOfDay.toISOString());
      },
      error: (err) => {
        console.error('collectDailyForGate error', err);
        this.toast.fromProblem(err);
        this.collectLoading = false;
        this.collectSummary = null;
      },
      complete: () => {
        this.collectLoading = false;
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
        gateType: gateType,
        gateNumber: gateNumber,
      })
      .subscribe({
        next: (res: CollectDailyTicketsResponse) => {
          this.collectSummary = res;
          this.toast.success(this.t('admit_done'));

          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          this.loadTicketsForExit(startOfDay.toISOString());
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

  // ===== Translate helper =====
  private t(key: string) {
    return this.dict[this.lang.current]?.[key] ?? key;
  }
}
