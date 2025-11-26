import { Component, EventEmitter, inject, Inject, Input, Output } from '@angular/core';
import { GateDevicePeripheral } from '../../../Domain/Auth/auth.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../../Services/i18n/i18n.tokens';
import { LanguageService } from '../../../Services/i18n/language-service';
import { TicketsServices } from '../../../Services/Tickets/tickets-services';
import { ToastServices } from '../../../Services/Toster/toast-services';

@Component({
  selector: 'app-exit-gate-devices-block-component',
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './exit-gate-devices-block-component.html',
  styleUrl: './exit-gate-devices-block-component.css',
})
export class ExitGateDevicesBlockComponent {
  @Input() gatePeripheral: GateDevicePeripheral | null = null;

  manualPlate = '';
  manualPlateSubmitting = false;

  private ticketsSvc = inject(TicketsServices);
  private toast = inject(ToastServices);

  constructor(public lang: LanguageService, @Inject(I18N_DICT) private dict: I18nDict) {}

  t(key: string) {
    return this.dict[this.lang.current]?.[key] ?? key;
  }

  submitManualPlate() {
    const plate = this.manualPlate?.trim();
    if (!plate) return;

    this.manualPlateSubmitting = true;

    this.ticketsSvc.captureManualPlate(plate).subscribe({
      next: (ok) => {
        if (ok) {
          this.toast.success(this.t('send_manual_plate'));
          this.manualPlate = '';
        } else {
          this.toast.error('تعذر تسجيل المركبة يدويًا');
        }
      },
      error: (err) => {
        console.error('submitManualPlate error', err);
        this.toast.fromProblem(err);
      },
      complete: () => {
        this.manualPlateSubmitting = false;
      },
    });
  }
}
