import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserDto, UserCreateDto, UserUpdateDto, RoleDto } from '../../Domain/Users/user.model';
import { UsersServices } from '../../Services/Users/users-services';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { ToastServices } from '../../Services/Toster/toast-services';
import { UsersTourService } from '../../Services/Users/users-tour.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.css',
})
export class Users {
  private svc = inject(UsersServices);
  private toast = inject(ToastServices);
  i18n = inject(LanguageService);
  private usersTour = inject(UsersTourService);

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
      password: 'كلمة المرور',
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
      password: 'Password',
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
    },
  };

  t = (k: string) => this.dict[this.i18n.current]?.[k] ?? k;
  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  users: UserDto[] = [];
  loading = false;
  saving = false;

  showForm = false;
  isEdit = false;
  showPassword = false;

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
        this.toast.fromProblem(err);
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
        this.toast.fromProblem(err);
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
    this.showPassword = false;
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
      phoneNumber: u.phoneNumber ?? '',
      nationalId: u.nationalId ?? '',
    };
    this.showPassword = false;
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

    if (this.isEdit) {
      // ======== UPDATE ========
      const id = this.model.id as string;
      const payload: UserUpdateDto = {
        id,
        userName,
        email,
        roleId,
        password: this.model.password?.trim() || undefined,
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
              userName,
              email,
              roleId,
              roleName,
            };
          }

          this.toast.fromSuccess(res);
          this.showForm = false;
          this.saving = false;
        },
        error: (err) => {
          this.saving = false;
          this.toast.fromProblem(err);
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
      };

      console.log('Saving new user', payload);

      this.saving = true;
      this.svc.add(payload).subscribe({
        next: (res: any) => {
          if (res && res.id) {
            const roleName = this.roles.find((r) => r.id === res.roleId)?.name || res.roleName;

            const newUser: UserDto = {
              id: res.id,
              userName: res.userName,
              email: res.email,
              roleId: res.roleId,
              roleName,
            };

            this.users = [...this.users, newUser];
          } else {
            this.reload();
          }

          this.toast.fromSuccess(res);
          this.showForm = false;
          this.saving = false;
        },
        error: (err) => {
          this.saving = false;
          this.toast.fromProblem(err);
        },
      });
    }
  }
  deleteUser(u: UserDto) {
    if (!confirm(this.t('delete_confirm'))) return;

    this.svc.delete(u.id).subscribe({
      next: (res) => {
        this.users = this.users.filter((item) => item.id !== u.id);
        this.toast.fromSuccess(res || this.t('delete_ok'));
      },
      error: (err) => {
        this.toast.fromProblem(err || this.t('delete_failed'));
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
