import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  GateOperationListFilter,
  GateOperationResponse,
  OpenGateRequest,
  normalizeGateOperationResponse,
} from '../../Domain/Gate/gate-operation.models';

@Injectable({ providedIn: 'root' })
export class GateOperationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.baseUrl}/Gate`;

  openGate(request: OpenGateRequest): Observable<HttpResponse<GateOperationResponse>> {
    const body: Record<string, unknown> = {
      controllerId: String(request.controllerId).trim(),
      operationType: request.operationType,
    };
    if (request.ticketId) {
      body['ticketId'] = request.ticketId;
    }

    return this.http
      .post<any>(`${this.base}/open`, body, { observe: 'response' })
      .pipe(map((res) => this.normalizeHttpResponse(res)));
  }

  getOperation(operationId: string): Observable<HttpResponse<GateOperationResponse>> {
    return this.http
      .get<any>(`${this.base}/operations/${encodeURIComponent(operationId)}`, {
        observe: 'response',
      })
      .pipe(map((res) => this.normalizeHttpResponse(res)));
  }

  listOperations(filter: GateOperationListFilter = {}): Observable<GateOperationResponse[]> {
    let params = new HttpParams();
    if (filter.ticketId) {
      params = params.set('ticketId', filter.ticketId);
    }
    if (filter.controllerId != null && String(filter.controllerId).trim() !== '') {
      params = params.set('controllerId', String(filter.controllerId).trim());
    }
    if (filter.status) {
      params = params.set('status', filter.status);
    }

    return this.http
      .get<any[]>(`${this.base}/operations`, { params })
      .pipe(
        map((rows) =>
          Array.isArray(rows) ? rows.map((row) => normalizeGateOperationResponse(row)) : [],
        ),
      );
  }

  retryOperation(operationId: string): Observable<HttpResponse<GateOperationResponse>> {
    return this.http
      .post<any>(
        `${this.base}/operations/${encodeURIComponent(operationId)}/retry`,
        {},
        { observe: 'response' },
      )
      .pipe(
        map((res) => this.normalizeHttpResponse(res)),
        catchError((err) => {
          // HTTP 409 means retry is currently not permitted; fetch latest authoritative state
          if (err?.status === 409) {
            if (err?.error?.operationId || err?.error?.OperationId) {
              return this.getOperation(operationId).pipe(
                catchError(() => throwError(() => err)),
              );
            }
            return this.getOperation(operationId).pipe(
              catchError(() => throwError(() => err)),
            );
          }
          return throwError(() => err);
        }),
      );
  }

  reconcileNonExecution(
    operationId: string,
    evidence: string,
  ): Observable<GateOperationResponse> {
    const trimmed = String(evidence ?? '').trim();
    if (!trimmed) {
      return throwError(() => new Error('Reconciliation evidence is required.'));
    }
    if (trimmed.length > 500) {
      return throwError(() => new Error('Reconciliation evidence must be 500 characters or fewer.'));
    }

    return this.http
      .post<any>(
        `${this.base}/operations/${encodeURIComponent(operationId)}/reconcile-non-execution`,
        { evidence: trimmed },
      )
      .pipe(map((res) => normalizeGateOperationResponse(res)));
  }

  private normalizeHttpResponse(
    res: HttpResponse<any>,
  ): HttpResponse<GateOperationResponse> {
    const normalized = res.body ? normalizeGateOperationResponse(res.body) : null;
    return res.clone({ body: normalized as GateOperationResponse });
  }
}
