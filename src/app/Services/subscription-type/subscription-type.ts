import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  DurationType,
  CreateEnterPricingSchemaRequest,
  CreateEnterPricingSchemaResponse,
  PricingSchemaAddDto,
  PricingSchemaUpdateRequest,
  PricingSchemaUpdateDto,
  PricingSchemaRow,
} from '../../Domain/Subscription-type/subscription-type.models';
import { PagedResult } from '../../Domain/PageResult/PagedResult';

type ApiListResponse<T> = T[] | { items: T[] } | { data: T[] };

@Injectable({ providedIn: 'root' })
export class SubscriptionType {
  private base = `${environment.baseUrl}/PricingSchema`;

  constructor(private http: HttpClient) {}

  list(page = 1, pageSize = 10, q = ''): Observable<PagedResult<PricingSchemaRow>> {
    let params = new HttpParams()
      .set('PageNumber', String(page))
      .set('PageSize', String(pageSize));

    const searchText = (q ?? '').trim();
    if (searchText) {
      params = params.set('SearchText', searchText);
    }

    return this.http
      .get<ApiListResponse<PricingSchemaRow> | any>(`${this.base}/GetAll`, {
        params,
        headers: { 'Cache-Control': 'no-cache' },
      })
      .pipe(
        map((res: any) => {
          const data: PricingSchemaRow[] = (res?.data ?? res?.items ?? res ?? []).map(
            (item: any) => this.normalizeRow(item),
          );
          return {
            currentPage: res?.currentPage ?? page,
            pageSize: res?.pageSize ?? pageSize,
            totalPages: res?.totalPages ?? 1,
            totalItems: res?.totalItems ?? data.length ?? 0,
            data,
            hasPreviousPage: !!res?.hasPreviousPage,
            hasNextPage: !!res?.hasNextPage,
          } as PagedResult<PricingSchemaRow>;
        }),
      );
  }

  private toHms(t?: string | null): string | null {
    if (!t) return null;
    if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
    return null;
  }
  private static DAY_DEFAULT = '00:00:00';
  private static DAY_END = '23:59:59';

  add(dto: PricingSchemaAddDto) {
    const isHours = dto.durationType === DurationType.Hours;
    const isDays = dto.durationType === DurationType.Days;
    const repeated = isHours ? !!dto.isRepeated : false;

    const payload: PricingSchemaAddDto = {
      name: (dto.name ?? '').trim(),
      durationType: dto.durationType,
      startTime: isHours
        ? repeated
          ? null
          : this.toHms(dto.startTime)
        : SubscriptionType.DAY_DEFAULT,
      endTime: isHours ? (repeated ? null : this.toHms(dto.endTime)) : SubscriptionType.DAY_END,
      price: Number(dto.price ?? 0),
      isRepeated: isHours ? repeated : false,
      totalHours: isHours ? Number(dto.totalHours ?? 0) : null,
      totalDays: isDays ? Number(dto.totalDays ?? 0) : null,
    };

    return this.http.post<PricingSchemaRow>(`${this.base}/Add`, payload);
  }

  update(dto: PricingSchemaUpdateRequest) {
    if (dto.isEnterPriceSchema === true) {
      const payload = {
        id: dto.id,
        name: (dto.name ?? '').trim(),
        price: Number(dto.price ?? 0),
        isEnterPriceSchema: true,
      };

      return this.http.put<PricingSchemaRow>(`${this.base}/Update`, payload);
    }

    const isHours = dto.durationType === DurationType.Hours;
    const isDays = dto.durationType === DurationType.Days;
    const repeated = isHours ? !!dto.isRepeated : false;

    const payload: PricingSchemaUpdateDto = {
      id: dto.id,
      name: (dto.name ?? '').trim(),
      durationType: dto.durationType,
      startTime: isHours
        ? repeated
          ? null
          : this.toHms(dto.startTime)
        : SubscriptionType.DAY_DEFAULT,
      endTime: isHours ? (repeated ? null : this.toHms(dto.endTime)) : SubscriptionType.DAY_END,
      price: Number(dto.price ?? 0),
      isRepeated: isHours ? repeated : false,
      totalHours: isHours ? Number(dto.totalHours ?? 0) : null,
      totalDays: isDays ? Number(dto.totalDays ?? 0) : null,
      isEnterPriceSchema: false,
    };

    return this.http.put<PricingSchemaRow>(`${this.base}/Update`, payload);
  }

  createEnterPriceSchema(
    request: CreateEnterPricingSchemaRequest,
  ): Observable<CreateEnterPricingSchemaResponse> {
    const payload: CreateEnterPricingSchemaRequest = {
      name: (request.name ?? '').trim(),
      salary: Number(request.salary ?? 0),
    };

    return this.http
      .post<CreateEnterPricingSchemaResponse>(
        `${this.base}/create-enter-pricing-schema`,
        payload,
      )
      .pipe(map((res: any) => this.normalizeEnterResponse(res)));
  }

  private normalizeRow(row: any): PricingSchemaRow {
    return {
      id: row?.id ?? row?.Id ?? '',
      name: row?.name ?? row?.Name ?? '',
      durationType: row?.durationType ?? row?.DurationType ?? DurationType.Days,
      startTime: row?.startTime ?? row?.StartTime ?? null,
      endTime: row?.endTime ?? row?.EndTime ?? null,
      price: Number(row?.price ?? row?.Price ?? row?.salary ?? row?.Salary ?? 0),
      isRepeated: !!(row?.isRepeated ?? row?.IsRepeated),
      totalDays: row?.totalDays ?? row?.TotalDays ?? null,
      totalHours: row?.totalHours ?? row?.TotalHours ?? null,
      isEnterPriceSchema: !!(row?.isEnterPriceSchema ?? row?.IsEnterPriceSchema),
    };
  }

  private normalizeEnterResponse(res: any): CreateEnterPricingSchemaResponse {
    return {
      id: res?.id ?? res?.Id ?? '',
      name: res?.name ?? res?.Name ?? '',
      salary: Number(res?.salary ?? res?.Salary ?? 0),
      isEnterPriceSchema: !!(res?.isEnterPriceSchema ?? res?.IsEnterPriceSchema),
    };
  }

  delete(id: string): Observable<void> {
    const sid = String(id).trim();
    return this.http.delete<void>(`${this.base}/Delete`, {
      params: new HttpParams().set('Id', sid),
    });
  }
}
