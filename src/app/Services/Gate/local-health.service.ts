import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../Shared/environment/environment';
import { SKIP_ERROR_TOAST } from '../../interceptors/Auth/error.interceptor';

@Injectable({
  providedIn: 'root',
})
export class LocalHealthService {
  private readonly http = inject(HttpClient);
  private readonly healthUrl = `${environment.baseUrl}/Health`;

  checkPcHealth(): Observable<boolean> {
    return this.http
      .get(this.healthUrl, {
        responseType: 'text',
        context: new HttpContext().set(SKIP_ERROR_TOAST, true),
      })
      .pipe(
        map(() => true),
        catchError(() => of(false)),
      );
  }
}
