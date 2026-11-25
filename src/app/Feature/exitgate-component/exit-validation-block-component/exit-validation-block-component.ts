import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CalculateSalaryResponse,
  ExitEligibility,
  ExitEligibilityFailure,
  ValidateExitByTextResponse,
  ValidateExitByVehicleNumberResponse,
} from '../../../Domain/tickets/tickets.model';
import { GateOperationResponse } from '../../../Domain/Gate/gate-operation.models';
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
export class ExitValidationBlockComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() detectedVehicleNumber: string = '';
  @Input() lprListening: boolean = false;
  @Input() lprError: string | null = null;
  @Input() vehicleValidationLoading: boolean = false;
  @Input() textValidationLoading: boolean = false;
  @Input() openGateLoading: boolean = false;
  @Input() gateConnectionReady: boolean = false;
  @Input() vehicleResult: ValidateExitByVehicleNumberResponse | null = null;
  @Input() textResult: ValidateExitByTextResponse | null = null;
  @Input() validationMessage: string | null = null;
  @Input() validationError: string | null = null;
  @Input() clearTextNonce: number = 0;
  @Input() focusTextNonce: number = 0;
  @Input() setTextNonce: number = 0;
  @Input() textValue: string = '';
  @Input() calculatedFee: number | null = null;
  @Input() awaitingCollection: boolean = false;
  @Input() collectingAndExiting: boolean = false;
  @Input() eligibility: ExitEligibility | null = null;
  @Input() salaryBreakdown: CalculateSalaryResponse | null = null;
  @Input() activeOperation: GateOperationResponse | null = null;
  @Input() isSupervisor: boolean = false;

  @Output() validateText = new EventEmitter<string>();
  @Output() confirmExit = new EventEmitter<string>();
  @Output() collectAndExit = new EventEmitter<string>();
  @Output() retryOperation = new EventEmitter<string>();
  @Output() refreshOperation = new EventEmitter<string>();

  @ViewChild('manualTextArea') manualTextArea?: ElementRef<HTMLTextAreaElement>;

  manualText = '';
  submittedText = '';
  textFieldError: string | null = null;
  private lastSubmittedText = '';
  private autoSubmitTimer?: ReturnType<typeof setTimeout>;
  private suppressScannerFocusUntil = 0;
  private readonly scannerFocusStopSelector = '[data-scanner-focus-stop="true"]';
  private readonly lang = inject(LanguageService);
  private readonly dict = inject(I18N_DICT);
  private readonly localFallback: Record<string, string> = {
    listening: 'Listening',
    waiting_lpr_vehicle: 'Waiting for LPR vehicle...',
  };

  t(key: string): string {
    return this.lang.translate(this.dict as any, key, this.localFallback[key]);
  }

  onValidateText(): void {
    this.clearAutoSubmitTimer();
    const text = this.normalizeScanText(this.manualText);

    if (!text) {
      this.textFieldError = this.t('text_required');
      return;
    }

    this.textFieldError = null;
    this.lastSubmittedText = text;
    this.submittedText = text;
    this.validateText.emit(text);
    this.manualText = '';
    this.focusTextArea();
  }

  onTextEnter(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.onValidateText();
  }

  onTextBlur(event: FocusEvent): void {
    const nextTarget = event.relatedTarget as HTMLElement | null;
    if (this.isTextDisabled || this.shouldKeepCurrentFocus(nextTarget)) return;
    this.focusTextArea(true);
  }

  onManualTextChange(value: string): void {
    let next = this.normalizeScanText(value);

    if (
      this.lastSubmittedText &&
      next.startsWith(this.lastSubmittedText) &&
      next.length > this.lastSubmittedText.length &&
      !this.isLoading
    ) {
      next = this.normalizeScanText(next.slice(this.lastSubmittedText.length));
      this.lastSubmittedText = '';
    }

    this.manualText = next;
    this.textFieldError = null;
    this.scheduleAutoSubmit();
  }

  get anyResult(): any {
    return this.vehicleResult || this.textResult;
  }

  get isLoading(): boolean {
    return this.vehicleValidationLoading || this.textValidationLoading || this.openGateLoading;
  }

  get isTextDisabled(): boolean {
    return false;
  }

  get isTextSubmitDisabled(): boolean {
    return this.isTextDisabled || !this.gateConnectionReady || !this.manualText.trim();
  }

  get isValid(): boolean {
    return this.anyResult?.isValidForExit ?? false;
  }

  get hasResult(): boolean {
    return !!this.anyResult;
  }

  get failureReasons(): ExitEligibilityFailure[] {
    return this.eligibility?.failureReasons ?? this.anyResult?.failureReasons ?? [];
  }

  get baseFeeAmount(): number | null {
    if (this.salaryBreakdown) return this.salaryBreakdown.basePrice;
    if (this.eligibility) return this.eligibility.basePrice;
    return this.calculatedFee;
  }

  get exceedFeeAmount(): number {
    return this.salaryBreakdown?.exceedPrice ?? this.eligibility?.exceedPrice ?? 0;
  }

  get paidAmountValue(): number {
    return this.salaryBreakdown?.paidAmount ?? this.eligibility?.paidAmount ?? 0;
  }

  get outstandingAmountValue(): number {
    return this.salaryBreakdown?.outstandingAmount ?? this.eligibility?.outstandingAmount ?? 0;
  }

  get requiredOvernightAmountValue(): number {
    return (
      this.salaryBreakdown?.requiredOvernightAmount ??
      this.eligibility?.requiredOvernightAmount ??
      0
    );
  }

  get validExitDateValue(): string | null {
    return (
      this.salaryBreakdown?.validExitDate ||
      this.eligibility?.validExitDate ||
      this.anyResult?.validExitDate ||
      null
    );
  }

  get operationStatusLabelKey(): string {
    switch (this.activeOperation?.status) {
      case 'Pending':
      case 'Published':
        return 'waiting_gate_confirmation';
      case 'Acknowledged':
        return 'completing_ticket_archive';
      case 'Completed':
        return 'exit_completed';
      case 'Failed':
        return 'gate_execution_failed';
      case 'TimedOut':
        return 'gate_execution_timed_out';
      case 'Unknown':
        return 'gate_execution_unknown';
      default:
        return '';
    }
  }

  get isTerminalFailedOperation(): boolean {
    const status = this.activeOperation?.status;
    return status === 'Failed' || status === 'TimedOut';
  }

  get canRetryNewExit(): boolean {
    return this.isTerminalFailedOperation && !!(this.activeOperation?.ticketId || this.anyResult?.ticketId);
  }

  onRetryOperation(): void {
    if (this.activeOperation?.operationId && !this.openGateLoading && this.gateConnectionReady) {
      this.retryOperation.emit(this.activeOperation.operationId);
    }
  }

  onRefreshOperation(): void {
    if (this.activeOperation?.operationId) {
      this.refreshOperation.emit(this.activeOperation.operationId);
    }
  }

  onConfirm(): void {
    const ticketId = this.anyResult?.ticketId;
    if (ticketId) {
      this.confirmExit.emit(ticketId);
    }
  }

  onCollectAndExit(): void {
    const ticketId = this.anyResult?.ticketId;
    if (ticketId && !this.collectingAndExiting && !this.openGateLoading && this.gateConnectionReady) {
      this.collectAndExit.emit(ticketId);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['setTextNonce'] && !changes['setTextNonce'].firstChange) {
      this.manualText = this.normalizeScanText(this.textValue);
      this.textFieldError = null;
      this.lastSubmittedText = '';
      this.focusTextArea(true, true);
      this.scheduleAutoSubmit(80);
    }

    if (changes['clearTextNonce'] && !changes['clearTextNonce'].firstChange) {
      this.clearAutoSubmitTimer();
      this.manualText = '';
      this.textFieldError = null;
      this.lastSubmittedText = '';
    }

    if (changes['focusTextNonce'] && !changes['focusTextNonce'].firstChange) {
      this.focusTextArea(true, true);
    }
  }

  ngAfterViewInit(): void {
    this.focusTextArea(false, true);
  }

  ngOnDestroy(): void {
    this.clearAutoSubmitTimer();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const textArea = this.manualTextArea?.nativeElement;

    if (this.isScannerFocusStopTarget(target)) {
      this.suppressScannerFocusUntil = Date.now() + 4000;
      this.clearAutoSubmitTimer();
      return;
    }

    this.suppressScannerFocusUntil = 0;

    if (target && textArea && target !== textArea && this.isEditableTarget(target)) {
      this.suppressScannerFocusUntil = Date.now() + 600;
      this.clearAutoSubmitTimer();
      return;
    }

    if (target && textArea && target !== textArea) {
      this.focusTextArea(false, true);
    }
  }

  @HostListener('document:focusout', ['$event'])
  onDocumentFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement | null;
    if (!this.isScannerFocusStopTarget(target)) return;

    setTimeout(() => {
      if (this.isTextDisabled || this.isScannerFocusStopTarget(document.activeElement)) return;

      this.suppressScannerFocusUntil = 0;
      this.focusTextArea(false, true);
    }, 0);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.altKey || event.metaKey) return;

    const textArea = this.manualTextArea?.nativeElement;
    if (!textArea || document.activeElement === textArea) return;
    if (Date.now() < this.suppressScannerFocusUntil) return;
    if (this.isEditableTarget(document.activeElement)) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.focusTextArea(true, true);
      this.onValidateText();
      return;
    }

    if (event.key.length !== 1) return;

    event.preventDefault();
    this.manualText = event.key;
    this.textFieldError = null;
    this.lastSubmittedText = '';
    this.focusTextArea();
    this.scheduleAutoSubmit();
  }

  private scheduleAutoSubmit(delayMs = 900): void {
    this.clearAutoSubmitTimer();

    if (!this.manualText.trim()) return;

    this.autoSubmitTimer = setTimeout(() => {
      this.onValidateText();
    }, delayMs);
  }

  private clearAutoSubmitTimer(): void {
    if (!this.autoSubmitTimer) return;
    clearTimeout(this.autoSubmitTimer);
    this.autoSubmitTimer = undefined;
  }

  private focusTextArea(selectAll = false, force = false): void {
    setTimeout(() => {
      const el = this.manualTextArea?.nativeElement;
      if (!el || el.disabled) return;
      if (!force && this.shouldKeepCurrentFocus(document.activeElement)) return;
      el.focus();
      if (selectAll) {
        el.select();
      }
    }, 0);
  }

  private shouldKeepCurrentFocus(target: Element | null): boolean {
    return Date.now() < this.suppressScannerFocusUntil || this.isEditableTarget(target);
  }

  private isScannerFocusStopTarget(target: EventTarget | Element | null): boolean {
    return target instanceof HTMLElement && !!target.closest(this.scannerFocusStopSelector);
  }

  private isEditableTarget(target: EventTarget | Element | null): boolean {
    if (!(target instanceof HTMLElement)) return false;

    const textArea = this.manualTextArea?.nativeElement;
    if (textArea && target === textArea) return false;

    return !!target.closest(
      'input, select, textarea, button, a[href], [contenteditable="true"], [tabindex]:not([tabindex="-1"])',
    );
  }

  private normalizeScanText(value: string): string {
    let text = String(value ?? '').replace(/[\r\n]+/g, '').trim();

    const lastExcelQuoteStart = text.lastIndexOf('="');
    if (lastExcelQuoteStart > 0 && lastExcelQuoteStart < text.length - 2) {
      text = text.slice(lastExcelQuoteStart + 2).trim();
    }

    const lastQuote = text.lastIndexOf('"');
    if (lastQuote > 0 && lastQuote < text.length - 1) {
      text = text.slice(lastQuote + 1).trim();
    }

    if (text.startsWith('=')) {
      text = text.slice(1).trim();
    }

    text = text.replace(/["'\u201c\u201d\u00ab\u00bb]/g, '').trim();

    text = text.replace(/^[\s"'“”«»]+/, '').replace(/[\s"'“”«»]+$/, '').trim();

    let changed = true;
    while (changed && text.length >= 2) {
      changed = false;
      const first = text.charAt(0);
      const last = text.charAt(text.length - 1);
      if (
        (first === '"' && last === '"') ||
        (first === "'" && last === "'") ||
        (first === '“' && last === '”') ||
        (first === '«' && last === '»')
      ) {
        text = text.slice(1, -1).trim();
        changed = true;
      }
    }

    return text;
  }
}
