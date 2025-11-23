import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GateServices } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType } from '../../Domain/Auth/auth.models'; // استيراد GateType
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // استيراد الـ Router لتوجيه المستخدم

@Component({
  selector: 'app-gate-component',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './gate-component.html',
  styleUrls: ['./gate-component.css'],
})
export class GateComponent {
  gates: any[] = [];
  selectedGate: string = ''; // لحفظ البوابة المختارة
  gateType: GateType = GateType.Entrance; // لتحديد نوع البوابة (دخول أو خروج)

  GateType = GateType; // لتخزين القيم من الـ Enum

  constructor(
    private http: HttpClient,
    private gateService: GateServices,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router // إضافة الـ Router هنا لتوجيه المستخدم
  ) {}

  ngOnInit(): void {
    this.getGates(); // جلب بيانات البوابات عند بدء التحميل
  }

  // جلب جميع البوابات من الخدمة
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

  // عند تغيير نوع البوابة
  onGateTypeChange(type: GateType): void {
    this.gateType = type; // تحديث نوع البوابة بناءً على الاختيار
  }

  // عند اختيار البوابة من القائمة
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
          'http://localhost/api/auth/CheckGate',
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
            // 1) تحديث التوكن الجديد اللي رجع من الـ API
            this.authService.updateToken(response.token);

            // 2) تخزين GateDevicePeripheral كـ قيمة Global
            this.authService.updateGateData(response.gateDevicePeripheral);

            console.log('Gate selected and token updated', response);

            // 3) التوجيه بناءً على الدور
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
}
