import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';

import {
  CalculateSalaryResponse,
  CollectDailyTicketsResponse,
  ScanTicketResponse,
} from '../../Domain/tickets/tickets.model';
import { LocalPrintJobRequest, LocalPrintService } from './local-print.service';

@Injectable({
  providedIn: 'root',
})
export class TicketPrintService {
  private readonly localPrint = inject(LocalPrintService);

  printHtmlJobs(jobs: LocalPrintJobRequest[]): Observable<boolean[]> {
    if (!jobs.length) return of([]);
    return forkJoin(jobs.map((job) => this.localPrint.printHtml(job)));
  }

  normalizeQrImage(qr: string | number[] | null | undefined): string | null {
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

    const value = String(qr).trim();
    if (/^(data:image\/|blob:|https?:\/\/)/i.test(value)) return value;

    const clean = value.replace(/\s+/g, '');

    if (/^[0-9A-Fa-f]+$/.test(clean)) {
      try {
        return `data:image/png;base64,${this.hexToBase64(clean)}`;
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

  buildEntryIssuedTicketJobs(opts: {
    printQrEnabled: boolean;
    printReceiptEnabled: boolean;
    currentIssuedQr: string | null;
    currentIssuedQrType: 'image' | 'text' | null;
    lastIssuedTicketId: string | number | null;
    lastIssuedTicketInfo: string | null;
    lastIssuedVehicleNumber: string | null;
    lastIssuedPrice: number | null;
    lastIssuedCreatedAt: string | null;
    gateNumber: string | number;
    isExitGate: boolean;
    qrPrinterName: string | null | undefined;
    receiptPrinterName: string | null | undefined;
  }): LocalPrintJobRequest[] {
    const createdAtText = this.formatEntryIssuedCreatedAt(opts.lastIssuedCreatedAt);
    const gateTypeLabel = opts.isExitGate ? 'خروج' : 'دخول';
    const dateTimeLabel = opts.isExitGate ? 'تاريخ الخروج:' : 'تاريخ الدخول:';
    const qrPrinterName = opts.qrPrinterName?.trim();
    const receiptPrinterName = opts.receiptPrinterName?.trim();
    const jobs: LocalPrintJobRequest[] = [];

    if (
      opts.printQrEnabled &&
      opts.currentIssuedQr &&
      opts.currentIssuedQrType === 'image' &&
      qrPrinterName
    ) {
      jobs.push({
        printerName: qrPrinterName,
        htmlContent: this.buildEntryQrTicketPrintHtml({
          imgSrc: opts.currentIssuedQr,
          createdAt: createdAtText,
          gateNumber: opts.gateNumber,
          gateTypeLabel,
          ticketInfo: opts.lastIssuedTicketInfo,
          vehicleNumber: opts.lastIssuedVehicleNumber,
          dateTimeLabel,
        }),
        jobName: `QR-Ticket-${opts.lastIssuedTicketId ?? 'unknown'}`,
      });
    }

    if (opts.printReceiptEnabled && receiptPrinterName) {
      jobs.push({
        printerName: receiptPrinterName,
        htmlContent: this.buildEntryFeesTicketPrintHtml({
          createdAt: createdAtText,
          gateNumber: opts.gateNumber,
          gateTypeLabel,
          ticketInfo: opts.lastIssuedTicketInfo,
          vehicleNumber: opts.lastIssuedVehicleNumber,
          price: opts.lastIssuedPrice,
          dateTimeLabel,
        }),
        jobName: `Receipt-Ticket-${opts.lastIssuedTicketId ?? 'unknown'}`,
      });
    }

    return jobs;
  }

  buildEntryCollectSummaryJob(opts: {
    summary: CollectDailyTicketsResponse;
    receiptPrinterName: string | null | undefined;
    printReceiptEnabled: boolean;
    gateNumber: string | number;
    gateTypeLabel: string;
  }): LocalPrintJobRequest | null {
    const receiptPrinterName = opts.receiptPrinterName?.trim();

    if (!receiptPrinterName || !opts.printReceiptEnabled) {
      return null;
    }

    return {
      printerName: receiptPrinterName,
      htmlContent: this.buildCompactCollectSummaryReceiptHtml(
        opts.summary,
        opts.gateNumber,
        opts.gateTypeLabel,
      ),
      jobName: `Daily-Collect-${opts.summary.gateId || 'gate'}-${opts.summary.date || Date.now()}`,
    };
  }

  private buildCompactCollectSummaryReceiptHtml(
    summary: CollectDailyTicketsResponse,
    gateNumberValue: string | number,
    gateTypeLabelValue: string,
  ): string {
    const details = summary.ticketCollectDetails || [];
    const gateNumber = this.escapeHtml(String(gateNumberValue));
    const gateTypeLabel = this.escapeHtml(gateTypeLabelValue);
    const ticketLines = details.length
      ? `<div class="ticket-lines">
          ${details
            .map((detail, index) => {
              const ticketNumber = this.escapeHtml(detail.ticketNumber || detail.ticketId || '---');
              const vehicleInfo = this.escapeHtml(
                detail.vehicleNumber || detail.cardNumber || detail.source || '---',
              );
              const startTime = this.formatReceiptTime(detail.startDate);
              const endTime = this.formatReceiptTime(detail.endDate);

              return `
                <div class="ticket-line">
                  <span class="ticket-index">${index + 1}</span>
                  <span class="ticket-code">${ticketNumber}</span>
                  <span class="ticket-vehicle">${vehicleInfo}</span>
                  <span class="ticket-time">${startTime}-${endTime}</span>
                  <span class="ticket-amount">${this.formatReceiptMoney(detail.price)}</span>
                </div>
              `;
            })
            .join('')}
        </div>`
      : '<div class="empty-line">&#1604;&#1575; &#1578;&#1608;&#1580;&#1583; &#1578;&#1601;&#1575;&#1589;&#1610;&#1604; &#1578;&#1584;&#1575;&#1603;&#1585;</div>';

    return `
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>NPark Receipt</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            color: #000 !important;
            font-family: Tahoma, Arial, sans-serif !important;
            font-weight: 900 !important;
            line-height: 1.25;
            text-rendering: geometricPrecision;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            margin: 0;
            size: 80mm auto;
          }

          body {
            width: 80mm;
            margin: 0;
            padding: 1.5mm;
            color: #000;
            background: #fff;
            direction: rtl;
            font-family: Tahoma, Arial, sans-serif;
            font-weight: 900;
          }

          .receipt {
            width: 100%;
            border: 0.6mm solid #000;
            border-radius: 1.2mm;
            padding: 1.5mm;
          }

          .header {
            text-align: center;
            border-bottom: 0.35mm solid #000;
            padding-bottom: 1mm;
            margin-bottom: 1mm;
          }

          .title {
            font-size: 17px;
            line-height: 1.25;
          }

          .subtitle {
            margin-top: 0.5mm;
            font-size: 11px;
          }

          .summary-row {
            display: flex;
            justify-content: space-between;
            gap: 1mm;
            border-bottom: 0.25mm dashed #000;
            padding-bottom: 1mm;
            margin-bottom: 1mm;
            font-size: 12px;
            line-height: 1.25;
          }

          .summary-row strong {
            direction: ltr;
          }

          .ticket-lines {
            border: 0.35mm solid #000;
            border-radius: 0.8mm;
            overflow: hidden;
          }

          .ticket-line {
            display: grid;
            grid-template-columns: 4.5mm minmax(14mm, 1.1fr) minmax(11mm, 0.85fr) minmax(16mm, 1fr) minmax(13mm, 0.8fr);
            align-items: center;
            gap: 0.7mm;
            min-height: 6.2mm;
            border-bottom: 0.2mm solid #000;
            padding: 0.7mm 0.6mm;
            font-size: 10px;
            line-height: 1.22;
            white-space: nowrap;
          }

          .ticket-line:last-child {
            border-bottom: none;
          }

          .ticket-index,
          .ticket-code,
          .ticket-vehicle,
          .ticket-time,
          .ticket-amount {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .ticket-index {
            text-align: center;
          }

          .ticket-code,
          .ticket-vehicle,
          .ticket-time,
          .ticket-amount {
            direction: ltr;
            text-align: left;
          }

          .ticket-code,
          .ticket-amount {
            font-size: 9.5px;
          }

          .empty-line {
            text-align: center;
            padding: 2mm 1mm;
            border: 0.4mm dashed #000;
            font-size: 13px;
          }

          .footer {
            text-align: center;
            font-size: 11px;
            margin-top: 1mm;
            padding-top: 0.8mm;
            border-top: 0.25mm dashed #000;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="title">&#1573;&#1610;&#1589;&#1575;&#1604; &#1578;&#1581;&#1589;&#1610;&#1604;</div>
            <div class="subtitle">NPark Management System</div>
          </div>

          <div class="summary-row">
            <span>&#1585;&#1602;&#1605; &#1575;&#1604;&#1576;&#1608;&#1575;&#1576;&#1577;: <strong>${gateNumber}</strong></span>
            <span>&#1606;&#1608;&#1593; &#1575;&#1604;&#1576;&#1608;&#1575;&#1576;&#1577;: <strong>${gateTypeLabel}</strong></span>
          </div>

          <div class="summary-row">
            <span>&#1593;&#1583;&#1583; &#1575;&#1604;&#1578;&#1584;&#1575;&#1603;&#1585;: <strong>${details.length}</strong></span>
            <span>&#1575;&#1604;&#1573;&#1580;&#1605;&#1575;&#1604;&#1610;: <strong>${this.formatReceiptMoney(summary.totalAmount)}</strong></span>
          </div>

          ${ticketLines}

          <div class="footer">
            www.niletronix.com
          </div>
        </div>
      </body>
    </html>`;
  }

  private formatEntryIssuedCreatedAt(value: string | null): string {
    if (!value) return '—';

    return new Date(value).toLocaleString('ar-EG', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private buildEntryQrTicketPrintHtml(opts: {
    imgSrc: string;
    createdAt: string;
    gateNumber: string | number;
    gateTypeLabel: string;
    ticketInfo: string | null;
    vehicleNumber: string | null;
    dateTimeLabel: string;
  }): string {
    const vehicleRow = opts.vehicleNumber
      ? `
                <div class="info-item">
                  <span class="label">رقم المركبة:</span>
                  <span class="value">${this.escapeHtml(opts.vehicleNumber)}</span>
                </div>
      `
      : '';

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
            color: #000 !important;
            font-family: Tahoma, Arial, sans-serif !important;
            font-weight: 900 !important;
            line-height: 1.25;
            text-rendering: geometricPrecision;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            margin: 0;
            size: 80mm auto;
          }

          body {
            margin: 0;
            padding: 0;
            font-family: Tahoma, Arial, sans-serif;
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
            border: 0.8mm solid #000;
            padding: 2mm;
            display: flex;
            flex-direction: column;
            gap: 1mm;
          }

          .header-line {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 16px;
            font-weight: 900;
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
            font-size: 15px;
            font-weight: 900;
            line-height: 1.3;
          }

          .label {
            white-space: nowrap;
          }

          .value {
            text-align: left;
            direction: ltr;
            font-size: 15px;
            font-weight: 900;
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
            font-size: 12px;
            font-weight: 900;
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
                <div class="info-item">
                  <span class="label">نوع البوابة:</span>
                  <span class="value">${opts.gateTypeLabel}</span>
                </div>
                ${vehicleRow}
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

  private buildEntryFeesTicketPrintHtml(opts: {
    createdAt: string;
    gateNumber: string | number;
    gateTypeLabel: string;
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
            color: #000 !important;
            font-family: Tahoma, Arial, sans-serif !important;
            font-weight: 900 !important;
            line-height: 1.28;
            text-rendering: geometricPrecision;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          @page {
            margin: 0;
            size: 80mm auto;
          }

          body {
            margin: 0;
            padding: 1mm;
            font-family: Tahoma, Arial, sans-serif;
            direction: rtl;
            width: 80mm;
            font-weight: 900;
            color: #000;
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
            font-size: 22px;
            font-weight: 900;
            color: #000;
          }

          .receipt-subtitle {
            font-size: 14px;
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
            font-size: 16px;
            font-weight: 900;
            padding: 1mm 0;
            border-bottom: 0.2mm solid #000;
          }

          .receipt-row:last-child {
            border-bottom: none;
          }

          .receipt-label {
            font-weight: 900;
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
            font-size: 18px;
            font-weight: 900;
          }

          .total-value {
            font-size: 22px;
            font-weight: 900;
          }

          .receipt-footer {
            text-align: center;
            font-size: 12px;
            font-weight: 900;
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
              <span class="receipt-label">نوع البوابة:</span>
              <span class="receipt-value">${opts.gateTypeLabel}</span>
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

  printExitSummaryWindow(opts: {
    scannedTicket: ScanTicketResponse | null;
    salarySummary: CalculateSalaryResponse | null;
    currentTotalWithSanctions: number;
    t: (key: string) => string;
  }): void {
    if (!opts.scannedTicket && !opts.salarySummary) return;

    const printWindow = window.open('', '_blank', 'width=420,height=600');
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(this.buildExitSummaryHtml(opts));
    printWindow.document.close();
  }

  private buildExitSummaryHtml(opts: {
    scannedTicket: ScanTicketResponse | null;
    salarySummary: CalculateSalaryResponse | null;
    currentTotalWithSanctions: number;
    t: (key: string) => string;
  }): string {
    const ticket = opts.scannedTicket;
    const salary = opts.salarySummary;
    const t = opts.t;

    return `
      <html>
        <head>
          <title>Exit Ticket</title>
          <style>
            *{box-sizing:border-box;color:#000!important;font-family:Tahoma,Arial,sans-serif!important;font-weight:900!important;line-height:1.35;text-rendering:geometricPrecision;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
            body{margin:0;padding:16px;font-family:Tahoma,Arial,sans-serif;color:#000;}
            .wrap{display:flex;flex-direction:column;gap:8px;}
            .row{display:flex;justify-content:space-between;font-size:17px;}
            .title{font-size:22px;font-weight:900;margin-bottom:8px;}
            .mono{font-family:Consolas,'Courier New',monospace!important;font-weight:900;}
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="wrap">
            <div class="title">${this.escapeHtml(t('exitTicket'))}</div>
            ${
              ticket
                ? `
              <div class="row"><span>${this.escapeHtml(t('id'))}</span><span class="mono">${this.escapeHtml(String(ticket.id))}</span></div>
              <div class="row"><span>${this.escapeHtml(t('plate'))}</span><span class="mono">${this.escapeHtml(ticket.ticketInfo || '')}</span></div>
              <div class="row"><span>${this.escapeHtml(t('start'))}</span><span>${this.escapeHtml(new Date(ticket.startDate).toLocaleString())}</span></div>
              <div class="row"><span>${this.escapeHtml(t('end'))}</span><span>${this.escapeHtml(new Date().toLocaleString())}</span></div>
              <div class="row"><span>${this.escapeHtml(t('totalDue'))}</span><span class="mono">${ticket.price.toFixed(2)}</span></div>
            `
                : ''
            }
            ${
              salary
                ? `
              <hr/>
              <div class="title">${this.escapeHtml(t('salary_total'))}</div>
              <div class="row"><span>${this.escapeHtml(t('salary_total'))}</span><span class="mono">${opts.currentTotalWithSanctions.toFixed(2)}</span></div>
              <div class="row"><span>${this.escapeHtml(t('salary_enter_date'))}</span><span>${this.escapeHtml(new Date(salary.enterDate).toLocaleString())}</span></div>
              <div class="row"><span>${this.escapeHtml(t('salary_exit_valid'))}</span><span>${
                salary.isExitValid ? this.escapeHtml(t('yes')) : this.escapeHtml(t('no'))
              }</span></div>
              <div class="row"><span>${this.escapeHtml(t('salary_cashier_collected'))}</span><span>${
                salary.isCollectByCashier
                  ? this.escapeHtml(t('cashierCollectedShort'))
                  : this.escapeHtml(t('cashier_not_collected'))
              }</span></div>
            `
                : ''
            }
          </div>
        </body>
      </html>
    `;
  }

  private escapeHtml(value: string): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private formatReceiptTime(value: string | null | undefined): string {
    if (!value) return '--:--';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return this.escapeHtml(value);

    return date.toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatReceiptMoney(value: number | null | undefined): string {
    return `${Number(value || 0).toFixed(2)} &#1580;.&#1605;`;
  }

  private hexToBase64(hexString: string): string {
    const bytes: number[] = [];
    for (let i = 0; i < hexString.length; i += 2) {
      bytes.push(parseInt(hexString.substring(i, i + 2), 16));
    }
    return btoa(String.fromCharCode(...bytes));
  }
}
