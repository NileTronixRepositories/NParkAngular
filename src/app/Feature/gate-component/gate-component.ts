import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GateServices } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType } from '../../Domain/Auth/auth.models';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-gate-component',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './gate-component.html',
  styleUrls: ['./gate-component.css'],
})
export class GateComponent {
  gates: any[] = [];
  selectedGate: string = '';
  gateType: GateType = GateType.Entrance;

  GateType = GateType;

  constructor(
    private http: HttpClient,
    private gateService: GateServices,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getGates();
  }

  getGates(): void {
    this.gateService.getAll().subscribe(
      (data) => {
        this.gates = data;
      },
      (error) => {
        console.error('Error fetching gates:', error);
      }
    );
  }

  onGateTypeChange(type: GateType): void {
    this.gateType = type;
  }

  onGateSelect(): void {
    if (!this.selectedGate) return;

    const selectedGate = this.gates.find((gate) => gate.gateName === this.selectedGate);
    if (!selectedGate) return;

    const gateNumber = selectedGate.gateNumber;
    const gateType = this.gateType;

    console.log('Sending gateNumber: ', gateNumber, 'gateType: ', gateType);

    this.http
      .post(
        'http://192.168.1.8/api/auth/CheckGate',
        {
          gateNumber: gateNumber,
          gateType: gateType,
        },
        {
          headers: {
            Authorization: `Bearer ${this.authService.token}`,
          },
        }
      )
      .subscribe(
        (response: any) => {
          this.authService.updateToken(response.token);
          this.authService.updateGateData(response.gateDevicePeripheral);

          console.log('Gate selected and token updated', response);

          if (response.roleName === 'ExitCashier') {
            this.router.navigate(['/tickets/exit']);
          } else if (response.roleName === 'EntranceCashier') {
            this.router.navigate(['/tickets/entry']);
          } else {
            this.router.navigate(['/overview']);
          }
        },
        (error) => {
          console.error('Error checking gate:', error);
        }
      );
  }
}
