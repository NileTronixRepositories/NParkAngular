import { inject, Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root',
})
export class ToastServices {
  private toastr = inject(ToastrService);
  constructor() {}

  success(message: string, title: string = 'تم بنجاح') {
    this.toastr.success(message, title);
  }

  warn(message: string, title: string = 'تحذير') {
    this.toastr.warning(message, title);
  }

  error(message: string, title: string = 'خطأ') {
    this.toastr.error(message, title);
  }

  fromProblem(err: any) {
    try {
      const pd = err?.error;
      if (!pd) {
        this.error('Unexpected error occurred');
        return;
      }

      const title = pd.title || 'Error';
      const detail = pd.detail || pd.message || '';

      const errors = pd.errors;

      if (Array.isArray(errors) && errors.length) {
        for (const e of errors) {
          this.error(e.message || e.code || detail || title, title);
        }
        return;
      }

      if (errors && typeof errors === 'object') {
        for (const key of Object.keys(errors)) {
          const msgs = errors[key];
          if (Array.isArray(msgs)) {
            msgs.forEach((m: any) => this.error(m || detail || title, key));
          } else if (msgs) {
            this.error(msgs.toString(), key);
          }
        }
        return;
      }

      if (detail) {
        this.error(detail, title);
      } else {
        this.error(title);
      }
    } catch {
      this.error('Unknown error');
    }
  }
}
