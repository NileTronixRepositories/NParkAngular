import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GateServices } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType } from '../../Domain/Auth/auth.models';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastServices } from '../../Services/Toster/toast-services';
import { environment } from '../../Shared/environment/environment';

@Component({
  selector: 'app-gate-component',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './gate-component.html',
  styleUrls: ['./gate-component.css'],
})
export class GateComponent {
  // يفضل يكون لها interface، لكن مؤقتًا هنسيبها any عشان اختلاف الأسماء
  gates: any[] = [];

  // ❌ مش محتاجين ده خلاص
  // selectedGate: number | '' = '';

  // ✅ ده اللى هنشتغل بيه (Guid كـ string)
  selectedGateId: string | '' = '';

  gateType: GateType = GateType.Entrance;
  GateType = GateType;

  private http = inject(HttpClient);
  private gateService = inject(GateServices);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastServices);

  ngOnInit(): void {
    this.getGates();
  }

  getGates(): void {
    this.gateService.getAll().subscribe({
      next: (data) => {
        this.gates = data ?? [];
      },
      error: (error) => {
        console.error('Error fetching gates:', error);
        this.toast.fromProblem(error);
      },
    });
  }

  onGateTypeChange(type: GateType): void {
    this.gateType = type;
  }

  confirmGate(): void {
    if (!this.selectedGateId) {
      this.toast.warn('Please select a gate');
      return;
    }

    const selectedGate = this.gates.find((g) => g.gateId === this.selectedGateId);

    console.log('Debug - selectedGateId:', this.selectedGateId);
    console.log('Debug - available gates:', this.gates);
    console.log('Debug - found gate:', selectedGate);

    if (!selectedGate) {
      console.warn('Selected gate not found in list');
      this.toast.error('Selected gate not found');
      return;
    }

    const gateId = selectedGate.gateId;
    const gateType = this.gateType;

    console.log('Selecting gateId:', gateId, 'gateType:', gateType);

    this.authService.checkGate().subscribe({
      next: () => {
        this.authService.selectGate(gateId, gateType).subscribe({
          next: (selectRes) => {
            console.log('Gate selected and token updated', selectRes);

            if (gateType === GateType.Entrance) {
              this.router.navigate(['/tickets/entry']);
            } else if (gateType === GateType.Exit) {
              this.router.navigate(['/tickets/exit']);
            } else {
              this.router.navigate(['/overview']);
            }
          },
          error: (selectError) => {
            console.error('Error selecting gate:', selectError);
            this.toast.fromProblem(selectError);
          },
        });
      },
      error: (checkError) => {
        console.error('Error checking gate session:', checkError);
        this.toast.fromProblem(checkError);
      },
    });
  }

  onGateSelect(): void {
    if (!this.selectedGateId) {
      return;
    }

    const selectedGate = this.gates.find((gate) => gate.gateId === this.selectedGateId);

    if (!selectedGate) {
      console.warn('Selected gate not found in list');
      this.toast.error('Selected gate not found');
      return;
    }

    const gateId = selectedGate.gateId;
    const gateType = this.gateType;

    console.log('Sending gateId: ', gateId, 'gateType: ', gateType);

    this.http
      .post(
        `${environment.baseUrl}/auth/CheckGate`,
        {
          gateId: gateId,
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
          this.toast.fromProblem(error);
        }
      );
  }
}
