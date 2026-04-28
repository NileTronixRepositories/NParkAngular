import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  CollectExceedTransactionDetail,
  CollectExceedTransactionsResponse,
  CreateTicketExceedTransactionRequest,
  CreateTicketExceedTransactionResponse,
} from '../../Domain/TicketExceedTransaction/ticket-exceed-transaction.models';

@Injectable({ providedIn: 'root' })
export class TicketExceedTransactionService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/TicketExceedTransaction`;

  create(
    request: CreateTicketExceedTransactionRequest,
  ): Observable<CreateTicketExceedTransactionResponse> {
    return this.http.post<CreateTicketExceedTransactionResponse>(`${this.base}/Create`, request).pipe(
      map((res) => this.normalizeResponse(res)),
    );
  }

  collectExceedTransactions(): Observable<CollectExceedTransactionsResponse> {
    return this.http
      .post<any>(`${this.base}/collect-exceed-transactions`, {})
      .pipe(map((res) => this.normalizeCollectResponse(res)));
  }

  private normalizeResponse(res: any): CreateTicketExceedTransactionResponse {
    return {
      ticketExceedTransactionId:
        res?.ticketExceedTransactionId ?? res?.TicketExceedTransactionId ?? '',
      ticketId: res?.ticketId ?? res?.TicketId ?? '',
      exceedAmount: Number(res?.exceedAmount ?? res?.ExceedAmount ?? 0),
      ticketPrice: Number(res?.ticketPrice ?? res?.TicketPrice ?? 0),
      totalPriceAfterExceed: Number(
        res?.totalPriceAfterExceed ?? res?.TotalPriceAfterExceed ?? 0,
      ),
      gateId: res?.gateId ?? res?.GateId ?? '',
      userCollectId: res?.userCollectId ?? res?.UserCollectId ?? '',
      superVisorCollectorId: res?.superVisorCollectorId ?? res?.SuperVisorCollectorId ?? null,
      sanctionIds: res?.sanctionIds ?? res?.SanctionIds ?? [],
      createdAt: res?.createdAt ?? res?.CreatedAt ?? '',
    };
  }

  private normalizeCollectResponse(res: any): CollectExceedTransactionsResponse {
    const details = res?.ticketExceedCollectDetails ?? res?.TicketExceedCollectDetails ?? [];

    return {
      totalExceedAmountCollected: Number(
        res?.totalExceedAmountCollected ?? res?.TotalExceedAmountCollected ?? 0,
      ),
      totalTransactionsCollected: Number(
        res?.totalTransactionsCollected ?? res?.TotalTransactionsCollected ?? 0,
      ),
      ticketExceedCollectDetails: Array.isArray(details)
        ? details.map((item) => this.normalizeCollectDetail(item))
        : [],
    };
  }

  private normalizeCollectDetail(item: any): CollectExceedTransactionDetail {
    return {
      transactionId: item?.transactionId ?? item?.TransactionId ?? '',
      ticketIdSnapshot: item?.ticketIdSnapshot ?? item?.TicketIdSnapshot ?? '',
      ticketUniqueCode: item?.ticketUniqueCode ?? item?.TicketUniqueCode ?? '',
      transactionCreatedAt: item?.transactionCreatedAt ?? item?.TransactionCreatedAt ?? '',
      supervisorCollectedAt: item?.supervisorCollectedAt ?? item?.SupervisorCollectedAt ?? '',
      ticketPrice: Number(item?.ticketPrice ?? item?.TicketPrice ?? 0),
      ticketOldExceedPrice: Number(
        item?.ticketOldExceedPrice ?? item?.TicketOldExceedPrice ?? 0,
      ),
      exceedAmount: Number(item?.exceedAmount ?? item?.ExceedAmount ?? 0),
      totalPriceAfterExceed: Number(
        item?.totalPriceAfterExceed ?? item?.TotalPriceAfterExceed ?? 0,
      ),
      vehicleNumber: item?.vehicleNumber ?? item?.VehicleNumber ?? null,
      cardNumber: item?.cardNumber ?? item?.CardNumber ?? null,
      isSubscriber: !!(item?.isSubscriber ?? item?.IsSubscriber),
    };
  }
}
