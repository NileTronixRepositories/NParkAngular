import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GateDevicePeripheral } from '../../../Domain/Auth/auth.models';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-gate-devices-block-component',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './gate-devices-block-component.html',
  styleUrl: './gate-devices-block-component.css',
})
export class GateDevicesBlockComponent {
  @Input({ required: true }) t!: (key: string) => string;
  @Input() gatePeripheral: GateDevicePeripheral | null = null;
  @Input() manualLprPlate: string = '';
  @Input() adding = false;

  @Output() manualLprPlateChange = new EventEmitter<string>();
  @Output() createTicketWithPlate = new EventEmitter<string>();

  get lprPlate(): string {
    return this.manualLprPlate;
  }

  set lprPlate(value: string) {
    this.manualLprPlateChange.emit(value);
  }

  onCreateTicketClicked() {
    const plate = (this.manualLprPlate ?? '').trim();
    if (!plate) return;
    this.createTicketWithPlate.emit(plate);
  }
}
