import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
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
    return this.http.post<CreateTicketExceedTransactionResponse>(`${this.base}/Create`, request);
  }
}
