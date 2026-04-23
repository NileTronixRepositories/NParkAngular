import { Component, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GateServices } from '../../Services/Gate/gate-services';
import { AuthService } from '../../Services/Auth/auth-service';
import { GateType, GateDto } from '../../Domain/Auth/auth.models';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ToastServices } from '../../Services/Toster/toast-services';
import { environment } from '../../Shared/environment/environment';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';

@Component({
  selector: 'app-gate-component',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './gate-component.html',
  styleUrls: ['./gate-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>{
        ar: {
          gateSelection: 'اختيار البوابة',
          selectGate: 'اختر البوابة التي تريد العمل عليها',
          entryGates: 'بوابات الدخول',
          exitGates: 'بوابات الخروج',
          entry: 'دخول',
          exit: 'خروج',
          noGates: 'لا توجد بوابات متاحة حالياً',
          gateSelected: 'تم اختيار البوابة بنجاح',
        },
        en: {
          gateSelection: 'Gate Selection',
          selectGate: 'Select the gate you want to work on',
          entryGates: 'Entry Gates',
          exitGates: 'Exit Gates',
          entry: 'Entry',
          exit: 'Exit',
          noGates: 'No gates available',
          gateSelected: 'Gate selected successfully',
        },
      },
    },
  ],
})
export class GateComponent {
  gates: GateDto[] = [];
  entryGates: GateDto[] = [];
  exitGates: GateDto[] = [];

  selectedGateId: string | '' = '';
  gateType: GateType = GateType.Entrance;
  GateType = GateType;

  private http = inject(HttpClient);
  private gateService = inject(GateServices);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastServices);
  lang = inject(LanguageService);

  dir = computed(() => (this.lang?.current === 'ar' ? 'rtl' : 'ltr'));

  ngOnInit(): void {
    this.getGates();
  }

  getGates(): void {
    this.gateService.getAll().subscribe({
      next: (data) => {
        this.gates = data ?? [];
        // Split gates by type
        this.entryGates = this.gates.filter((g) => g.gateType === GateType.Entrance);
        this.exitGates = this.gates.filter((g) => g.gateType === GateType.Exit);
      },
      error: (error) => {
        console.error('Error fetching gates:', error);
        this.toast.fromProblem(error);
      },
    });
  }

  selectGate(gateId: string, gateType: GateType): void {
    this.selectedGateId = gateId;
    this.gateType = gateType;

    const selectedGate = this.gates.find((g) => g.gateId === gateId);
    if (!selectedGate) {
      this.toast.error('البوابة غير موجودة');
      return;
    }

    // Use original working API call
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
        },
      )
      .subscribe(
        (response: any) => {
          this.authService.updateToken(response.token);
          this.authService.updateGateData(response.gateDevicePeripheral);
          this.toast.success(
            this.lang.current === 'ar'
              ? `تم اختيار ${selectedGate.gateName}`
              : `${selectedGate.gateName} selected`,
          );

          if (gateType === GateType.Entrance) {
            this.router.navigate(['/tickets/entry']);
          } else if (gateType === GateType.Exit) {
            this.router.navigate(['/tickets/exit']);
          } else {
            this.router.navigate(['/overview']);
          }
        },
        (error) => {
          console.error('Error selecting gate:', error);
          this.toast.fromProblem(error);
        },
      );
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

    const gateId = parseInt(selectedGate.gateId, 10);
    const gateType = this.gateType;

    console.log('Selecting gateId:', gateId, 'gateType:', gateType);

    this.authService.checkGate().subscribe({
      next: () => {
        this.authService.selectGate(gateId as number, gateType).subscribe({
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

    const gateId = parseInt(selectedGate.gateId, 10);
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
        },
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
        },
      );
  }
}
