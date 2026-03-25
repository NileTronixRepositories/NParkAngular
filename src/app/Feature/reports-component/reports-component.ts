import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { ReportsService } from '../../Services/Reports/reports.service';
import { ReportTicketsResponse } from '../../Domain/Reports/reports.model';
import * as XLSX from 'xlsx';

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
          filters: 'الفلاتر',
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
          filters: 'Filters',
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
        },
      }),
    },
  ],
})
export class ReportsComponent implements OnInit {
  private readonly reportsService = inject(ReportsService);
  public readonly lang = inject(LanguageService);
  private readonly dict = inject(I18N_DICT);

  reports = signal<ReportTicketsResponse[]>([]);
  loading = signal<boolean>(false);

  // Filters
  dateFrom = '';
  dateTo = '';
  filterSearchTerm = '';

  ngOnInit(): void {
    // Optionally load today's reports or leave empty until search
  }

  onSearch(): void {
    if (!this.dateFrom || !this.dateTo) {
      alert(
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
      },
      error: (err) => {
        console.error('Failed to load reports', err);
        this.loading.set(false);
      },
    });
  }

  onClear(): void {
    this.dateFrom = '';
    this.dateTo = '';
    this.filterSearchTerm = '';
    this.reports.set([]);
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

  exportPdf(): void {
    const data = this.reports();
    if (data.length === 0) return;

    const t = (k: string) => (this.dict as any)[this.lang.current]?.[k] ?? k;
    const isAr = this.lang.current === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert(isAr ? 'يرجى السماح بالنوافذ المنبثقة للطباعة.' : 'Please allow popups to print.');
      return;
    }

    const rows = data
      .map(
        (r) => `
      <tr>
        <td style="font-family: monospace;">${r.ticketNumber || r.ticketId}</td>
        <td>${r.vehicleNumber || '---'}</td>
        <td dir="ltr">${new Date(r.enterDate).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</td>
        <td dir="ltr">${new Date(r.exitDate).toLocaleString(isAr ? 'ar-EG' : 'en-US')}</td>
        <td>${r.isSubscribed ? t('subscriber') : t('visitor')}</td>
        <td>${r.collectorName || '---'}</td>
        <td><strong>${r.price}</strong> <span style="font-size: 10px;">${t('egp')}</span></td>
      </tr>
    `,
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${dir}" lang="${this.lang.current}">
      <head>
        <title>${t('reports')} - PDF</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            padding: 20px; 
            color: #333;
          }
          h2 { text-align: center; margin-bottom: 20px; color: #1a1a1a; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
          th { background-color: #f8f9fa; color: #000; font-weight: bold; border-bottom: 2px solid #dee2e6; padding: 12px; text-align: ${
            isAr ? 'right' : 'left'
          }; }
          td { border-bottom: 1px solid #dee2e6; padding: 12px; text-align: ${
            isAr ? 'right' : 'left'
          }; }
          tr:nth-child(even) { background-color: #fdfdfd; }
          
          @media print {
            body { padding: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <h2>${t('reports')} - ${new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('ticketNumber')}</th>
              <th>${t('vehicleNumber')}</th>
              <th>${t('enterDate')}</th>
              <th>${t('exitDate')}</th>
              <th>${t('isSubscribed')}</th>
              <th>${t('collectorName')}</th>
              <th>${t('price')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }
}
