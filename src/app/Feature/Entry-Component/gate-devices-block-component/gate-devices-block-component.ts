import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SafePipe } from '../../../Pipes/safe.pipe';

import { GateDevicePeripheral } from '../../../Domain/Auth/auth.models';

@Component({
  selector: 'app-gate-devices-block-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, SafePipe],
  templateUrl: './gate-devices-block-component.html',
  styleUrls: ['./gate-devices-block-component.css'],
})
export class GateDevicesBlockComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() gatePeripheral: GateDevicePeripheral | null = null;
  @Input() scannedFile: {
    name: string;
    url: string;
    safeUrl?: any;
    type: string;
    file: File;
  } | null = null;
  @Input() uploadedVehicleImages: {
    name: string;
    url: string;
    safeUrl?: any;
    type: string;
    file: File;
  }[] = [];
  @Input() selectedPreviewUrl: string | null = null;

  @Input() manualLprPlate: string = '';

  @Input() adding = false;

  @Output() manualLprPlateChange = new EventEmitter<string>();
  @Output() manualLprPlateBlur = new EventEmitter<void>();

  @Output() createTicketWithPlate = new EventEmitter<string>();
  @Output() vehicleImagesSelected = new EventEmitter<FileList | null>();
  @Output() removeVehicleImage = new EventEmitter<number>();
  @Output() vehicleImagePreviewSelected = new EventEmitter<number>();

  onPlateChange(value: string): void {
    const raw = (value ?? '').toUpperCase();

    // Remove all spaces from user typing
    const cleaned = raw.replace(/\s+/g, '');

    // Add space between every character for better readability
    const formatted = cleaned.split('').join(' ').trim();

    this.manualLprPlateChange.emit(formatted);
  }

  onCreateTicketClicked(): void {
    const plateUI = (this.manualLprPlate ?? '').trim();
    if (!plateUI) return;

    const normalized = plateUI.replace(/\s+/g, '').toUpperCase();

    this.createTicketWithPlate.emit(normalized);
  }

  onPlateBlur(): void {
    this.manualLprPlateBlur.emit();
  }

  onVehicleImagesChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.vehicleImagesSelected.emit(input.files);
    input.value = '';
  }

  onRemoveVehicleImage(index: number): void {
    this.removeVehicleImage.emit(index);
  }

  onSelectVehicleImagePreview(index: number): void {
    this.vehicleImagePreviewSelected.emit(index);
  }

  isPreviewSelected(fileUrl: string): boolean {
    return this.selectedPreviewUrl === fileUrl;
  }
}
