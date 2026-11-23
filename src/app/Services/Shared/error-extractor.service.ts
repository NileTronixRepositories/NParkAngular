import { HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ErrorExtractorService {
  extractErrorMessage(err: any, fallback?: string): string {
    if (!err) return fallback || '';

    let raw = err?.error ?? err;

    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (!trimmed) return fallback || '';
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          raw = JSON.parse(trimmed);
        } catch {
          return trimmed;
        }
      } else {
        return trimmed;
      }
    }

    if (!raw || typeof raw !== 'object') {
      return fallback || '';
    }

    const messages: string[] = [];

    // 1) Extract detailed errors array / validation dictionary from ProblemDetails (BuildingBlock.Api)
    const errors = raw.errors ?? raw.Errors;
    if (errors) {
      if (Array.isArray(errors)) {
        for (const e of errors) {
          if (!e) continue;
          if (typeof e === 'string' && e.trim()) {
            messages.push(e.trim());
          } else if (typeof e === 'object') {
            const m =
              e.message ??
              e.Message ??
              e.description ??
              e.Description ??
              e.error ??
              e.Error ??
              e.title ??
              e.Title;
            if (typeof m === 'string' && m.trim()) {
              messages.push(m.trim());
            }
          }
        }
      } else if (typeof errors === 'object') {
        for (const key of Object.keys(errors)) {
          const fieldErrors = errors[key];
          if (Array.isArray(fieldErrors)) {
            for (const msg of fieldErrors) {
              if (typeof msg === 'string' && msg.trim()) {
                messages.push(msg.trim());
              }
            }
          } else if (typeof fieldErrors === 'string' && fieldErrors.trim()) {
            messages.push(fieldErrors.trim());
          }
        }
      }
    }

    // 2) Extract ProblemDetails.detail (primary.Message from BuildingBlock.Api)
    const detail = raw.detail ?? raw.Detail;
    if (typeof detail === 'string' && detail.trim()) {
      messages.unshift(detail.trim());
    }

    if (messages.length > 0) {
      return Array.from(new Set(messages)).join('\n');
    }

    // 3) Fallback to top-level message/error/description/title
    const possibleKeys = [
      'message',
      'Message',
      'error',
      'Error',
      'description',
      'Description',
      'title',
      'Title',
    ];
    for (const key of possibleKeys) {
      const val = raw[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }

    return fallback || '';
  }

  extractSuccessMessage(res: any, fallback?: string): string {
    if (res == null) return fallback || '';

    const payload = res instanceof HttpResponse ? res.body : res;
    if (payload == null) return fallback || '';

    if (typeof payload === 'string') {
      const trimmed = payload.trim();
      return trimmed || fallback || '';
    }

    if (typeof payload === 'object') {
      const possibleKeys = [
        'message',
        'Message',
        'detail',
        'Detail',
        'description',
        'Description',
        'title',
        'Title',
      ];
      for (const key of possibleKeys) {
        const val = (payload as any)[key];
        if (typeof val === 'string' && val.trim()) {
          return val.trim();
        }
      }
    }

    return fallback || '';
  }
}
