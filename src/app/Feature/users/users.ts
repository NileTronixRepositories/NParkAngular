import { Component, computed, inject } from '@angular/core';
import { NgIf, NgFor, NgClass, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UserDto,
  UserCreateDto,
  UserUpdateDto,
  RoleDto,
  isCashierRole,
} from '../../Domain/Users/user.model';
import { UsersServices } from '../../Services/Users/users-services';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { UsersTourService } from '../../Services/Users/users-tour.service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, CommonModule, TranslatePipePipe, NgIf, NgFor, NgClass],
  templateUrl: './users.html',
  styleUrl: './users.css',
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          users: 'المستخدمون',
      users_management_subtitle: 'إدارة مستخدمي النظام والأدوار والصلاحيات',
      users_list: 'قائمة المستخدمين',
      total: 'إجمالي',
          add_new: 'إضافة',
          id: '#',
          name: 'الاسم',
          email: 'البريد',
          role: 'الدور',
          status: 'الحالة',
          actions: 'إجراءات',
          admin: 'مشرف',
          user: 'مستخدم',
          edit: 'تعديل',
          no_users: 'لا يوجد مستخدمون',
          close: 'إغلاق',
          edit_user: 'تعديل مستخدم',
          add_user: 'إضافة مستخدم جديد',
          create: 'إنشاء',
          save: 'حفظ',
          cancel: 'إلغاء',
          invalid_email: 'بريد غير صالح',
          required: 'مطلوب',
          saving: 'جاري الحفظ...',
          loading: 'جاري التحميل...',
          created_ok: 'تم الإنشاء بنجاح',
          updated_ok: 'تم الحفظ بنجاح',
          failed_load: 'فشل تحميل المستخدمين',
          failed_save: 'تعذر الحفظ',
          password: 'كلمة المرور',
          change_password: 'تغيير كلمة المرور',
          cancel_password_change: 'إلغاء تغيير كلمة المرور',
          show_password: 'عرض كلمة المرور',
          hide_password: 'إخفاء كلمة المرور',
          phone: 'الجوال',
          nationalId: 'الهوية الوطنية',
          roleId: 'معرّف الدور',
          role_hint: 'أدخل معرف الدور كما هو في النظام.',
          select_role: 'اختر الدور',
          delete: 'حذف',
          delete_confirm: 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن تراجع هذا الإجراء.',
          delete_ok: 'تم حذف المستخدم بنجاح',
          delete_failed: 'فشل حذف المستخدم',
          leave_empty_to_keep: 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية',
          shiftStartTime: 'بداية الشفت',
          shiftEndTime: 'نهاية الشفت',
          shift: 'الشفت',
          shift_required_start: 'Shift start time is required for cashier users',
          shift_required_end: 'Shift end time is required for cashier users',
          shift_required_pair: 'Shift start time and shift end time must be provided together',
          shift_cashier_only: 'Shift time is allowed only for EntranceCashier and ExitCashier roles',
          shift_invalid_format: 'Shift time must be in 24-hour HH:mm format',
          helpTour: 'شرح الواجهة',
        },
        en: {
          users: 'Users',
      users_management_subtitle: 'Manage system users, roles, and permissions',
      users_list: 'Users List',
      total: 'Total',
          add_new: 'Add New',
          id: '#',
          name: 'Name',
          email: 'Email',
          role: 'Role',
          status: 'Status',
          actions: 'Actions',
          admin: 'Admin',
          user: 'User',
          edit: 'Edit',
          no_users: 'No users',
          close: 'Close',
          edit_user: 'Edit User',
          add_user: 'Add New User',
          create: 'Create',
          save: 'Save',
          cancel: 'Cancel',
          invalid_email: 'Invalid email',
          required: 'Required',
          saving: 'Saving...',
          loading: 'Loading...',
          created_ok: 'Created successfully',
          updated_ok: 'Saved successfully',
          failed_load: 'Failed to load users',
          failed_save: 'Failed to save',
          password: 'Password',
          change_password: 'Change Password',
          cancel_password_change: 'Cancel Password Change',
          show_password: 'Show password',
          hide_password: 'Hide password',
          phone: 'Phone',
          nationalId: 'National ID',
          roleId: 'Role Id',
          role_hint: 'Enter the role ID as configured in the system.',
          select_role: 'Select role',
          delete: 'Delete',
          delete_confirm:
            'Are you sure you want to delete this user? This action cannot be undone.',
          delete_ok: 'User deleted successfully',
          delete_failed: 'Failed to delete user',
          leave_empty_to_keep: 'Leave empty to keep current',
          shiftStartTime: 'Shift Start Time',
          shiftEndTime: 'Shift End Time',
          shift: 'Shift',
          shift_required_start: 'Shift start time is required for cashier users',
          shift_required_end: 'Shift end time is required for cashier users',
          shift_required_pair: 'Shift start time and shift end time must be provided together',
          shift_cashier_only: 'Shift time is allowed only for EntranceCashier and ExitCashier roles',
          shift_invalid_format: 'Shift time must be in 24-hour HH:mm format',
          helpTour: 'Help Tour',
        },
      }),
    },
  ],
})
export class Users {
  private svc = inject(UsersServices);
  private toast = inject(ToastServices);
  i18n = inject(LanguageService);
  private usersTour = inject(UsersTourService);

  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      users: 'المستخدمون',
      users_management_subtitle: 'إدارة مستخدمي النظام والأدوار والصلاحيات',
      users_list: 'قائمة المستخدمين',
      total: 'إجمالي',
      add_new: 'إضافة',
      id: '#',
      name: 'الاسم',
      email: 'البريد',
      role: 'الدور',
      status: 'الحالة',
      actions: 'إجراءات',
      admin: 'مشرف',
      user: 'مستخدم',
      edit: 'تعديل',
      no_users: 'لا يوجد مستخدمون',
      close: 'إغلاق',
      edit_user: 'تعديل مستخدم',
      add_user: 'إضافة مستخدم جديد',
      create: 'إنشاء',
      save: 'حفظ',
      cancel: 'إلغاء',
      invalid_email: 'بريد غير صالح',
      required: 'مطلوب',
      saving: 'جاري الحفظ...',
      loading: 'جاري التحميل...',
      created_ok: 'تم الإنشاء بنجاح',
      updated_ok: 'تم الحفظ بنجاح',
      failed_load: 'فشل تحميل المستخدمين',
      failed_save: 'تعذر الحفظ',
      password: 'كلمة المرور',
      change_password: 'تغيير كلمة المرور',
      cancel_password_change: 'إلغاء تغيير كلمة المرور',
      show_password: 'عرض كلمة المرور',
      hide_password: 'إخفاء كلمة المرور',
      phone: 'الجوال',
      nationalId: 'الهوية الوطنية',
      roleId: 'معرّف الدور',
      role_hint: 'أدخل معرف الدور كما هو في النظام.',
      select_role: 'اختر الدور',
      delete: 'حذف',
      delete_confirm: 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن تراجع هذا الإجراء.',
      delete_ok: 'تم حذف المستخدم بنجاح',
      delete_failed: 'فشل حذف المستخدم',
      leave_empty_to_keep: 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية',
      shiftStartTime: 'بداية الشفت',
      shiftEndTime: 'نهاية الشفت',
      shift: 'الشفت',
      shift_required_start: 'Shift start time is required for cashier users',
      shift_required_end: 'Shift end time is required for cashier users',
      shift_required_pair: 'Shift start time and shift end time must be provided together',
      shift_cashier_only: 'Shift time is allowed only for EntranceCashier and ExitCashier roles',
      shift_invalid_format: 'Shift time must be in 24-hour HH:mm format',
    },
    en: {
      users: 'Users',
      users_management_subtitle: 'Manage system users, roles, and permissions',
      users_list: 'Users List',
      total: 'Total',
      add_new: 'Add New',
      id: '#',
      name: 'Name',
      email: 'Email',
      role: 'Role',
      status: 'Status',
      actions: 'Actions',
      admin: 'Admin',
      user: 'User',
      edit: 'Edit',
      no_users: 'No users',
      close: 'Close',
      edit_user: 'Edit User',
      add_user: 'Add New User',
      create: 'Create',
      save: 'Save',
      cancel: 'Cancel',
      invalid_email: 'Invalid email',
      required: 'Required',
      saving: 'Saving...',
      loading: 'Loading...',
      created_ok: 'Created successfully',
      updated_ok: 'Saved successfully',
      failed_load: 'Failed to load users',
      failed_save: 'Failed to save',
      password: 'Password',
      change_password: 'Change Password',
      cancel_password_change: 'Cancel Password Change',
      show_password: 'Show password',
      hide_password: 'Hide password',
      phone: 'Phone',
      nationalId: 'National ID',
      roleId: 'Role Id',
      role_hint: 'Enter the role ID as configured in the system.',
      select_role: 'Select role',
      delete: 'Delete',
      delete_confirm: 'Are you sure you want to delete this user? This action cannot be undone.',
      delete_ok: 'User deleted successfully',
      delete_failed: 'Failed to delete user',
      leave_empty_to_keep: 'Leave empty to keep current',
      shiftStartTime: 'Shift Start Time',
      shiftEndTime: 'Shift End Time',
      shift: 'Shift',
      shift_required_start: 'Shift start time is required for cashier users',
      shift_required_end: 'Shift end time is required for cashier users',
      shift_required_pair: 'Shift start time and shift end time must be provided together',
      shift_cashier_only: 'Shift time is allowed only for EntranceCashier and ExitCashier roles',
      shift_invalid_format: 'Shift time must be in 24-hour HH:mm format',
    },
  };

  t = (k: string) => this.i18n.translate(this.dict, k);
  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  users: UserDto[] = [];
  loading = false;
  saving = false;

  showForm = false;
  isEdit = false;
  showPassword = false;
  changePasswordMode = false;

  roles: RoleDto[] = [];
  rolesLoading = false;

  model: Partial<UserDto & UserCreateDto> = {
    id: undefined as any,
    userName: '',
    email: '',
    roleId: '',
    roleName: '',
    password: '',
    phoneNumber: '',
    nationalId: '',
    shiftStartTime: null,
    shiftEndTime: null,
  };

  constructor() {
    this.reload();
    this.loadRoles();
  }

  trackById = (_: number, u: UserDto) => u.id;

  compareRoleIds(o1: string, o2: string): boolean {
    if (!o1 || !o2) return o1 === o2;
    return String(o1).toLowerCase() === String(o2).toLowerCase();
  }

  reload() {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (list) => {
        this.users = list ?? [];
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
      },
    });
  }

  loadRoles() {
    this.rolesLoading = true;
    this.svc.getRoles().subscribe({
      next: (list) => {
        this.roles = list ?? [];
        this.rolesLoading = false;
      },
      error: (err) => {
        this.rolesLoading = false;
      },
    });
  }

  openAdd() {
    this.isEdit = false;
    this.model = {
      id: undefined as any,
      userName: '',
      email: '',
      roleId: '',
      roleName: '',
      password: '',
      phoneNumber: '',
      nationalId: '',
      shiftStartTime: null,
      shiftEndTime: null,
    };
    this.showPassword = false;
    this.changePasswordMode = true;
    this.showForm = true;
  }

  openEdit(u: UserDto) {
    this.isEdit = true;

    let rId = u.roleId;
    if (!rId && u.roleName) {
      const found = this.roles.find((r) => r.name.toLowerCase() === u.roleName.toLowerCase());
      if (found) rId = found.id;
    }

    this.model = {
      id: u.id,
      userName: u.name,
      email: u.email,
      roleId: rId,
      roleName: u.roleName,
      password: '',
      phoneNumber: u.phoneNumber ?? '',
      nationalId: u.nationalId ?? '',
      shiftStartTime: this.toTimeInputValue(u.shiftStartTime),
      shiftEndTime: this.toTimeInputValue(u.shiftEndTime),
    };
    this.showPassword = false;
    this.changePasswordMode = false;
    this.showForm = true;
  }

  cancel() {
    if (this.saving) return;
    this.showForm = false;
  }

  toggleChangePassword(): void {
    this.changePasswordMode = !this.changePasswordMode;
    this.showPassword = false;
    this.model.password = '';
  }

  private isValidEmail(v?: string) {
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  isCashierRoleSelected(roleId: string | null | undefined = this.model.roleId): boolean {
    return isCashierRole(roleId);
  }

  onRoleChanged(roleId: string): void {
    this.model.roleId = roleId;
    if (!this.isCashierRoleSelected(roleId)) {
      this.model.shiftStartTime = null;
      this.model.shiftEndTime = null;
    }
  }

  private toTimeInputValue(value: string | null | undefined): string | null {
    return this.normalizeShiftTime(value);
  }

  private normalizeShiftTime(value: string | null | undefined): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const dayTimeMatch = raw.match(/^0\.([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/);
    if (dayTimeMatch) {
      return `${dayTimeMatch[1]}:${dayTimeMatch[2]}`;
    }

    const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) return null;

    return `${match[1]}:${match[2]}`;
  }

  private getShiftPayload(roleId: string): {
    shiftStartTime: string | null;
    shiftEndTime: string | null;
  } | null {
    const start = this.normalizeShiftTime(this.model.shiftStartTime);
    const end = this.normalizeShiftTime(this.model.shiftEndTime);
    const hasStart = !!String(this.model.shiftStartTime ?? '').trim();
    const hasEnd = !!String(this.model.shiftEndTime ?? '').trim();

    if (!this.isCashierRoleSelected(roleId)) {
      this.model.shiftStartTime = null;
      this.model.shiftEndTime = null;

      return {
        shiftStartTime: null,
        shiftEndTime: null,
      };
    }

    if (hasStart !== hasEnd) {
      this.toast.warn(this.t('shift_required_pair'));
      return null;
    }

    if (hasStart && !start) {
      this.toast.warn(this.t('shift_invalid_format'));
      return null;
    }

    if (hasEnd && !end) {
      this.toast.warn(this.t('shift_invalid_format'));
      return null;
    }

    if (!start) {
      this.toast.warn(this.t('shift_required_start'));
      return null;
    }

    if (!end) {
      this.toast.warn(this.t('shift_required_end'));
      return null;
    }

    return {
      shiftStartTime: start,
      shiftEndTime: end,
    };
  }

  formatShiftRange(u: UserDto): string {
    const start = this.normalizeShiftTime(u.shiftStartTime);
    const end = this.normalizeShiftTime(u.shiftEndTime);
    if (!start || !end) return '---';

    return `${start} -> ${end}`;
  }

  save() {
    if (this.saving) return;

    const userName = (this.model.userName ?? '').trim();
    const email = (this.model.email ?? '').trim();
    const roleId = (this.model.roleId ?? '').trim();

    if (!userName) {
      this.toast.warn(`${this.t('name')}: ${this.t('required')}`);
      return;
    }
    if (!email || !this.isValidEmail(email)) {
      this.toast.warn(`${this.t('email')}: ${this.t('invalid_email')}`);
      return;
    }
    if (!roleId) {
      this.toast.warn(`${this.t('role')}: ${this.t('required')}`);
      return;
    }

    const shiftPayload = this.getShiftPayload(roleId);
    if (!shiftPayload) return;

    if (this.isEdit) {
      // ======== UPDATE ========
      const id = this.model.id as string;
      const payload: UserUpdateDto = {
        id,
        userName,
        email,
        roleId,
        password: this.changePasswordMode ? this.model.password?.trim() || null : null,
        shiftStartTime: shiftPayload.shiftStartTime,
        shiftEndTime: shiftPayload.shiftEndTime,
      };

      console.log('Saving user update', payload);

      this.saving = true;
      this.svc.update(payload).subscribe({
        next: (res) => {
          const idx = this.users.findIndex((u) => u.id === id);
          if (idx !== -1) {
            const old = this.users[idx];
            const roleName = this.roles.find((r) => r.id === roleId)?.name || old.roleName;

            this.users[idx] = {
              ...old,
              name: userName,
              email,
              roleId,
              roleName,
              shiftStartTime: shiftPayload.shiftStartTime,
              shiftEndTime: shiftPayload.shiftEndTime,
            };
          }

          this.toast.fromSuccess(res, this.t('updated_ok'));
          this.showForm = false;
          this.saving = false;
        },
        error: (err) => {
          this.saving = false;
          // Global interceptor handles the toast
        },
      });
    } else {
      // ======== ADD ========
      const password = (this.model.password ?? '').trim();
      const phoneNumber = (this.model.phoneNumber ?? '').trim();
      const nationalId = (this.model.nationalId ?? '').trim();

      if (!password) {
        this.toast.warn(`${this.t('password')}: ${this.t('required')}`);
        return;
      }
      if (!phoneNumber) {
        this.toast.warn(`${this.t('phone')}: ${this.t('required')}`);
        return;
      }
      if (!nationalId) {
        this.toast.warn(`${this.t('nationalId')}: ${this.t('required')}`);
        return;
      }

      const payload: UserCreateDto = {
        name: userName,
        userName,
        email,
        password,
        phoneNumber,
        nationalId,
        roleId,
        shiftStartTime: shiftPayload.shiftStartTime,
        shiftEndTime: shiftPayload.shiftEndTime,
      };

      console.log('Saving new user', payload);

      this.saving = true;
      this.svc.add(payload).subscribe({
        next: (res: any) => {
          if (res && res.id) {
            const responseRoleId = res.roleId || roleId;
            const roleName = this.roles.find((r) => r.id === responseRoleId)?.name || res.roleName;

            const newUser: UserDto = {
              id: res.id,
              name: res.name,
              email: res.email,
              roleId: responseRoleId,
              roleName,
              shiftStartTime: res.shiftStartTime ?? shiftPayload.shiftStartTime,
              shiftEndTime: res.shiftEndTime ?? shiftPayload.shiftEndTime,
            };

            this.users = [...this.users, newUser];
          } else {
            this.reload();
          }

          this.toast.fromSuccess(res, this.t('created_ok'));
          this.showForm = false;
          this.saving = false;
        },
        error: (err) => {
          this.saving = false;
          // Global interceptor handles the toast
        },
      });
    }
  }
  deleteUser(u: UserDto) {
    if (!confirm(this.t('delete_confirm'))) return;

    this.svc.delete(u.id).subscribe({
      next: (res) => {
        this.users = this.users.filter((item) => item.id !== u.id);
        this.toast.fromSuccess(res, this.t('delete_ok'));
      },
      error: (err) => {
        // Global interceptor handles the toast
      },
    });
  }

  startUsersTour() {
    this.usersTour.startTour({
      ensureFormOpen: () => {
        if (!this.showForm) {
          this.openAdd();
        }
      },
    });
  }
}
