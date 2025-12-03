import {
  Component,
  Inject,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { GateDevicePeripheral } from '../../../Domain/Auth/auth.models';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../../Services/i18n/i18n.tokens';
import { LanguageService } from '../../../Services/i18n/language-service';
import { TicketsServices } from '../../../Services/Tickets/tickets-services';
import { ToastServices } from '../../../Services/Toster/toast-services';
import { TicketDto } from '../../../Domain/tickets/tickets.model';

@Component({
  selector: 'app-exit-gate-devices-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './exit-gate-devices-block-component.html',
  styleUrl: './exit-gate-devices-block-component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExitGateDevicesBlockComponent {
  @Input() gatePeripheral: GateDevicePeripheral | null = null;
  @Output() ticketSelected = new EventEmitter<TicketDto>();

  // Manual plate capture
  manualPlate = '';
  manualPlateSubmitting = false;

  // Ticket number search
  ticketNumber = '';
  searchingTicket = false;
  @Output() searchTicketNumber = new EventEmitter<string>();

  constructor(
    public lang: LanguageService,
    @Inject(I18N_DICT) private readonly dict: I18nDict,
    private readonly ticketsSvc: TicketsServices,
    private readonly toast: ToastServices
  ) {}

  t(key: string): string {
    return this.dict[this.lang.current]?.[key] ?? key;
  }

  get canSubmitManualPlate(): boolean {
    return !!this.manualPlate?.trim() && !this.manualPlateSubmitting;
  }

  get canSearchTicket(): boolean {
    return !!this.ticketNumber?.trim() && !this.searchingTicket;
  }

  submitManualPlate(): void {
    const plate = this.manualPlate?.trim();
    if (!plate || this.manualPlateSubmitting) return;

    this.manualPlateSubmitting = true;

    this.ticketsSvc.captureManualPlate(plate).subscribe({
      next: (_ok) => {
        this.toast.success(this.t('send_manual_plate'));
        this.manualPlate = '';
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

  searchTicketByNumber(): void {
    const number = this.ticketNumber?.trim();
    if (!number || this.searchingTicket) return;

    this.searchingTicket = true;
    this.searchTicketNumber.emit(number);

    setTimeout(() => {
      this.searchingTicket = false;
    }, 1000);
  }
}
