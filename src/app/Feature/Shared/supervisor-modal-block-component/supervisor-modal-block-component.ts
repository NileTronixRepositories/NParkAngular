import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LanguageService } from '../../../Services/i18n/language-service';

@Component({
  selector: 'app-supervisor-modal-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervisor-modal-block-component.html',
  styleUrl: './supervisor-modal-block-component.css',
})
export class SupervisorModalBlockComponent {
  private readonly i18n = inject(LanguageService);

  @Input() show = false;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() username = '';
  @Input() password = '';

  @Output() usernameChange = new EventEmitter<string>();
  @Output() passwordChange = new EventEmitter<string>();
  @Output() submit = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  t(key: string): string {
    // This assumes the parent passes a translation function or we use a shared one.
    // For now, we'll use a simple fallback or the injected service if it has a t() method.
    // Based on the project patterns, we'll try to use the dictionary or just return the key.
    return (this as any).dict?.[this.i18n.current]?.[key] ?? key;
  }

  // Dictionary copied from parents for autonomy, or could be passed as input.
  private readonly dict: any = {
    ar: {
      supervisor_login: 'دخول المشرف',
      pleaseLoginToProceed: 'يرجى تسجيل الدخول كمشرف للمتابعة والتحصيل.',
      supervisor_username: 'اسم مستخدم المشرف',
      supervisor_password: 'كلمة مرور المشرف',
      confirm: 'تأكيد',
      cancel: 'إلغاء',
    },
    en: {
      supervisor_login: 'Supervisor Login',
      pleaseLoginToProceed: 'Please log in as a supervisor to proceed with collection.',
      supervisor_username: 'Supervisor Username',
      supervisor_password: 'Supervisor Password',
      confirm: 'Confirm',
      cancel: 'Cancel',
    },
  };

  onSubmit(): void {
    this.submit.emit();
  }

  onClose(): void {
    if (!this.loading) {
      this.close.emit();
    }
  }

  onUsernameChange(val: string): void {
    this.usernameChange.emit(val);
  }

  onPasswordChange(val: string): void {
    this.passwordChange.emit(val);
  }
}
