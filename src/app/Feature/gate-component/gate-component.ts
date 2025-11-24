import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GateServices } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType } from '../../Domain/Auth/auth.models';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastServices } from '../../Services/Toster/toast-services';

@Component({
  selector: 'app-gate-component',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './gate-component.html',
  styleUrls: ['./gate-component.css'],
})
export class GateComponent {
  gates: any[] = [];
  selectedGate: number | '' = '';
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
    if (!this.selectedGate) {
      this.toast.warn('Please select a gate');
      return;
    }

    const selectedGateId = Number(this.selectedGate);
    const selectedGate = this.gates.find((g) => g.gateId === selectedGateId);

    console.log('Debug - selectedGateId:', selectedGateId);
    console.log('Debug - available gates:', this.gates);
    console.log('Debug - found gate:', selectedGate);

    if (!selectedGate) {
      console.warn('Selected gate not found in list');
      this.toast.error('Selected gate not found');
      return;
    }

    const gateId = selectedGate.gateId as number;
    const gateType = this.gateType;

    console.log('Selecting gateId:', gateId, 'gateType:', gateType);

    this.authService.checkGate().subscribe({
      next: (checkRes) => {
        console.log('Check gate successful:', checkRes);

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
    const selectedGateId = this.selectedGate;
    const selectedGate = this.gates.find((gate) => gate.gateId === selectedGateId);

    if (selectedGate) {
      const gateNumber = selectedGate.gateName; // استخدام gateName بدلاً من gateNumber
      const gateType = this.gateType; // نوع البوابة
      console.log('Sending gateName: ', gateNumber, 'gateType: ', gateType); // تحقق من القيم التي سيتم إرسالها

      this.http
        .post(
          'http://192.168.1.8/api/auth/CheckGate',
          {
            gateNumber: gateNumber,
            gateType: gateType,
          }, // هذه هي البيانات التي سترسلها
          {
            headers: {
              Authorization: `Bearer ${this.authService.token}`, // استخدام الـ token من الـ AuthService
            },
          } // هنا يتم تمرير الـ headers بشكل صحيح
        )
        .subscribe(
          (response: any) => {
            this.authService.updateToken(response.token);
            this.authService.updateGateData(response.gateDevicePeripheral);
            console.log('Gate selected and token updated', response);

            if (response.roleName === 'ExitCashier') {
              // التوجيه إلى صفحة Exit
              this.router.navigate(['/tickets/exit']);
            } else if (response.roleName === 'EntranceCashier') {
              // التوجيه إلى صفحة Entry
              this.router.navigate(['/tickets/entry']);
            } else {
              // في حالة عدم وجود الدور المناسب يمكن توجيه المستخدم إلى صفحة أخرى
              this.router.navigate(['/overview']);
            }
          },
          (error) => {
            console.error('Error checking gate:', error);
          }
        );
    }
  }
}
