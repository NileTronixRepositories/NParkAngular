import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserDto, UserCreateDto, UserUpdateDto } from '../../Domain/Users/user.model';
import { UsersServices } from '../../Services/Users/users-services';

import { LanguageService, AppLang } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  private svc = inject(UsersServices);
  i18n = inject(LanguageService);

  // i18n
  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      users: 'المستخدمون',
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
      add_not_supported: 'إضافة مستخدم جديد تتم من خلال النظام الداخلي، يمكن تعديل البريد فقط.',
      password: 'كلمة المرور',
      phone: 'الجوال',
      nationalId: 'الهوية الوطنية',
      roleId: 'معرّف الدور',
      role_hint: 'أدخل معرف الدور كما هو في النظام.',
    },
    en: {
      users: 'Users',
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
      add_not_supported: 'Creating users is managed from the backend. You can edit email only.',
      password: 'Password',
      phone: 'Phone',
      nationalId: 'National ID',
      roleId: 'Role Id',
      role_hint: 'Enter the role ID as configured in the system.',
    },
  };

  t = (k: string) => this.dict[this.i18n.current]?.[k] ?? k;
  dir = () => this.i18n.dir();
  isRTL = () => this.i18n.isRTL();

  // state
  users: UserDto[] = [];
  loading = false;
  saving = false;

  showForm = false;
  isEdit = false;

  model: Partial<UserDto & UserCreateDto> = {
    id: undefined as any,
    userName: '',
    email: '',
    roleId: '',
    roleName: '',
    password: '',
    phoneNumber: '',
    nationalId: '',
  };

  constructor() {
    this.reload();
  }

  trackById = (_: number, u: UserDto) => u.id;

  reload() {
    this.loading = true;
    this.svc.getAll().subscribe({
      next: (list) => {
        this.users = list ?? [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert(this.t('failed_load'));
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
    };
    this.showForm = true;
  }

  openEdit(u: UserDto) {
    this.isEdit = true;
    this.model = {
      id: u.id,
      userName: u.userName,
      email: u.email,
      roleId: u.roleId,
      roleName: u.roleName,

      password: '',
      phoneNumber: '',
      nationalId: '',
    };
    this.showForm = true;
  }

  cancel() {
    if (this.saving) return;
    this.showForm = false;
  }

  private isValidEmail(v?: string) {
    if (!v) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  }

  save() {
    if (this.saving) return;

    const userName = (this.model.userName ?? '').trim();
    const email = (this.model.email ?? '').trim();

    if (!userName) {
      alert(`${this.t('name')}: ${this.t('required')}`);
      return;
    }
    if (!email || !this.isValidEmail(email)) {
      alert(`${this.t('email')}: ${this.t('invalid_email')}`);
      return;
    }

    if (this.isEdit) {
      // ======== UPDATE ========
      if (!this.model.id || !this.model.roleId) {
        alert(this.t('failed_save'));
        return;
      }

      const payload: UserUpdateDto = {
        id: this.model.id,
        userName,
        email,
        roleId: this.model.roleId,
      };

      this.saving = true;
      this.svc.update(payload).subscribe({
        next: () => {
          alert(this.t('updated_ok'));
          this.showForm = false;
          this.reload();
          this.saving = false;
        },
        error: (err) => {
          this.saving = false;

          if (err?.status === 400 && err.error) {
            if (Array.isArray(err.error.errors)) {
              const msg = err.error.errors.map((e: any) => e.message ?? e).join('\n');
              alert(msg);
            } else if (typeof err.error === 'string') {
              alert(err.error);
            } else if (err.error.title) {
              alert(err.error.title);
            } else {
              alert(this.t('failed_save'));
            }
          } else if (err?.status === 422 && err.error?.errors?.length) {
            const msg = err.error.errors.map((e: any) => e.message).join('\n');
            alert(msg);
          } else {
            alert(this.t('failed_save'));
          }
        },
      });
    } else {
      // ======== ADD ========
      const password = (this.model.password ?? '').trim();
      const phoneNumber = (this.model.phoneNumber ?? '').trim();
      const nationalId = (this.model.nationalId ?? '').trim();
      const roleId = (this.model.roleId ?? '').trim();

      if (!password) {
        alert(`${this.t('password')}: ${this.t('required')}`);
        return;
      }
      if (!phoneNumber) {
        alert(`${this.t('phone')}: ${this.t('required')}`);
        return;
      }
      if (!nationalId) {
        alert(`${this.t('nationalId')}: ${this.t('required')}`);
        return;
      }
      if (!roleId) {
        alert(`${this.t('role')}: ${this.t('required')}`);
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
      };

      this.saving = true;
      this.svc.add(payload).subscribe({
        next: () => {
          alert(this.t('created_ok'));
          this.showForm = false;
          this.reload();
          this.saving = false;
        },
        error: (err) => {
          this.saving = false;

          if (err?.status === 422 && err.error?.errors?.length) {
            const msg = err.error.errors.map((e: any) => e.message).join('\n');
            alert(msg);
          } else {
            alert(this.t('failed_save'));
          }
        },
      });
    }
  }
}
