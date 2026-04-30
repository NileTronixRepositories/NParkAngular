import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { ReportsService } from '../../Services/Reports/reports.service';
import { ReportTicketsResponse } from '../../Domain/Reports/reports.model';
import { ReportsTourService } from '../../Services/Reports/reports-tour.service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { environment } from '../../Shared/environment/environment';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-reports-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './reports-component.html',
  styleUrls: ['./reports-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          reports: 'التقارير',
          ticketId: 'رقم التذكرة',
          ticketNumber: 'رقم التذكرة',
          enterDate: 'تاريخ الدخول',
          exitDate: 'تاريخ الخروج',
          price: 'السعر',
          vehicleNumber: 'رقم المركبة',
          collectorName: 'المحصل',
          isSubscribed: 'مشترك؟',
          filters: 'البحث',
          dateFrom: 'من تاريخ',
          dateTo: 'إلى تاريخ',
          search: 'بحث',
          noReports: 'لا توجد تقارير حالياً',
          subscriber: 'مشترك',
          visitor: 'زائر',
          egp: 'ج.م',
          clear: 'مسح',
          exportPdf: 'تصدير كـ PDF',
          exportExcel: 'تصدير كـ Excel',
          helpTour: 'دليل الاستخدام',
          ticketDetails: 'تفاصيل التذكرة',
          attachments: 'المرفقات',
          noAttachments: 'لا توجد مرفقات',
          close: 'إغلاق',
        },
        en: {
          reports: 'Reports',
          ticketId: 'Ticket ID',
          ticketNumber: 'Ticket Number',
          enterDate: 'Enter Date',
          exitDate: 'Exit Date',
          price: 'Price',
          vehicleNumber: 'Vehicle Number',
          collectorName: 'Collector',
          isSubscribed: 'Is Subscribed?',
          filters: 'Search',
          dateFrom: 'Date From',
          dateTo: 'Date To',
          search: 'Search',
          noReports: 'No reports found',
          subscriber: 'Subscriber',
          visitor: 'Visitor',
          egp: 'EGP',
          clear: 'Clear',
          exportPdf: 'Export PDF',
          exportExcel: 'Export Excel',
          helpTour: 'Help Tour',
          ticketDetails: 'Ticket Details',
          attachments: 'Attachments',
          noAttachments: 'No attachments',
          close: 'Close',
        },
      }),
    },
  ],
})
export class ReportsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  public readonly lang = inject(LanguageService);
  private readonly dict = inject(I18N_DICT);
  private readonly tourService = inject(ReportsTourService);
  private readonly toastService = inject(ToastServices);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly attachmentSafeUrlCache = new Map<string, SafeResourceUrl>();

  reports = signal<ReportTicketsResponse[]>([]);
  loading = signal<boolean>(false);
  selectedTicket = signal<ReportTicketsResponse | null>(null);

  // Filters
  dateFrom = '';
  dateTo = '';
  filterSearchTerm = '';

  ngOnInit(): void {
    // Optionally load today's reports or leave empty until search
  }

  startTour(): void {
    this.tourService.startTour();
  }

  onSearch(): void {
    if (!this.dateFrom || !this.dateTo) {
      this.toastService.warn(
        this.lang.isRTL()
          ? 'يرجى اختيار تاريخ البداية والنهاية'
          : 'Please select both from and to dates',
      );
      return;
    }

    this.loading.set(true);
    this.reportsService.getReport(this.dateFrom, this.dateTo, this.filterSearchTerm).subscribe({
      next: (data) => {
        this.reports.set(data);
        this.loading.set(false);

        if (data.length > 0) {
          this.toastService.success(
            this.lang.isRTL()
              ? `تم العثور على ${data.length} تذكرة`
              : `Found ${data.length} tickets`,
          );
        } else {
          this.toastService.warn(
            this.lang.isRTL() ? 'لا توجد نتائج مطابقة' : 'No matching results found',
          );
        }
      },
      error: () => {
        // Global interceptor handles the toast message
        this.loading.set(false);
      },
    });
  }

  onClear(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.filterSearchTerm = '';
    this.reports.set([]);
    this.closeTicketDetails();
  }

  openTicketDetails(ticket: ReportTicketsResponse): void {
    this.selectedTicket.set(ticket);
  }

  closeTicketDetails(): void {
    this.selectedTicket.set(null);
  }

  onTicketRowKeydown(event: KeyboardEvent, ticket: ReportTicketsResponse): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.openTicketDetails(ticket);
  }

  attachmentUrl(path: string | null | undefined): string {
    const value = String(path ?? '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;

    const origin = environment.baseUrl.replace(/\/api\/?$/i, '').replace(/\/$/, '');
    return `${origin}/${value.replace(/^\/+/, '')}`;
  }

  attachmentSafeUrl(path: string | null | undefined): SafeResourceUrl {
    const url = this.attachmentUrl(path);
    const cached = this.attachmentSafeUrlCache.get(url);
    if (cached) return cached;

    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.attachmentSafeUrlCache.set(url, safeUrl);
    return safeUrl;
  }

  isPdfAttachment(path: string | null | undefined): boolean {
    return String(path ?? '').toLowerCase().split('?')[0].endsWith('.pdf');
  }

  exportExcel(): void {
    const data = this.reports();
    if (data.length === 0) return;

    const t = (k: string) => (this.dict as any)[this.lang.current]?.[k] ?? k;
    const isAr = this.lang.current === 'ar';

    const exportData = data.map((r) => ({
      [t('ticketNumber')]: r.ticketNumber || r.ticketId,
      [t('vehicleNumber')]: r.vehicleNumber || '---',
      [t('enterDate')]: new Date(r.enterDate).toLocaleString(isAr ? 'ar-EG' : 'en-US'),
      [t('exitDate')]: new Date(r.exitDate).toLocaleString(isAr ? 'ar-EG' : 'en-US'),
      [t('isSubscribed')]: r.isSubscribed ? t('subscriber') : t('visitor'),
      [t('price')]: r.price + ' ' + t('egp'),
      [t('collectorName')]: r.collectorName || '---',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);

    if (isAr) {
      worksheet['!dir'] = 'rtl';
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, t('reports'));

    XLSX.writeFile(workbook, `Reports_${new Date().getTime()}.xlsx`);
  }

  async previewPdf(): Promise<void> {
    const data = this.reports();
    if (data.length === 0) return;

    const t = (k: string) => (this.dict as any)[this.lang.current]?.[k] ?? k;
    const isAr = this.lang.current === 'ar';
    const locale = isAr ? 'ar-EG' : 'en-US';
    const fileName = `Reports_${new Date().getTime()}.pdf`;

    const viewer = window.open('', '_blank');
    if (!viewer) {
      this.toastService.error(
        this.lang.isRTL()
          ? 'يرجى السماح بالنوافذ المنبثقة لعرض ملف PDF.'
          : 'Please allow popups to preview the PDF.',
      );
      return;
    }

    viewer.document.write(
      `<html><head><title>${fileName}</title></head><body style="font-family: Arial, sans-serif; padding: 24px;">Loading PDF...</body></html>`,
    );
    viewer.document.close();

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const container = this.createPdfContainer(data, t, isAr, locale);

    try {
      doc.setProperties({ title: fileName });
      document.body.appendChild(container);
      await document.fonts?.ready;
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        width: 1120,
        height: container.scrollHeight,
        windowWidth: 1120,
        windowHeight: container.scrollHeight,
      });

      this.addCanvasToPdf(doc, canvas);
      const url = URL.createObjectURL(doc.output('blob'));
      viewer.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      viewer.close();
      this.toastService.error(this.lang.isRTL() ? 'تعذر إنشاء ملف PDF.' : 'Failed to create the PDF.');
    } finally {
      container.remove();
    }
  }

  exportPdf(): void {
    void this.previewPdf();
  }

  private createPdfContainer(
    data: ReportTicketsResponse[],
    t: (key: string) => string,
    isAr: boolean,
    locale: string,
  ): HTMLElement {
    const dir = isAr ? 'rtl' : 'ltr';
    const align = isAr ? 'right' : 'left';
    const rows = data
      .map(
        (r) => `
          <tr>
            <td class="mono">${this.escapeHtml(r.ticketNumber || r.ticketId || '---')}</td>
            <td>${this.escapeHtml(r.vehicleNumber || '---')}</td>
            <td class="date">${this.escapeHtml(this.formatReportDate(r.enterDate, locale))}</td>
            <td class="date">${this.escapeHtml(this.formatReportDate(r.exitDate, locale))}</td>
            <td>${this.escapeHtml(r.isSubscribed ? t('subscriber') : t('visitor'))}</td>
            <td>${this.escapeHtml(r.collectorName || '---')}</td>
            <td class="money">${this.escapeHtml(`${Number(r.price || 0).toFixed(2)} ${t('egp')}`)}</td>
          </tr>
        `,
      )
      .join('');

    const container = document.createElement('div');
    container.setAttribute('dir', dir);
    container.style.position = 'fixed';
    container.style.left = '0';
    container.style.top = '0';
    container.style.zIndex = '-1';
    container.style.pointerEvents = 'none';
    container.style.width = '1120px';
    container.style.background = '#ffffff';
    container.style.color = '#172033';
    container.style.fontFamily = "'Cairo', 'Arial', 'Tahoma', sans-serif";
    container.innerHTML = `
      <style>
        .pdf-report {
          box-sizing: border-box;
          width: 1120px;
          padding: 20px 24px;
          background: #fff;
          direction: ${dir};
          font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif;
        }
        .pdf-report * { box-sizing: border-box; }
        .pdf-title {
          margin: 0 0 18px;
          text-align: center;
          font-size: 22px;
          font-weight: 800;
          line-height: 1.4;
          color: #111827;
        }
        .pdf-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 13px;
          direction: ${dir};
        }
        .pdf-table th,
        .pdf-table td {
          border-bottom: 1px solid #dfe4ea;
          padding: 10px 9px;
          text-align: ${align};
          vertical-align: middle;
          overflow-wrap: anywhere;
        }
        .pdf-table th {
          background: #f3f6fa;
          color: #111827;
          font-weight: 800;
        }
        .pdf-table tr:nth-child(even) td { background: #fbfcfe; }
        .pdf-table .date,
        .pdf-table .mono {
          direction: ltr;
          unicode-bidi: plaintext;
          font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif;
        }
        .pdf-table .money {
          direction: ltr;
          unicode-bidi: plaintext;
          font-weight: 800;
        }
      </style>
      <section class="pdf-report">
        <h1 class="pdf-title">${this.escapeHtml(t('reports'))} - ${this.escapeHtml(
          new Date().toLocaleDateString(locale),
        )}</h1>
        <table class="pdf-table">
          <thead>
            <tr>
              <th>${this.escapeHtml(t('ticketNumber'))}</th>
              <th>${this.escapeHtml(t('vehicleNumber'))}</th>
              <th>${this.escapeHtml(t('enterDate'))}</th>
              <th>${this.escapeHtml(t('exitDate'))}</th>
              <th>${this.escapeHtml(t('isSubscribed'))}</th>
              <th>${this.escapeHtml(t('collectorName'))}</th>
              <th>${this.escapeHtml(t('price'))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </section>
    `;

    return container;
  }

  private addCanvasToPdf(doc: jsPDF, canvas: HTMLCanvasElement): void {
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const targetWidth = pageWidth - margin * 2;
    const targetHeight = pageHeight - margin * 2;
    const pixelsPerPage = Math.floor((targetHeight * canvas.width) / targetWidth);

    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const sliceHeight = Math.min(pixelsPerPage, canvas.height - sourceY);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      if (pageIndex > 0) {
        doc.addPage();
      }

      const slicePdfHeight = (sliceHeight * targetWidth) / canvas.width;
      doc.addImage(
        pageCanvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        margin,
        margin,
        targetWidth,
        slicePdfHeight,
      );

      sourceY += sliceHeight;
      pageIndex += 1;
    }
  }

  private formatReportDate(value: string | Date | null | undefined, locale: string): string {
    if (!value) return '---';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '---';

    return date.toLocaleString(locale);
  }

  private escapeHtml(value: unknown): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
