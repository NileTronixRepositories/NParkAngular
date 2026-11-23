import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastItem, ToastServices, ToastTone } from '../../Services/Toster/toast-services';
import { LanguageService } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-toaster-host-component',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toaster-host-component.html',
  styleUrl: './toaster-host-component.css',
})
export class ToasterHostComponent {
  readonly toastService = inject(ToastServices);
  readonly lang = inject(LanguageService);

  trackById(_index: number, item: ToastItem): number {
    return item.id;
  }

  iconClass(tone: ToastTone): string {
    switch (tone) {
      case 'success':
        return 'fa-solid fa-circle-check';
      case 'error':
        return 'fa-solid fa-circle-exclamation';
      case 'warn':
        return 'fa-solid fa-triangle-exclamation';
      default:
        return 'fa-solid fa-circle-info';
    }
  }
}
