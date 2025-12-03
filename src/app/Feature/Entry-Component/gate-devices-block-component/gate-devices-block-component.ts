import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GateDevicePeripheral } from '../../../Domain/Auth/auth.models';

@Component({
  selector: 'app-gate-devices-block-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './gate-devices-block-component.html',
  styleUrls: ['./gate-devices-block-component.css'],
})
export class GateDevicesBlockComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() gatePeripheral: GateDevicePeripheral | null = null;

  @Input() manualLprPlate: string = '';

  @Input() adding = false;

  @Output() manualLprPlateChange = new EventEmitter<string>();

  @Output() createTicketWithPlate = new EventEmitter<string>();

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

    // Normalize for backend: remove spaces, uppercase
    const normalized = plateUI.replace(/\s+/g, '').toUpperCase();

    this.createTicketWithPlate.emit(normalized);
  }
}
