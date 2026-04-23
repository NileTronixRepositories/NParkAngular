import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../Shared/environment/environment';

export interface LocalPrintJobRequest {
  printerName: string;
  htmlContent: string;
  jobName: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocalPrintService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.printBaseUrl;

  printHtml(job: LocalPrintJobRequest): Observable<boolean> {
    return this.http.post<any>(`${this.baseUrl}/Print/html`, job).pipe(
      map(() => true),
      catchError((err) => {
        console.error('[LocalPrintService] printHtml failed', err);
        return throwError(() => err);
      }),
    );
  }
}
