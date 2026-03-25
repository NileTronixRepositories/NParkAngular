import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../Shared/environment/environment';

@Injectable({
  providedIn: 'root',
})
export class LocalHealthService {
  private readonly http = inject(HttpClient);
  private readonly healthUrl = `${environment.baseUrl}/Health`;

  checkPcHealth(): Observable<boolean> {
    return this.http.get(this.healthUrl, { responseType: 'text' }).pipe(
      map(() => true),
      catchError((err) => {
        return of(false);
      }),
    );
  }
}
