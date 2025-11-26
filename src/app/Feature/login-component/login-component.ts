import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../Services/Auth/auth-service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { GateType } from '../../Domain/Auth/auth.models';
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
          tempPasswordNotice: 'أنت تستخدم كلمة مرور مؤقتة، من فضلك أدخل كلمة مرور جديدة.',
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
          tempPasswordNotice: 'You are using a temporary password. Please create new credentials.',
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
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastServices);
  public lang = inject(LanguageService);

  loading = false;
  showPassword = false;
  errorToast: string | null = null;
  GateType = GateType;

  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    remember: [true],
    gateType: [GateType.Entrance, [Validators.required]],
    gateNumber: [1, [Validators.required, Validators.min(1)]],
  });

  showGatePopup = false;
  showChangeModal = false;
  changeLoading = false;
  changeError: string | null = null;

  changeForm = this.fb.group(
    {
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordsMatch }
  );

  constructor(@Inject(I18N_DICT) private dict: I18nDict) {}

  private t(key: string) {
    return this.dict[this.lang.current]?.[key] ?? key;
  }

  passwordsMatch(group: any) {
    return group.get('newPassword')?.value === group.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
  }

  roleIsGateCashier(): boolean {
    const role = this.auth.role;
    return role === 'EntranceCashier' || role === 'ExitCashier' || role === 'Supervisor';
  }

  submit() {
    if (this.form.invalid) {
      console.log('sdsdsd ');
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const dto = {
      userName: (this.form.value.username ?? '').trim(),
      password: this.form.value.password ?? '',
      gateType: this.form.value.gateType!,
      gateNumber: Number(this.form.value.gateNumber) || 1,
      remember: !!this.form.value.remember,
    };
    console.log(dto);
    this.auth.login(dto).subscribe({
      next: () => {
        this.loading = false;
        this.toast?.success?.(this.t('successLogin'));
        this.navigateAfterLogin();
      },
      error: (err: any) => {
        this.loading = false;
        this.toast?.fromProblem?.(err);
      },
    });
  }

  navigateAfterLogin() {
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

  saveNewCredentials() {
    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }

    const newPassword = this.changeForm.value.newPassword;
    const confirmPassword = this.changeForm.value.confirmPassword;

    if (!newPassword || !confirmPassword) {
      this.changeError = 'يرجى إدخال كلمة المرور';
      return;
    }

    if (newPassword !== confirmPassword) {
      this.changeError = 'كلمتا المرور غير متطابقتين';
      return;
    }

    this.changeError = null;
    this.changeLoading = true;

    this.auth.loginFirstTime(newPassword).subscribe({
      next: () => {
        this.changeLoading = false;
        this.toast?.success?.('تم تحديث كلمة المرور بنجاح');
        this.showChangeModal = false;
      },
      error: (err: any) => {
        this.changeLoading = false;
        this.toast?.fromProblem?.(err);
      },
    });
  }
}
