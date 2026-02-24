import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import {
  SanctionDto,
  SanctionAddDto,
  SanctionUpdateDto,
} from '../../Domain/Sanction/sanction.models';

@Injectable({ providedIn: 'root' })
export class SanctionService {
  private base = `${environment.baseUrl}/Sanction`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<SanctionDto[]> {
    return this.http.get<SanctionDto[]>(`${this.base}/GetAll`);
  }

  getById(id: string): Observable<SanctionDto> {
    return this.http.get<SanctionDto>(`${this.base}/GetById/${encodeURIComponent(id)}`);
  }

  add(dto: SanctionAddDto): Observable<any> {
    return this.http.post(`${this.base}/Add`, dto);
  }

  update(dto: SanctionUpdateDto): Observable<any> {
    return this.http.put(`${this.base}/Update`, dto);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.base}/Delete/${encodeURIComponent(id)}`);
  }
}
