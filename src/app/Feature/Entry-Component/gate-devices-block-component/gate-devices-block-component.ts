import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SafePipe } from '../../../Pipes/safe.pipe';

import { GateDevicePeripheral } from '../../../Domain/Auth/auth.models';

type EntryPreviewFile = {
  name: string;
  url: string;
  safeUrl?: any;
  type: string;
  file: File;
};

@Component({
  selector: 'app-gate-devices-block-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './gate-devices-block-component.html',
  styleUrls: ['./gate-devices-block-component.css'],
})
export class GateDevicesBlockComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() gatePeripheral: GateDevicePeripheral | null = null;
  @Input() scannedFile: EntryPreviewFile | null = null;
  @Input() uploadedVehicleImages: EntryPreviewFile[] = [];
  @Input() selectedPreviewUrl: string | null = null;

  @Input() manualLprPlate: string = '';

  @Input() adding = false;
  @Input() cameraSnapshotLoading = false;
  @Input() cameraSnapshotDisabled = false;
  @Input() cameraSnapshotTitle = '';

  @Output() manualLprPlateChange = new EventEmitter<string>();
  @Output() manualLprPlateBlur = new EventEmitter<void>();

  @Output() createTicketWithPlate = new EventEmitter<string>();
  @Output() vehicleImagesSelected = new EventEmitter<FileList | null>();
  @Output() cameraSnapshotClick = new EventEmitter<void>();
  @Output() removeVehicleImage = new EventEmitter<number>();
  @Output() vehicleImagePreviewSelected = new EventEmitter<number>();

  @ViewChild('manualLprPlateArea') manualLprPlateArea?: ElementRef<HTMLTextAreaElement>;

  scannedPreviewOpen = false;

  private lastPlateKeyAt = 0;
  private scannerBurstBase = '';
  private scannerBurstChars = '';
  private scannerBurstStartedAt = 0;
  private scannerMode = false;
  private scannerBurstResetTimer?: ReturnType<typeof setTimeout>;
  private readonly scannerBurstIdleMs = 120;
  private readonly scannerDetectionChars = 5;
  private readonly scannerDetectionWindowMs = 220;

  get headerVehicleNumber(): string {
    return this.manualLprPlate?.trim() ?? '';
  }

  get splitPreviewFiles(): EntryPreviewFile[] {
    const snapshot = this.uploadedVehicleImages.find(
      (file) => this.isSnapshotFile(file) && this.isImageFile(file),
    );
    const secondary = this.uploadedVehicleImages.find(
      (file) => !this.isSnapshotFile(file) && this.isImageFile(file),
    );

    return [snapshot, secondary].filter((file): file is EntryPreviewFile => !!file);
  }

  get shouldShowSplitPreview(): boolean {
    return this.splitPreviewFiles.length > 1;
  }

  onPlateChange(value: string): void {
    this.manualLprPlateChange.emit(this.normalizePlate(value));
  }

  onPlateKeydown(event: KeyboardEvent): void {
    if (this.adding) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.onCreateTicketClicked();
      return;
    }

    if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;

    if (this.consumeScannerKey(event)) {
      return;
    }

    if (this.shouldReplaceExistingPlate()) {
      this.manualLprPlate = '';
      this.manualLprPlateChange.emit('');
    }

    this.lastPlateKeyAt = Date.now();
  }

  onPlateFocus(event: FocusEvent): void {
    this.selectTextControl(event.target);
  }

  onPlatePaste(event: ClipboardEvent): void {
    const text = event.clipboardData?.getData('text') ?? '';
    if (!text.trim()) return;

    event.preventDefault();
    event.stopPropagation();
    this.resetScannerBurst();
    this.setPlateValue(text);
  }

  onCreateTicketClicked(): void {
    const plateUI = (this.manualLprPlate ?? '').trim();
    if (!plateUI) return;

    const normalized = this.normalizePlate(plateUI);

    this.createTicketWithPlate.emit(normalized);
  }

  onPlateBlur(event: FocusEvent): void {
    if (this.isInteractiveElement(event.relatedTarget)) {
      return;
    }

    this.manualLprPlateBlur.emit();
    this.focusPlateArea(true);
  }

  onVehicleImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.vehicleImagesSelected.emit(input.files);
    input.value = '';
  }

  onCameraSnapshotClick(): void {
    if (this.cameraSnapshotLoading || this.cameraSnapshotDisabled) return;
    this.cameraSnapshotClick.emit();
  }

  onRemoveVehicleImage(index: number): void {
    this.removeVehicleImage.emit(index);
  }

  onSelectVehicleImagePreview(index: number): void {
    this.vehicleImagePreviewSelected.emit(index);
  }

  openScannedPreview(file = this.scannedFile): void {
    if (!file?.type?.startsWith('image/')) return;
    this.scannedFile = file;
    this.scannedPreviewOpen = true;
  }

  closeScannedPreview(): void {
    this.scannedPreviewOpen = false;
  }

  isPreviewSelected(fileUrl: string): boolean {
    return this.selectedPreviewUrl === fileUrl;
  }

  isImageFile(file: EntryPreviewFile | null | undefined): boolean {
    return !!file?.type?.startsWith('image/');
  }

  isSnapshotFile(file: EntryPreviewFile | null | undefined): boolean {
    return !!file?.name?.startsWith('gate-snapshot-');
  }

  ngAfterViewInit(): void {
    this.focusPlateArea(true);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['manualLprPlate'] || changes['adding']) {
      this.focusPlateArea(!this.manualLprPlate?.trim());
    }
  }

  ngOnDestroy(): void {
    this.resetScannerBurst();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (this.scannedPreviewOpen) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.closeScannedPreview();
      }
      return;
    }

    if (this.adding || event.ctrlKey || event.altKey || event.metaKey) return;
    if (this.isInteractiveElement(event.target)) return;

    const textArea = this.manualLprPlateArea?.nativeElement;
    if (!textArea || document.activeElement === textArea) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.focusPlateArea(true);
      this.onCreateTicketClicked();
      return;
    }

    if (event.key.length !== 1) return;

    event.preventDefault();
    this.manualLprPlate = event.key;
    this.resetScannerBurst();
    this.lastPlateKeyAt = Date.now();
    this.manualLprPlateChange.emit(this.normalizePlate(this.manualLprPlate));
    this.focusPlateArea();
  }

  private consumeScannerKey(event: KeyboardEvent): boolean {
    const textArea = this.manualLprPlateArea?.nativeElement;
    if (!textArea) return false;

    const now = Date.now();
    const currentValue = textArea.value || this.manualLprPlate || '';
    const gap = this.lastPlateKeyAt ? now - this.lastPlateKeyAt : Number.MAX_SAFE_INTEGER;

    if (!this.lastPlateKeyAt || gap > this.scannerBurstIdleMs) {
      this.scannerBurstBase = currentValue;
      this.scannerBurstChars = '';
      this.scannerBurstStartedAt = now;
      this.scannerMode = false;
    }

    this.scannerBurstChars += event.key;

    const elapsed = now - this.scannerBurstStartedAt;
    const hasExistingBase = !!this.scannerBurstBase.trim();
    const scannerDetected =
      hasExistingBase &&
      (this.scannerMode ||
        (this.scannerBurstChars.length >= this.scannerDetectionChars &&
          elapsed <= this.scannerDetectionWindowMs));

    if (!scannerDetected) {
      this.scheduleScannerBurstReset();
      return false;
    }

    this.scannerMode = true;
    event.preventDefault();
    event.stopPropagation();
    this.setPlateValue(this.scannerBurstChars);
    this.lastPlateKeyAt = now;
    this.scheduleScannerBurstReset();
    return true;
  }

  private setPlateValue(value: string): void {
    const normalized = this.normalizePlate(value);
    this.manualLprPlate = normalized;
    this.manualLprPlateChange.emit(normalized);
  }

  private scheduleScannerBurstReset(): void {
    if (this.scannerBurstResetTimer) {
      clearTimeout(this.scannerBurstResetTimer);
    }

    this.scannerBurstResetTimer = setTimeout(() => {
      this.resetScannerBurst();
    }, this.scannerBurstIdleMs);
  }

  private resetScannerBurst(): void {
    if (this.scannerBurstResetTimer) {
      clearTimeout(this.scannerBurstResetTimer);
      this.scannerBurstResetTimer = undefined;
    }
    this.scannerBurstBase = '';
    this.scannerBurstChars = '';
    this.scannerBurstStartedAt = 0;
    this.scannerMode = false;
  }

  private shouldReplaceExistingPlate(): boolean {
    const textArea = this.manualLprPlateArea?.nativeElement;
    const hasValue = !!this.manualLprPlate?.trim();
    if (!textArea || !hasValue) return false;

    const allSelected =
      textArea.selectionStart === 0 && textArea.selectionEnd === textArea.value.length;

    return !allSelected && Date.now() - this.lastPlateKeyAt > 700;
  }

  private focusPlateArea(selectAll = false): void {
    setTimeout(() => {
      const el = this.manualLprPlateArea?.nativeElement;
      if (!el) return;
      if (document.activeElement && this.isInteractiveElement(document.activeElement)) return;
      el.focus();
      if (selectAll) {
        el.select();
      }
    }, 0);
  }

  private selectTextControl(target: EventTarget | null): void {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    setTimeout(() => target.select(), 0);
  }

  private isInteractiveElement(target: EventTarget | Element | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target === this.manualLprPlateArea?.nativeElement) return false;

    return !!target.closest('input, textarea, select, button, a, [contenteditable="true"]');
  }

  private normalizePlate(value: string | null | undefined): string {
    const compact = String(value ?? '')
      .replace(/[\s\u00a0\u2000-\u200f\u2028-\u202f\u205f\u3000]+/g, '')
      .trim()
      .toUpperCase();

    const letters: string[] = [];
    const suffix: string[] = [];

    for (const char of Array.from(compact)) {
      if (this.isPlateLetter(char) && suffix.length === 0) {
        letters.push(char);
      } else {
        suffix.push(char);
      }
    }

    return [letters.join(' '), suffix.join('')].filter(Boolean).join(' ');
  }

  private isPlateLetter(char: string): boolean {
    return /^[A-Z\u0600-\u06FF]$/.test(char);
  }
}
