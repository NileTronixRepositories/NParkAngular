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

    if (typeof raw.detail === 'string' && raw.detail.trim()) {
      messages.push(raw.detail.trim());
    }
    const errors = raw.errors;
    if (errors) {
      if (Array.isArray(errors)) {
        for (const e of errors) {
          if (!e) continue;
          if (typeof e === 'string' && e.trim()) {
            messages.push(e.trim());
          } else if (typeof e === 'object') {
            const m = e.message || e.description || e.error || e.title;
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
          }
        }
      }
    }

    if (messages.length > 0) {
      return Array.from(new Set(messages)).join('\n');
    }

    const possibleKeys = ['message', 'Message', 'error', 'title', 'description'];
    for (const key of possibleKeys) {
      const val = raw[key];
      if (typeof val === 'string' && val.trim()) {
        return val.trim();
      }
    }

    return fallback || '';
  }

  extractSuccessMessage(res: any, fallback?: string): string {
    if (!res) return fallback || '';

    if (typeof res === 'string') return res;
    if (res.message) return res.message;
    if (res.detail) return res.detail;

    return fallback || '';
  }
}
