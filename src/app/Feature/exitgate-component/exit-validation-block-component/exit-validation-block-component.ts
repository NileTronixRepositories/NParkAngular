import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ValidateExitByTextResponse,
  ValidateExitByVehicleNumberResponse,
} from '../../../Domain/tickets/tickets.model';
import { TranslatePipePipe } from '../../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../../Services/i18n/i18n.tokens';
import { LanguageService } from '../../../Services/i18n/language-service';

@Component({
  selector: 'app-exit-validation-block-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './exit-validation-block-component.html',
  styleUrls: ['./exit-validation-block-component.css']
})
export class ExitValidationBlockComponent {
  @Input() detectedVehicleNumber: string = '';
  @Input() vehicleValidationLoading: boolean = false;
  @Input() textValidationLoading: boolean = false;
  @Input() vehicleResult: ValidateExitByVehicleNumberResponse | null = null;
  @Input() textResult: ValidateExitByTextResponse | null = null;
  @Input() validationMessage: string | null = null;
  @Input() validationError: string | null = null;

  @Output() validateText = new EventEmitter<string>();
  @Output() validateVehicle = new EventEmitter<string>();
  @Output() confirmExit = new EventEmitter<string>();

  manualText = '';
  private readonly lang = inject(LanguageService);
  private readonly dict = inject(I18N_DICT);

  t(key: string): string {
    return this.dict[this.lang.current]?.[key] ?? key;
  }

  onValidateText(): void {
    if (this.manualText.trim()) {
      this.validateText.emit(this.manualText.trim());
    }
  }

  onValidateVehicle(): void {
    if (this.detectedVehicleNumber.trim()) {
      this.validateVehicle.emit(this.detectedVehicleNumber.trim());
    }
  }

  get anyResult(): any {
    return this.vehicleResult || this.textResult;
  }

  get isLoading(): boolean {
    return this.vehicleValidationLoading || this.textValidationLoading;
  }

  get isValid(): boolean {
    return this.anyResult?.isValidForExit ?? false;
  }

  get hasResult(): boolean {
    return !!this.anyResult;
  }

  onConfirm(): void {
    const ticketId = this.anyResult?.ticketId;
    if (ticketId) {
      this.confirmExit.emit(ticketId);
    }
  }
}
