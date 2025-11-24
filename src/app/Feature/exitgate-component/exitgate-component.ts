import { Component, ElementRef, inject, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  TicketDto,
  TicketAction,
  TicketDetailsDto,
  CollectDailyTicketsResponse,
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
      useValue: (<I18nDict>{
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
          emptyState: 'امسح تذكرة لعرض تفاصيلها والتحصيل.',
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

          // Tickets list
          tickets: 'التذاكر',
          fees: 'الرسوم',
          cashierCollectedShort: 'تم',
          total_fees_today: 'إجمالي الرسوم اليوم',

          readCard: 'قراءة الكارت',
          reading: 'جاري القراءة…',
          readCardTitle: 'قراءة رقم الكارت من قارئ الـ NFC',
          addExitTicket: 'تسجيل التذكرة عند الخروج',
          exitTicketAdded: 'تم تسجيل التذكرة عند الخروج',
          exitTicketAddFailed: 'تعذر تسجيل التذكرة عند الخروج',
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
          emptyState: 'Scan a ticket to show its details and collect payment.',
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

          // Gate devices
          gate_devices: 'Gate Devices',
          devices_status: 'Devices Status',
          pc_device: 'PC',
          lpr_device: 'LPR Camera',
          device_connected: 'Connected / Enabled',
          device_not_connected: 'Not available',
          ip_address: 'IP Address',
          no_gate_devices: 'No devices are linked to this gate yet',

          // Tickets list
          tickets: 'Tickets',
          fees: 'Fees',
          cashierCollectedShort: 'OK',
          total_fees_today: 'Total fees today',
          readCard: 'Read card',
          reading: 'Reading…',
          readCardTitle: 'Read card UID from NFC reader',
          addExitTicket: 'Add exit ticket log',
          exitTicketAdded: 'Exit ticket log has been saved',
          exitTicketAddFailed: 'Failed to save exit ticket log',
          collectAllToday: "Collect today's revenue for this gate",
        },
      }) as I18nDict,
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
  totalPriceToday: number = 0;
  scanBuffer = '';
  scanning = false;
  scannedTicket: TicketDetailsDto | null = null;
  collecting = false;

  readingCard = false;

  addingExitTicket = false;
  exitTicketAdded = false;
  collectLoading = false;

  // ===== Tickets list =====
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

  ngOnInit(): void {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    this.loadExitGates();

    this.loading = true;
    this.svc.getTicketsForExit(startOfDay.toISOString()).subscribe({
      next: (res) => {
        this.totalPriceToday = res.totalPrice ?? 0;

        this.tickets = res.items
          .filter((t) => t.action === 'OUT')
          .sort(
            (a: TicketDto, b: TicketDto) => new Date(b.time).getTime() - new Date(a.time).getTime()
          );
        this.applyFilters();
      },
      complete: () => (this.loading = false),
      error: () => (this.loading = false),
    });
  }

  get isSupervisor(): boolean {
    return this.auth.isSupervisor;
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

  // ===== Scanner =====
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

    this.addingExitTicket = false;
    this.exitTicketAdded = false;

    this.svc.getTicketByQr(code).subscribe({
      next: (t) => (this.scannedTicket = t),
      complete: () => (this.scanning = false),
      error: () => (this.scanning = false),
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

  collect(t: TicketDetailsDto) {
    this.collecting = true;
    this.svc.collect(t.id).subscribe({
      next: () => {
        this.toast.success(this.t('collectedOk'));
        this.scanBuffer = '';
        this.scannedTicket = null;
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

    this.loading = true;
    this.svc.getTicketsForExit(startOfDay.toISOString()).subscribe({
      next: (res) => {
        this.totalPriceToday = res.totalPrice ?? 0;

        this.tickets = res.items
          .filter((x) => x.action === 'OUT')
          .sort(
            (a: TicketDto, b: TicketDto) => new Date(b.time).getTime() - new Date(a.time).getTime()
          );
        this.applyFilters();
      },
      complete: () => (this.loading = false),
      error: () => (this.loading = false),
    });
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

  async readCard() {
    if (this.readingCard) return;
    this.readingCard = true;

    try {
      const uid = await this.nfc.readUID();
      const normalized = String(uid).trim().toUpperCase();

      this.scanBuffer = normalized;

      this.onScanEnter();
    } catch (err: any) {
      console.error(err);
      this.toast.error(err?.message || 'تعذر قراءة الكارت. تأكد من توصيل وتشغيل قارئ الـ NFC.');
    } finally {
      this.readingCard = false;
    }
  }

  collectDailyForGate() {
    if (this.collectLoading) return;

    this.collectLoading = true;

    this.svc.collectDailyTickets().subscribe({
      next: (res: CollectDailyTicketsResponse) => {
        this.toast.success(this.t('collectedOk') + ` - ${res.totalAmount} `);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        this.loadTicketsForExit(startOfDay.toISOString());
      },
      error: (err) => {
        console.error('collectDailyForGate error', err);
        this.toast.fromProblem(err);
        this.collectLoading = false;
      },
      complete: () => {
        this.collectLoading = false;
      },
    });
  }

  // ترجمة سريعة داخل TS
  private t(key: string) {
    return this.dict[this.lang.current]?.[key] ?? key;
  }
}
