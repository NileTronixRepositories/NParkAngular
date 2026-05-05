import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  EntranceCashierTicketsReportResponse,
  ReportTicketsResponse,
  SupervisorActiveTicketCollection,
  SupervisorArchivedTicketCollection,
  SupervisorCollectionsReportResponse,
  SupervisorExceedCollection,
  SupervisorTicketCollectorSummary,
} from '../../Domain/Reports/reports.model';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly ticketUrl = `${this.baseUrl}/Ticket`;

  getReport(
    fromDate: string,
    toDate: string,
    searchTerm: string = '',
  ): Observable<ReportTicketsResponse[]> {
    const normalizedSearchTerm = searchTerm.trim();
    const params = new HttpParams()
      .set('FromDate', fromDate)
      .set('ToDate', toDate)
      .set('SearchTerm', normalizedSearchTerm);

    return this.http.get<ReportTicketsResponse[]>(`${this.ticketUrl}/Report`, { params }).pipe(
      map((items) => (items ?? []).map((item) => this.normalizeReportTicket(item as any))),
      catchError((err) => {
        console.error('[ReportsService] getReport failed', err);
        return throwError(() => err);
      }),
    );
  }

  getEntranceCashierTicketsReport(
    userId: string,
    from: string,
    to: string,
  ): Observable<EntranceCashierTicketsReportResponse> {
    const params = new HttpParams().set('from', from).set('to', to);

    return this.http
      .get<EntranceCashierTicketsReportResponse>(
        `${this.baseUrl}/reports/entrance-cashiers/${userId}/tickets`,
        { params },
      )
      .pipe(
        map((report) => ({
          ...report,
          insideParkTickets: report?.insideParkTickets ?? [],
          outsideParkTickets: report?.outsideParkTickets ?? [],
        })),
        catchError((err) => {
          console.error('[ReportsService] getEntranceCashierTicketsReport failed', err);
          return throwError(() => err);
        }),
      );
  }

  getSupervisorCollectionsReport(
    supervisorId: string,
    from: string,
    to: string,
  ): Observable<SupervisorCollectionsReportResponse> {
    const params = new HttpParams().set('fromDate', from).set('toDate', to);

    return this.http
      .get<any>(
        `${this.baseUrl}/reports/supervisors/${supervisorId}/collection-report`,
        { params },
      )
      .pipe(
        map((report) => this.normalizeSupervisorCollectionsReport(report)),
        catchError((err) => {
          console.error('[ReportsService] getSupervisorCollectionsReport failed', err);
          return throwError(() => err);
        }),
      );
  }

  private normalizeSupervisorCollectionsReport(report: any): SupervisorCollectionsReportResponse {
    const transactions = Array.isArray(report?.transactions) ? report.transactions : [];
    const enterTransactions = transactions.filter((item: any) =>
      this.isTransactionType(item, 1, 'EnterTickets'),
    );
    const exceedTransactions = transactions.filter((item: any) =>
      this.isTransactionType(item, 2, 'ExceedTransactions'),
    );

    const activeTicketCollections: SupervisorActiveTicketCollection[] = [];
    const archivedTicketCollections: SupervisorArchivedTicketCollection[] = [];
    const supervisorExceedCollections: SupervisorExceedCollection[] = [];

    enterTransactions.forEach((transaction: any) => {
      const tickets = this.transactionTickets(transaction);
      tickets.forEach((ticket: any) => {
        const source = this.string(ticket, 'source', 'Source').toLowerCase();
        const isArchive = source.includes('archive');
        const baseTicket = {
          ticketId: this.string(ticket, 'ticketIdSnapshot', 'ticketId', 'TicketIdSnapshot', 'TicketId'),
          uniqueCode: this.string(ticket, 'ticketUniqueCode', 'uniqueCode', 'TicketUniqueCode'),
          startDate: this.string(ticket, 'ticketStartDate', 'startDate', 'TicketStartDate'),
          collectedDate: this.string(transaction, 'collectedAt', 'CollectedAt'),
          collectorName:
            this.value<string | null>(ticket, 'responsibleUserName', 'ResponsibleUserName') ??
            this.value<string | null>(transaction, 'collectedByName', 'CollectedByName') ??
            null,
          collectionAmount: this.number(ticket, 'amountCollected', 'AmountCollected'),
          vehicleNumber:
            this.value<string | null>(ticket, 'vehicleNumber', 'VehicleNumber') ?? null,
          isSubscriber: this.boolean(ticket, 'isSubscriber', 'IsSubscriber'),
          cardNumber: this.value<string | null>(ticket, 'cardNumber', 'CardNumber') ?? null,
          gateNumber: this.gateLabel(transaction, ticket, 'ticketGateId', 'TicketGateId'),
        };

        if (isArchive) {
          archivedTicketCollections.push({
            ...baseTicket,
            endDate: this.value<string | null>(ticket, 'ticketEndDate', 'TicketEndDate') ?? null,
            exitGateNumber: this.gateLabel(transaction, ticket, 'ticketExitGateId', 'TicketExitGateId'),
          });
          return;
        }

        activeTicketCollections.push(baseTicket);
      });
    });

    exceedTransactions.forEach((transaction: any) => {
      const tickets = this.transactionTickets(transaction);
      tickets.forEach((ticket: any) => {
        const originalPrice = this.number(ticket, 'originalPrice', 'OriginalPrice');
        const exceedAmount = this.number(ticket, 'exceedAmount', 'ExceedAmount', 'amountCollected');
        supervisorExceedCollections.push({
          transactionId: this.string(ticket, 'itemId', 'ItemId') || this.string(transaction, 'transactionId', 'TransactionId'),
          ticketUniqueCode: this.string(ticket, 'ticketUniqueCode', 'TicketUniqueCode'),
          ticketStartDate: this.string(ticket, 'ticketStartDate', 'TicketStartDate'),
          ticketEndDate: this.value<string | null>(ticket, 'ticketEndDate', 'TicketEndDate') ?? null,
          exceedAmount,
          ticketPrice: originalPrice,
          ticketOldExceedPrice: 0,
          totalPriceAfterExceed: originalPrice + exceedAmount,
          vehicleNumber:
            this.value<string | null>(ticket, 'vehicleNumber', 'VehicleNumber') ?? null,
          exceedCreatedByName:
            this.value<string | null>(ticket, 'responsibleUserName', 'ResponsibleUserName') ?? null,
          supervisorCollectorName:
            this.value<string | null>(transaction, 'collectedByName', 'CollectedByName') ?? null,
          supervisorCollectedAt: this.string(transaction, 'collectedAt', 'CollectedAt'),
          createdAt: null,
          gateNumber: this.gateLabel(transaction, ticket, 'ticketGateId', 'TicketGateId'),
        });
      });
    });

    const collectionTransactions = transactions.map((transaction: any) => ({
      transactionId: this.string(transaction, 'transactionId', 'TransactionId'),
      transactionTypeId: this.number(transaction, 'transactionTypeId', 'TransactionTypeId'),
      transactionType: this.string(transaction, 'transactionType', 'TransactionType'),
      gateId: this.value<string | null>(transaction, 'gateId', 'GateId') ?? null,
      gateName: this.value<string | number | null>(transaction, 'gateName', 'GateName') ?? null,
      collectedBy: this.value<string | null>(transaction, 'collectedBy', 'CollectedBy') ?? null,
      collectedByName:
        this.value<string | null>(transaction, 'collectedByName', 'CollectedByName') ?? null,
      collectedAt: this.string(transaction, 'collectedAt', 'CollectedAt'),
      totalItemsCollected: this.number(transaction, 'totalItemsCollected', 'TotalItemsCollected'),
      totalAmountCollected: this.number(transaction, 'totalAmountCollected', 'TotalAmountCollected'),
    }));

    return {
      supervisor: {
        supervisorId: this.string(report, 'supervisorId', 'SupervisorId'),
        supervisorName: this.string(report, 'supervisorName', 'SupervisorName'),
        username: '',
        roleId: '',
        roleNameEn: 'Supervisor',
        roleNameAr: 'مشرف',
      },
      period: {
        from: this.string(report, 'fromDate', 'FromDate'),
        to: this.string(report, 'toDate', 'ToDate'),
      },
      summary: {
        collectionTransactionsCount:
          this.nullableNumber(report, 'totalCollectionTransactions', 'TotalCollectionTransactions') ??
          collectionTransactions.length,
        totalItemsCollected:
          this.nullableNumber(report, 'totalItemsCollected', 'TotalItemsCollected') ??
          activeTicketCollections.length + supervisorExceedCollections.length,
        totalAmountCollected:
          this.nullableNumber(report, 'totalAmountCollected', 'TotalAmountCollected') ??
          this.number(report, 'totalEnterTicketsAmount', 'TotalEnterTicketsAmount') +
            this.number(report, 'totalExceedAmount', 'TotalExceedAmount'),
        ticketCollectionsCount:
          this.nullableNumber(report, 'totalEnterTicketsCollected', 'TotalEnterTicketsCollected') ??
          activeTicketCollections.length + archivedTicketCollections.length,
        activeTicketCollectionsCount: activeTicketCollections.length,
        archivedTicketCollectionsCount: archivedTicketCollections.length,
        activeTicketCollectionsAmount: this.sumBy(activeTicketCollections, 'collectionAmount'),
        archivedTicketCollectionsAmount: this.sumBy(archivedTicketCollections, 'collectionAmount'),
        ticketCollectionsAmount:
          this.nullableNumber(report, 'totalEnterTicketsAmount', 'TotalEnterTicketsAmount') ??
          this.sumBy(activeTicketCollections, 'collectionAmount') +
            this.sumBy(archivedTicketCollections, 'collectionAmount'),
        supervisorExceedCollectionsCount:
          this.nullableNumber(
            report,
            'totalExceedTransactionsCollected',
            'TotalExceedTransactionsCollected',
          ) ?? supervisorExceedCollections.length,
        supervisorExceedCollectionsAmount:
          this.nullableNumber(report, 'totalExceedAmount', 'TotalExceedAmount') ??
          this.sumBy(supervisorExceedCollections, 'exceedAmount'),
        pendingExceedCollectionsCount: 0,
        pendingExceedCollectionsAmount: 0,
        grandTotalCollectionsAmount:
          this.nullableNumber(report, 'totalAmountCollected', 'TotalAmountCollected') ??
          this.number(report, 'totalEnterTicketsAmount', 'TotalEnterTicketsAmount') +
            this.number(report, 'totalExceedAmount', 'TotalExceedAmount'),
      },
      collectionTransactions,
      ticketCollectorsSummary: this.buildSupervisorCollectorsSummary(transactions),
      activeTicketCollections,
      archivedTicketCollections,
      supervisorExceedCollections,
      pendingExceedCollections: [],
    };
  }

  private buildSupervisorCollectorsSummary(transactions: any[]): SupervisorTicketCollectorSummary[] {
    const mapByUser = new Map<string, SupervisorTicketCollectorSummary>();

    transactions.forEach((transaction) => {
      const isEnter = this.isTransactionType(transaction, 1, 'EnterTickets');
      const isExceed = this.isTransactionType(transaction, 2, 'ExceedTransactions');
      const lines = this.transactionLines(transaction);

      lines.forEach((line) => {
        const responsibleUserId = this.string(line, 'responsibleUserId', 'ResponsibleUserId');
        const responsibleUserName =
          this.value<string | null>(line, 'responsibleUserName', 'ResponsibleUserName') ?? null;
        const key = responsibleUserId || responsibleUserName || 'unknown';
        const itemsCount = this.number(line, 'itemsCount', 'ItemsCount');
        const totalAmount = this.number(line, 'totalAmount', 'TotalAmount');
        const row =
          mapByUser.get(key) ??
          ({
            responsibleUserId: key,
            responsibleUserName,
            enterTicketsCount: 0,
            exceedTransactionsCount: 0,
            totalItemsCount: 0,
            enterTicketsAmount: 0,
            exceedAmount: 0,
            totalAmount: 0,
          } satisfies SupervisorTicketCollectorSummary);

        if (isEnter) {
          row.enterTicketsCount += itemsCount;
          row.enterTicketsAmount += totalAmount;
        }

        if (isExceed) {
          row.exceedTransactionsCount += itemsCount;
          row.exceedAmount += totalAmount;
        }

        row.totalItemsCount += itemsCount;
        row.totalAmount += totalAmount;
        mapByUser.set(key, row);
      });
    });

    return Array.from(mapByUser.values());
  }

  private isTransactionType(transaction: any, id: number, name: string): boolean {
    return (
      this.number(transaction, 'transactionTypeId', 'TransactionTypeId') === id ||
      this.string(transaction, 'transactionType', 'TransactionType').toLowerCase() ===
        name.toLowerCase()
    );
  }

  private transactionTickets(transaction: any): any[] {
    const tickets = this.value<any[]>(transaction, 'tickets', 'Tickets');
    return Array.isArray(tickets) ? tickets : [];
  }

  private transactionLines(transaction: any): any[] {
    const lines = this.value<any[]>(transaction, 'lines', 'Lines');
    return Array.isArray(lines) ? lines : [];
  }

  private gateLabel(transaction: any, ticket: any, ...ticketKeys: string[]): string | number | null {
    const gateName = this.value<string | number | null>(transaction, 'gateName', 'GateName');
    if (gateName !== null && gateName !== undefined && String(gateName).trim()) return gateName;

    const ticketGate = this.value<string | number | null>(ticket, ...ticketKeys);
    if (ticketGate !== null && ticketGate !== undefined && String(ticketGate).trim()) return ticketGate;

    return null;
  }

  private sumBy<T extends Record<string, any>>(items: T[], key: keyof T): number {
    return items.reduce((total, item) => total + Number(item[key] ?? 0), 0);
  }

  private normalizeReportTicket(item: any): ReportTicketsResponse {
    return {
      ticketId: this.string(item, 'ticketId', 'TicketId', 'id', 'Id'),
      enterDate: this.string(item, 'enterDate', 'EnterDate', 'startDate', 'StartDate'),
      exitDate: this.value<string | null>(item, 'exitDate', 'ExitDate', 'endDate', 'EndDate') ?? null,
      vehicleNumber:
        this.value<string | null>(item, 'vehicleNumber', 'VehicleNumber', 'plate', 'Plate') ?? null,
      isSubscribed: this.boolean(item, 'isSubscribed', 'IsSubscribed', 'isSubscriber', 'IsSubscriber'),
      price: this.number(item, 'price', 'Price'),
      collectorName: this.string(item, 'collectorName', 'CollectorName'),
      ticketNumber: this.string(item, 'ticketNumber', 'TicketNumber'),
      exceedPrice: this.number(item, 'exceedPrice', 'ExceedPrice'),
      isInsideParking: this.boolean(item, 'isInsideParking', 'IsInsideParking'),
      ticketStatus: this.string(item, 'ticketStatus', 'TicketStatus'),
      createdByUserId: this.string(item, 'createdByUserId', 'CreatedByUserId'),
      createdByUserName: this.string(item, 'createdByUserName', 'CreatedByUserName'),
      entryGateNumber: this.nullableNumber(item, 'entryGateNumber', 'EntryGateNumber'),
      exitGateNumber: this.nullableNumber(item, 'exitGateNumber', 'ExitGateNumber'),
      attachments: this.attachments(item),
    };
  }

  private attachments(item: any): ReportTicketsResponse['attachments'] {
    const value = this.value<any[]>(item, 'attachments', 'Attachments');
    return Array.isArray(value) ? value : [];
  }

  private string(source: any, ...keys: string[]): string {
    return String(this.value(source, ...keys) ?? '');
  }

  private number(source: any, ...keys: string[]): number {
    return Number(this.value(source, ...keys) ?? 0);
  }

  private nullableNumber(source: any, ...keys: string[]): number | null {
    const value = this.value(source, ...keys);
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    return Number.isNaN(num) ? null : num;
  }

  private boolean(source: any, ...keys: string[]): boolean {
    const value = this.value(source, ...keys);
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private value<T = any>(source: any, ...keys: string[]): T | undefined {
    for (const key of keys) {
      if (source?.[key] !== undefined) return source[key] as T;
    }
    return undefined;
  }
}
