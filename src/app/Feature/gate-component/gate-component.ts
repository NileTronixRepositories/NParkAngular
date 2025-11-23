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
    private router: Router // إضافة الـ Router هنا لتوجيه المستخدم
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
    const selectedGateId = this.selectedGate;
    const selectedGate = this.gates.find((gate) => gate.gateId === selectedGateId);

    if (selectedGate) {
      const gateNumber = selectedGate.gateName; // استخدام gateName بدلاً من gateNumber
      const gateType = this.gateType; // نوع البوابة

      console.log('Sending gateName: ', gateNumber, 'gateType: ', gateType); // تحقق من القيم التي سيتم إرسالها

      // إرسال البيانات إلى API للتحقق من البوابة
      this.http
        .post(
          'http://192.168.1.8/api/auth/CheckGate',
          {
            gateNumber: gateNumber,
            gateType: gateType,
          },
          {
            headers: {
              Authorization: `Bearer ${this.authService.token}`, // استخدام الـ token من الـ AuthService
            },
          }
        )
        .subscribe(
          (response: any) => {
            this.authService.updateToken(response.token);
            this.authService.updateGateData({
              gateDevicePeripheral: response.gateDevicePeripheral,
            });
            console.log('Gate selected and token updated', response);

            // التوجيه بناءً على الدور بعد التحقق من الـ response
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
