import { Component, Inject, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../Services/Auth/auth-service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { GateType, LoginFirstTimeCommand } from '../../Domain/Auth/auth.models';
import { GateComponent } from '../gate-component/gate-component';

@Component({
  selector: 'app-login-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipePipe, GateComponent],
  templateUrl: './login-component.html',
  styleUrls: ['./login-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>{
        ar: {
          brandSuffix: 'Park',
          signInToContinue: 'سجّل الدخول للمتابعة',
          username: 'اسم المستخدم',
          password: 'كلمة المرور',
          usernamePh: 'admin',
          passwordPh: '••••••',
          usernameRequired: 'اسم المستخدم مطلوب.',
          passwordRequired: 'كلمة المرور مطلوبة.',
          rememberMe: 'تذكرني',
          forgotPassword: 'نسيت كلمة المرور؟',
          signIn: 'تسجيل الدخول',
          changeAdminCreds: 'تغيير بيانات المشرف',
          tempPasswordNotice:
            'أنت تستخدم كلمة مرور مؤقتة. من فضلك أدخل كلمة مرور جديدة ثم قم بالتسجيل.',
          newPassword: 'كلمة المرور الجديدة',
          confirmPassword: 'تأكيد كلمة المرور',
          pwdMin: 'كلمة المرور مطلوبة (6 أحرف على الأقل).',
          pwdMismatch: 'كلمتا المرور غير متطابقتين.',
          cancel: 'إلغاء',
          save: 'حفظ',
          adminFirstTimeMissing:
            'لا توجد بيانات أول مرة. أعد محاولة تسجيل الدخول بـ Admin / Admin123',
          successLogin: 'تم تسجيل الدخول بنجاح',
          successPwdUpdated: 'تم تحديث كلمة المرور وتسجيل الدخول بنجاح',
          gateType: 'نوع البوابة',
          entryGate: 'دخول',
          exitGate: 'خروج',
          gateNumber: 'رقم البوابة',
          gateTypeRequired: 'نوع البوابة مطلوب.',
          gateNumberRequired: 'رقم البوابة مطلوب.',
        },
        en: {
          brandSuffix: 'Park',
          signInToContinue: 'Sign in to continue',
          username: 'Username',
          password: 'Password',
          usernamePh: 'admin',
          passwordPh: '••••••',
          usernameRequired: 'Username is required.',
          passwordRequired: 'Password is required.',
          rememberMe: 'Remember me',
          forgotPassword: 'Forgot password?',
          signIn: 'Sign In',
          changeAdminCreds: 'Change admin credentials',
          tempPasswordNotice:
            'You are using a temporary password. Please enter a new password to continue.',
          newPassword: 'New password',
          confirmPassword: 'Confirm password',
          pwdMin: 'Password required (min 6).',
          pwdMismatch: 'Passwords do not match.',
          cancel: 'Cancel',
          save: 'Save',
          adminFirstTimeMissing: 'No first-time data. Please login again with Admin / Admin123',
          successLogin: 'Logged in successfully',
          successPwdUpdated: 'Password updated and logged in successfully',
          gateType: 'Gate Type',
          entryGate: 'Entry',
          exitGate: 'Exit',
          gateNumber: 'Gate Number',
          gateTypeRequired: 'Gate type is required.',
          gateNumberRequired: 'Gate number is required.',
        },
      },
    },
  ],
})
export class LoginComponent {
  // ====== DI ======
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastServices);
  public lang = inject(LanguageService);

  // ====== UI State ======
  loading = false;
  showPassword = false;
  errorToast: string | null = null;
  GateType = GateType;

  showGatePopup = false;
  showChangeModal = false;
  changeLoading = false;
  changeError: string | null = null;

  showOldPwd = false;
  showNewPwd = false;
  showConfirmPwd = false;

  // ====== Validators ======
  readonly passwordsMatchValidator: ValidatorFn = (
    group: AbstractControl
  ): ValidationErrors | null => {
    const newPwd = group.get('newPassword')?.value;
    const confirmPwd = group.get('confirmPassword')?.value;
    return newPwd === confirmPwd ? null : { mismatch: true };
  };

  // ====== Forms ======
  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [true],
    gateType: [GateType.Entrance, [Validators.required]],
    gateNumber: [1, [Validators.required, Validators.min(1)]],
  });

  changeForm = this.fb.group(
    {
      userName: ['', [Validators.required]],
      password: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatchValidator }
  );

  constructor(@Inject(I18N_DICT) private dict: I18nDict) {}

  // ترجمة بسيطة من الـ dict المحلي
  private t(key: string): string {
    return this.dict[this.lang.current]?.[key] ?? key;
  }

  // ====== Helpers ======
  roleIsGateCashier(): boolean {
    const role = this.auth.role;
    return role === 'EntranceCashier' || role === 'ExitCashier' || role === 'Supervisor';
  }

  // ====== SUBMIT LOGIN ======
  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const username = (this.form.value.username ?? '').trim();
    const password = this.form.value.password ?? '';

    // Admin / Admin123 → First-time modal فقط (لا تغيير في اللوجيك)
    if (username === 'Admin' && password === 'Admin123') {
      this.openFirstTimeModal(username, password);
      return;
    }

    this.loading = true;

    const dto = {
      userName: username,
      password: password,
      gateType: this.form.value.gateType!,
      gateNumber: Number(this.form.value.gateNumber) || 1,
      remember: !!this.form.value.remember,
    };

    this.auth.login(dto).subscribe({
      next: () => {
        this.loading = false;
        this.toast?.success?.(this.t('successLogin'));
        this.navigateAfterLogin();
      },
      error: (err: unknown) => {
        this.loading = false;
        this.toast?.fromProblem?.(err);
      },
    });
  }

  private openFirstTimeModal(username: string, password: string): void {
    this.showChangeModal = true;
    this.changeError = null;
    this.changeLoading = false;

    this.changeForm.reset({
      userName: username,
      password: password,
      newPassword: '',
      confirmPassword: '',
    });

    this.toast?.success?.(this.t('tempPasswordNotice'));
  }

  navigateAfterLogin(): void {
    const role = this.auth.role;

    if (role === 'EntranceCashier' || role === 'ExitCashier' || role === 'Supervisor') {
      this.router.navigate(['/gate-selection']);
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    this.router.navigate(['/overview']);
  }

  // ====== SUBMIT FIRST-TIME CREDENTIALS ======
  saveNewCredentials(): void {
    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }

    const userName = (this.changeForm.value.userName ?? '').trim();
    const password = this.changeForm.value.password ?? '';
    const newPassword = this.changeForm.value.newPassword ?? '';
    const confirmPassword = this.changeForm.value.confirmPassword ?? '';

    if (!userName || !password || !newPassword || !confirmPassword) {
      this.changeError = this.t('pwdMin');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.changeError = this.t('pwdMismatch');
      return;
    }

    this.changeError = null;
    this.changeLoading = true;

    const body: LoginFirstTimeCommand = {
      userName,
      password,
      newPassword,
      confirmedPassword: confirmPassword,
    };

    this.auth.loginFirstTime(body).subscribe({
      next: (res) => {
        this.changeLoading = false;

        if (res.status === 204 || (res.status >= 200 && res.status < 300)) {
          this.toast?.success?.(this.t('successPwdUpdated'));
        } else {
          this.toast?.success?.(this.t('successPwdUpdated'));
        }

        this.showChangeModal = false;

        this.form.reset({
          username: '',
          password: '',
          remember: true,
          gateType: this.GateType.Entrance,
          gateNumber: 1,
        });
      },
      error: (err: any) => {
        this.changeLoading = false;

        const apiMessage =
          err?.error?.message || err?.error?.detail || this.t('adminFirstTimeMissing');

        if (this.toast?.fromProblem) {
          this.toast.fromProblem(err);
        } else {
          this.toast?.success?.(apiMessage);
        }

        this.showChangeModal = false;

        this.form.reset({
          username: userName,
          password: '',
          remember: true,
          gateType: this.GateType.Entrance,
          gateNumber: 1,
        });
      },
    });
  }
}
