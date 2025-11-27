import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import { GateDto, GateType } from '../../Domain/Auth/auth.models';



@Injectable({ providedIn: 'root' })
export class GateServices {
  private http = inject(HttpClient);
  private base = environment.baseUrl;

  getAll(): Observable<GateDto[]> {
    return this.http.get<GateDto[]>(`${this.base}/Gate/GetAll`);
  }
}
