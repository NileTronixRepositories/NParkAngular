import { Component, DestroyRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule, NgIf, NgFor, NgClass } from '@angular/common';
import { RouterModule } from '@angular/router';

import {
  DurationType,
  PricingSchemaRow,
} from '../../Domain/Subscription-type/subscription-type.models';

import { SubscriptionType } from '../../Services/subscription-type/subscription-type';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { ToastServices } from '../../Services/Toster/toast-services';

import {
  EnterPricingSchemaUpdateDto,
  PricingSchemaAddDto,
  PricingSchemaUpdateRequest,
  PricingSchemaUpdateDto,
} from '../../Domain/Subscription-type/subscription-type.models';
import { AltaeriffaTourService } from '../../Services/AltaeriffaTour/Altaeriffa-tour.service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';

type FormShape = {
  id: FormControl<string | null>;
  name: FormControl<string>;
  durationType: FormControl<DurationType>;
  startTime: FormControl<string | null>;
  endTime: FormControl<string | null>;
  price: FormControl<number | null>;
  isRepeated: FormControl<boolean>;
  totalHours: FormControl<number | null>;
  totalDays: FormControl<number | null>;
};

type EnterPriceFormShape = {
  name: FormControl<string>;
  salary: FormControl<number | null>;
};

@Component({
  selector: 'app-Altaeriffa-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, TranslatePipePipe],
  templateUrl: './Altaeriffa-component.html',
  styleUrl: './Altaeriffa-component.css',
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>{
        ar: {
          title: 'شريحة المحاسبة',
          add: 'إضافة',
          edit: 'تعديل',
          field_name: 'اسم الشريحة',
          name_placeholder: 'مثال: اشتراك شهري / Hourly Pass',
          name_required: 'الاسم مطلوب (حد أدنى 2 حرف).',
          duration_type: 'نوع المدة',
          hours: 'بالساعات',
          days: 'بالأيام',
          year: 'بالسنة',
          hours_short: 'ساعات',
          days_short: 'أيام',
          year_short: 'سنة',
          repeated: 'حساب متكرر',
          from: 'من',
          to: 'إلى',
          total_hours: 'إجمالي الساعات',
          total_hours_required: 'إجمالي الساعات مطلوب (حد أدنى 1).',
          total_days: 'إجمالي الأيام',
          total_days_required: 'إجمالي الأيام مطلوب (حد أدنى 1).',
          price_label: '(جنيه) السعر',
          price_required: 'السعر مطلوب ويجب أن يكون 0 أو أكثر.',
          enter_price_title: 'سعر تذكرة الدخول',
          enter_price_hint: 'إنشاء سعر دخول باستخدام الاسم والسعر فقط.',
          enter_price_name: 'اسم سعر الدخول',
          enter_price_salary: 'سعر الدخول',
          enter_price_salary_required: 'سعر الدخول مطلوب ويجب أن يكون أكبر من 0.',
          enter_price_add: 'إنشاء سعر دخول',
          enter_price_added_success: 'تم إنشاء سعر الدخول بنجاح',
          enter_price_badge: 'سعر دخول',
          enter_price_validation: 'الاسم وسعر أكبر من 0 مطلوبان.',
          enter_price_edit_disabled: 'سعر الدخول لا يتم تعديله من فورم التعريفة العادية.',
          reset: 'إعادة ضبط',
          save: 'حفظ',
          list_title: 'قائمة الشرائح',
          search_placeholder: 'بحث...',
          col_index: '#',
          col_name: 'الاسم',
          col_type: 'النوع',
          col_from: 'من',
          col_to: 'إلى',
          col_price: 'السعر',
          col_actions: 'إجراءات',
          edit_action: 'تعديل',
          delete_action: 'حذف',
          empty_search: 'لا توجد بيانات مطابقة للبحث.',
          total_footer: 'إجمالي',
          page: 'صفحة',
          of: 'من',
          next: 'التالي',
          prev: 'السابق',
          last_n_hint: 'يظهر آخر',
          slice_hint: 'شريحة.',
          back_dashboard: 'عودة للوحة التحكم',
          confirm_delete: 'هل أنت متأكد من الحذف؟',
          errors_title: 'أخطاء في البيانات:',
          err_name: 'الاسم مطلوب ويجب أن يكون على الأقل حرفين',
          err_price: 'السعر مطلوب ويجب أن يكون 0 أو أكثر',
          err_enter_price: 'سعر الدخول مطلوب ويجب أن يكون أكبر من 0',
          err_days: 'إجمالي الأيام مطلوب ويجب أن يكون 1 أو أكثر',
          err_hours: 'إجمالي الساعات مطلوب ويجب أن يكون 1 أو أكثر',
          err_time_needed: 'وقت البداية والنهاية مطلوبان عندما لا يكون الحساب متكرر',
          server_error: 'حدث خطأ في الخادم:',
          validation_errors: 'أخطاء التحقق:',
          status: 'الحالة',
          traceId: 'رقم التتبع',
          type: 'النوع',
          conn_error: 'خطأ في الاتصال',
          unexpected_error: 'حدث خطأ غير متوقع',
          time_window_off: '-',
          loading: 'جاري التحميل…',
          total_label: 'إجمالي',
          added_success: 'تمت الإضافة بنجاح',
          updated_success: 'تم التعديل بنجاح',
          deleted_success: 'تم الحذف بنجاح',
          helpTour: 'شرح الواجهة',
        },
        en: {
          title: 'Pricing Scheme',
          add: 'Add',
          edit: 'Edit',
          field_name: 'Name',
          name_placeholder: 'e.g., Monthly Pass / Hourly Pass',
          name_required: 'Name is required (min 2 chars).',
          duration_type: 'Duration Type',
          hours: 'Hours',
          days: 'Days',
          year: 'Year',
          hours_short: 'Hours',
          days_short: 'Days',
          year_short: 'Year',
          repeated: 'Repeated',
          from: 'From',
          to: 'To',
          total_hours: 'Total Hours',
          total_hours_required: 'Total hours is required (min 1).',
          total_days: 'Total Days',
          total_days_required: 'Total days is required (min 1).',
          price_label: 'Price (EGP)',
          price_required: 'Price is required and must be ≥ 0.',
          enter_price_title: 'Enter ticket price',
          enter_price_hint: 'Create a dedicated entry ticket price using name and salary only.',
          enter_price_name: 'Name',
          enter_price_salary: 'Salary',
          enter_price_salary_required: 'Salary is required and must be greater than 0.',
          enter_price_add: 'Create enter price',
          enter_price_added_success: 'Enter price schema created successfully',
          enter_price_badge: 'Enter price',
          enter_price_validation: 'Name and salary greater than 0 are required.',
          enter_price_edit_disabled:
            'Enter price schemas cannot be edited from the normal schema form.',
          reset: 'Reset',
          save: 'Save',
          list_title: 'Schemes',
          search_placeholder: 'Search...',
          col_index: '#',
          col_name: 'Name',
          col_type: 'Type',
          col_from: 'From',
          col_to: 'To',
          col_price: 'Price',
          col_actions: 'Actions',
          edit_action: 'Edit',
          delete_action: 'Delete',
          empty_search: 'No matching data.',
          total_footer: 'Total',
          page: 'Page',
          of: 'of',
          next: 'Next',
          prev: 'Prev',
          last_n_hint: 'Showing last',
          slice_hint: 'slice(s).',
          back_dashboard: 'Back to dashboard',
          confirm_delete: 'Are you sure to delete?',
          errors_title: 'Validation errors:',
          err_name: 'Name is required (min 2 chars).',
          err_price: 'Price is required and must be ≥ 0.',
          err_enter_price: 'Enter price is required and must be greater than 0.',
          err_days: 'Total days is required and must be ≥ 1.',
          err_hours: 'Total hours is required and must be ≥ 1.',
          err_time_needed: 'Start/End time are required when not repeated.',
          server_error: 'Server error:',
          validation_errors: 'Validation errors:',
          status: 'Status',
          traceId: 'TraceId',
          type: 'Type',
          conn_error: 'Connection error',
          unexpected_error: 'Unexpected error',
          time_window_off: '-',
          loading: 'Loading…',
          total_label: 'Total',
          added_success: 'Added successfully',
          updated_success: 'Updated successfully',
          deleted_success: 'Deleted successfully',
          helpTour: 'Help Tour',
        },
      },
    },
  ],
})
export class AltaeriffaComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private destroyRef = inject(DestroyRef);
  private api = inject(SubscriptionType);
  private toast = inject(ToastServices);
  private AltaeriffaTourService = inject(AltaeriffaTourService);
  public DurationType = DurationType;

  // ===== i18n =====
  public i18n = inject(LanguageService);
  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      title: 'شريحة المحاسبة',
      add: 'إضافة',
      edit: 'تعديل',
      field_name: 'اسم الشريحة',
      name_placeholder: 'مثال: اشتراك شهري / Hourly Pass',
      name_required: 'الاسم مطلوب (حد أدنى 2 حرف).',
      duration_type: 'نوع المدة',
      hours: 'بالساعات',
      days: 'بالأيام',
      year: 'بالسنة',
      hours_short: 'ساعات',
      days_short: 'أيام',
      year_short: 'سنة',
      repeated: 'حساب متكرر',
      from: 'من',
      to: 'إلى',
      total_hours: 'إجمالي الساعات',
      total_hours_required: 'إجمالي الساعات مطلوب (حد أدنى 1).',
      total_days: 'إجمالي الأيام',
      total_days_required: 'إجمالي الأيام مطلوب (حد أدنى 1).',
      price_label: '(جنيه) السعر',
      price_required: 'السعر مطلوب ويجب أن يكون 0 أو أكثر.',
      enter_price_title: 'سعر تذكرة الدخول',
      enter_price_hint: 'إنشاء سعر دخول باستخدام الاسم والسعر فقط.',
      enter_price_name: 'اسم سعر الدخول',
      enter_price_salary: 'سعر الدخول',
      enter_price_salary_required: 'سعر الدخول مطلوب ويجب أن يكون أكبر من 0.',
      enter_price_add: 'إنشاء سعر دخول',
      enter_price_added_success: 'تم إنشاء سعر الدخول بنجاح',
      enter_price_badge: 'سعر دخول',
      enter_price_validation: 'الاسم وسعر أكبر من 0 مطلوبان.',
      enter_price_edit_disabled: 'سعر الدخول لا يتم تعديله من فورم التعريفة العادية.',
      reset: 'إعادة ضبط',
      save: 'حفظ',
      list_title: 'قائمة الشرائح',
      search_placeholder: 'بحث...',
      col_index: '#',
      col_name: 'الاسم',
      col_type: 'النوع',
      col_from: 'من',
      col_to: 'إلى',
      col_price: 'السعر',
      col_actions: 'إجراءات',
      edit_action: 'تعديل',
      delete_action: 'حذف',
      empty_search: 'لا توجد بيانات مطابقة للبحث.',
      total_footer: 'إجمالي',
      page: 'صفحة',
      of: 'من',
      next: 'التالي',
      prev: 'السابق',
      last_n_hint: 'يظهر آخر',
      slice_hint: 'شريحة.',
      back_dashboard: 'عودة للوحة التحكم',
      confirm_delete: 'هل أنت متأكد من الحذف؟',
      errors_title: 'أخطاء في البيانات:',
      err_name: 'الاسم مطلوب ويجب أن يكون على الأقل حرفين',
      err_price: 'السعر مطلوب ويجب أن يكون 0 أو أكثر',
      err_enter_price: 'سعر الدخول مطلوب ويجب أن يكون أكبر من 0',
      err_days: 'إجمالي الأيام مطلوب ويجب أن يكون 1 أو أكثر',
      err_hours: 'إجمالي الساعات مطلوب ويجب أن يكون 1 أو أكثر',
      err_time_needed: 'وقت البداية والنهاية مطلوبان عندما لا يكون الحساب متكرر',
      server_error: 'حدث خطأ في الخادم:',
      validation_errors: 'أخطاء التحقق:',
      status: 'الحالة',
      traceId: 'رقم التتبع',
      type: 'النوع',
      conn_error: 'خطأ في الاتصال',
      unexpected_error: 'حدث خطأ غير متوقع',
      time_window_off: '-',
      loading: 'جاري التحميل…',
      total_label: 'إجمالي',
      added_success: 'تمت الإضافة بنجاح',
      updated_success: 'تم التعديل بنجاح',
      deleted_success: 'تم الحذف بنجاح',
    },
    en: {
      title: 'Pricing Scheme',
      add: 'Add',
      edit: 'Edit',
      field_name: 'Name',
      name_placeholder: 'e.g., Monthly Pass / Hourly Pass',
      name_required: 'Name is required (min 2 chars).',
      duration_type: 'Duration Type',
      hours: 'Hours',
      days: 'Days',
      year: 'Year',
      hours_short: 'Hours',
      days_short: 'Days',
      year_short: 'Year',
      repeated: 'Repeated',
      from: 'From',
      to: 'To',
      total_hours: 'Total Hours',
      total_hours_required: 'Total hours is required (min 1).',
      total_days: 'Total Days',
      total_days_required: 'Total days is required (min 1).',
      price_label: 'Price (EGP)',
      price_required: 'Price is required and must be ≥ 0.',
      enter_price_title: 'Enter ticket price',
      enter_price_hint: 'Create a dedicated entry ticket price using name and salary only.',
      enter_price_name: 'Name',
      enter_price_salary: 'Salary',
      enter_price_salary_required: 'Salary is required and must be greater than 0.',
      enter_price_add: 'Create enter price',
      enter_price_added_success: 'Enter price schema created successfully',
      enter_price_badge: 'Enter price',
      enter_price_validation: 'Name and salary greater than 0 are required.',
      enter_price_edit_disabled:
        'Enter price schemas cannot be edited from the normal schema form.',
      reset: 'Reset',
      save: 'Save',
      list_title: 'Schemes',
      search_placeholder: 'Search...',
      col_index: '#',
      col_name: 'Name',
      col_type: 'Type',
      col_from: 'From',
      col_to: 'To',
      col_price: 'Price',
      col_actions: 'Actions',
      edit_action: 'Edit',
      delete_action: 'Delete',
      empty_search: 'No matching data.',
      total_footer: 'Total',
      page: 'Page',
      of: 'of',
      next: 'Next',
      prev: 'Prev',
      last_n_hint: 'Showing last',
      slice_hint: 'slice(s).',
      back_dashboard: 'Back to dashboard',
      confirm_delete: 'Are you sure to delete?',
      errors_title: 'Validation errors:',
      err_name: 'Name is required (min 2 chars).',
      err_price: 'Price is required and must be ≥ 0.',
      err_enter_price: 'Enter price is required and must be greater than 0.',
      err_days: 'Total days is required and must be ≥ 1.',
      err_hours: 'Total hours is required and must be ≥ 1.',
      err_time_needed: 'Start/End time are required when not repeated.',
      server_error: 'Server error:',
      validation_errors: 'Validation errors:',
      status: 'Status',
      traceId: 'TraceId',
      type: 'Type',
      conn_error: 'Connection error',
      unexpected_error: 'Unexpected error',
      time_window_off: '-',
      loading: 'Loading…',
      total_label: 'Total',
      added_success: 'Added successfully',
      updated_success: 'Updated successfully',
      deleted_success: 'Deleted successfully',
    },
  };

  startTour() {
    this.AltaeriffaTourService.startTour();
  }

  t = (key: string) => this.i18n.translate(this.dict, key);
  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  // ===== Paging =====
  page = signal(1);
  pageSize = signal(10);
  totalPages = signal(1);
  totalItems = signal(0);
  hasPrev = computed(() => this.page() > 1);
  hasNext = signal(false);

  // ===== Data/UI =====
  loading = signal(false);
  saving = signal(false);
  savingEnterPrice = signal(false);
  rows = signal<PricingSchemaRow[]>([]);
  query = signal<string>('');
  activeFilter = signal<'all' | 'enter' | 'hours' | 'days' | 'year'>('all');
  activeFormTab = signal<'scheme' | 'enter'>('scheme');
  mobileSheetOpen = signal(false);
  private editingRowId = signal<string | null>(null);
  private editingEnterPriceSchema = signal(false);

  form = this.fb.group<FormShape>({
    id: this.fb.control<string | null>(null),
    name: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    durationType: this.fb.control<DurationType>(DurationType.Days, { nonNullable: true }),
    startTime: this.fb.control<string | null>(null),
    endTime: this.fb.control<string | null>(null),
    price: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0)],
    }),
    isRepeated: this.fb.control<boolean>(false, { nonNullable: true }),
    totalHours: this.fb.control<number | null>(null),
    totalDays: this.fb.control<number | null>(1, { validators: [Validators.min(1)] }),
  });

  enterPriceForm = this.fb.group<EnterPriceFormShape>({
    name: this.fb.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    salary: this.fb.control<number | null>(null, {
      validators: [Validators.required, Validators.min(0.01)],
    }),
  });

  filtered = computed(() => {
    const q = (this.query() || '').trim().toLowerCase();
    const filter = this.activeFilter();
    let data = this.rows();

    if (filter === 'enter') {
      data = data.filter((r) => !!r.isEnterPriceSchema);
    } else if (filter === 'hours') {
      data = data.filter((r) => r.durationType === DurationType.Hours);
    } else if (filter === 'days') {
      data = data.filter((r) => r.durationType === DurationType.Days);
    } else if (filter === 'year') {
      data = data.filter((r) => r.durationType === DurationType.Year);
    }

    if (!q) return data;
    return data.filter(
      (r) =>
        (r.name || '').toLowerCase().includes(q) ||
        this.durationLabel(r.durationType).toLowerCase().includes(q),
    );
  });

  setFilter(filter: 'all' | 'enter' | 'hours' | 'days' | 'year'): void {
    this.activeFilter.set(filter);
  }

  setFormTab(tab: 'scheme' | 'enter'): void {
    if (tab === 'enter' && this.editingRowId()) {
      this.resetForm();
    }
    this.activeFormTab.set(tab);
  }

  openMobileSheet(tab: 'scheme' | 'enter' = 'scheme'): void {
    this.setFormTab(tab);
    this.mobileSheetOpen.set(true);
  }

  closeMobileSheet(): void {
    this.mobileSheetOpen.set(false);
  }

  clearSearch(): void {
    this.query.set('');
  }

  showTimeForRow(r: PricingSchemaRow): boolean {
    return r.durationType === DurationType.Hours && r.isRepeated === false;
  }
  onSearch(q: string) {
    this.query.set(q);
    this.page.set(1);
    this.loadRows();
  }

  // ===== Flags =====
  isDays(): boolean {
    return this.form.controls.durationType.value === DurationType.Days;
  }
  isHours(): boolean {
    return this.form.controls.durationType.value === DurationType.Hours;
  }
  isYear(): boolean {
    return this.form.controls.durationType.value === DurationType.Year;
  }

  showIsRepeated(): boolean {
    return this.isHours();
  }
  showRangeWindow(): boolean {
    return this.isHours() && this.form.controls.isRepeated.value === false;
  }

  private toHms(t?: string | null): string | null {
    if (!t) return null;
    if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
    return null;
  }
  private toHmForInput(t?: string | null): string | null {
    if (!t) return null;
    const m = t.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
    return m ? `${m[1]}:${m[2]}` : null;
  }

  // ===== Validation rules =====
  private updateTimeAndModeRules() {
    const isEnterEdit = this.editingEnterPriceSchema();
    const dt = this.form.controls.durationType.value;
    const isRep = this.form.controls.isRepeated.value;

    // reset validators
    this.form.controls.startTime.clearValidators();
    this.form.controls.endTime.clearValidators();
    this.form.controls.totalDays.clearValidators();
    this.form.controls.totalHours.clearValidators();

    this.form.controls.price.setValidators([
      Validators.required,
      Validators.min(isEnterEdit ? 0.01 : 0),
    ]);

    if (isEnterEdit) {
      this.form.controls.durationType.setValue(DurationType.Days, { emitEvent: false });
      this.form.controls.startTime.setValue(null, { emitEvent: false });
      this.form.controls.endTime.setValue(null, { emitEvent: false });
      this.form.controls.isRepeated.setValue(false, { emitEvent: false });
      this.form.controls.totalHours.setValue(null, { emitEvent: false });
      this.form.controls.totalDays.setValue(null, { emitEvent: false });
      this.form.controls.startTime.updateValueAndValidity({ emitEvent: false });
      this.form.controls.endTime.updateValueAndValidity({ emitEvent: false });
      this.form.controls.totalDays.updateValueAndValidity({ emitEvent: false });
      this.form.controls.totalHours.updateValueAndValidity({ emitEvent: false });
      this.form.controls.price.updateValueAndValidity({ emitEvent: false });
      return;
    }

    if (dt === DurationType.Days) {
      this.form.controls.totalDays.setValidators([Validators.required, Validators.min(1)]);
      this.form.controls.totalHours.setValue(null, { emitEvent: false });
      this.form.controls.startTime.setValue(null, { emitEvent: false });
      this.form.controls.endTime.setValue(null, { emitEvent: false });
      this.form.controls.isRepeated.setValue(false, { emitEvent: false });
    }

    if (dt === DurationType.Hours) {
      this.form.controls.totalHours.setValidators([Validators.required, Validators.min(1)]);
      this.form.controls.totalDays.setValue(null, { emitEvent: false });

      if (isRep) {
        this.form.controls.startTime.setValue(null, { emitEvent: false });
        this.form.controls.endTime.setValue(null, { emitEvent: false });
      } else {
        this.form.controls.startTime.setValidators([Validators.required]);
        this.form.controls.endTime.setValidators([Validators.required]);
      }
    }

    if (dt === DurationType.Year) {
      this.form.controls.totalDays.setValue(null, { emitEvent: false });
      this.form.controls.totalHours.setValue(null, { emitEvent: false });
      this.form.controls.startTime.setValue(null, { emitEvent: false });
      this.form.controls.endTime.setValue(null, { emitEvent: false });
      this.form.controls.isRepeated.setValue(false, { emitEvent: false });
    }

    this.form.controls.startTime.updateValueAndValidity({ emitEvent: false });
    this.form.controls.endTime.updateValueAndValidity({ emitEvent: false });
    this.form.controls.totalDays.updateValueAndValidity({ emitEvent: false });
    this.form.controls.totalHours.updateValueAndValidity({ emitEvent: false });
    this.form.controls.price.updateValueAndValidity({ emitEvent: false });
  }

  // ===== DTO builders =====
  private buildAddDto(): PricingSchemaAddDto {
    const v = this.form.getRawValue();
    const isHours = v.durationType === DurationType.Hours;
    const isDays = v.durationType === DurationType.Days;
    const isYear = v.durationType === DurationType.Year;
    const isRep = !!v.isRepeated;

    const startTime = isHours && !isRep ? this.toHms(v.startTime) : null;
    const endTime = isHours && !isRep ? this.toHms(v.endTime) : null;

    return {
      name: (v.name || '').trim(),
      durationType: v.durationType!,
      startTime: isYear ? null : startTime,
      endTime: isYear ? null : endTime,
      price: Number(v.price ?? 0),
      isRepeated: isHours ? isRep : false,
      totalHours: isHours ? Number(v.totalHours ?? 0) : null,
      totalDays: isDays ? Number(v.totalDays ?? 0) : null,
    };
  }

  private buildUpdateDto(): PricingSchemaUpdateRequest {
    const v = this.form.getRawValue();
    let id = this.editingRowId();
    if ((id === null || id === undefined) && v.id !== null && v.id !== undefined) {
      id = v.id;
    }
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Cannot update without a valid id');
    }

    if (this.editingEnterPriceSchema()) {
      return {
        id,
        name: (v.name || '').trim(),
        price: Number(v.price ?? 0),
        isEnterPriceSchema: true,
      } satisfies EnterPricingSchemaUpdateDto;
    }

    const isHours = v.durationType === DurationType.Hours;
    const isDays = v.durationType === DurationType.Days;
    const isYear = v.durationType === DurationType.Year;
    const isRep = !!v.isRepeated;

    const startTime = isHours && !isRep ? this.toHms(v.startTime) : null;
    const endTime = isHours && !isRep ? this.toHms(v.endTime) : null;

    return {
      id,
      name: (v.name || '').trim(),
      durationType: v.durationType!,
      startTime: isYear ? null : startTime,
      endTime: isYear ? null : endTime,
      price: Number(v.price ?? 0),
      isRepeated: isHours ? isRep : false,
      totalHours: isHours ? Number(v.totalHours ?? 0) : null,
      totalDays: isDays ? Number(v.totalDays ?? 0) : null,
      isEnterPriceSchema: false,
    };
  }

  // ===== Lifecycle =====
  ngOnInit(): void {
    this.loadRows();

    this.form.controls.durationType.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateTimeAndModeRules();
      });
    this.form.controls.isRepeated.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.updateTimeAndModeRules();
      });

    this.updateTimeAndModeRules();
  }

  ngOnDestroy(): void {
    this.AltaeriffaTourService.cancelTour();
  }

  // ===== UI Helpers =====
  editingId(): string | null {
    return this.editingRowId();
  }

  isEditingEnterPriceSchema(): boolean {
    return this.editingEnterPriceSchema();
  }

  setMode(mode: DurationType) {
    if (this.editingEnterPriceSchema()) return;
    this.form.controls.durationType.setValue(mode, { emitEvent: true });
  }

  durationLabel(dt: DurationType | null | undefined): string {
    switch (dt) {
      case DurationType.Hours:
        return this.t('hours_short');
      case DurationType.Days:
        return this.t('days_short');
      case DurationType.Year:
        return this.t('year_short');
      default:
        return '';
    }
  }

  // ===== CRUD =====
  private loadRows() {
    this.loading.set(true);
    this.api.list(this.page(), this.pageSize(), this.query()).subscribe({
      next: (res) => {
        this.rows.set(res.data ?? []);
        this.totalItems.set(res.totalItems ?? 0);
        this.totalPages.set(res.totalPages ?? 1);
        this.hasNext.set(!!res.hasNextPage);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.totalItems.set(0);
        this.totalPages.set(1);
        this.hasNext.set(false);
        this.loading.set(false);
      },
    });
  }

  goPrev() {
    if (!this.hasPrev()) return;
    this.page.update((p) => p - 1);
    this.loadRows();
  }
  goNext() {
    if (!this.hasNext()) return;
    this.page.update((p) => p + 1);
    this.loadRows();
  }

  resetForm() {
    this.editingEnterPriceSchema.set(false);
    this.form.reset({
      id: '',
      name: '',
      durationType: DurationType.Days,
      startTime: null,
      endTime: null,
      price: null,
      isRepeated: false,
      totalHours: null,
      totalDays: 1,
    });
    this.editingRowId.set(null);
    this.mobileSheetOpen.set(false);
    this.updateTimeAndModeRules();
  }

  remove(r: PricingSchemaRow) {
    if (!confirm(this.t('confirm_delete'))) return;
    const id = this.normalizeId(r);
    if (!id) return;

    this.api.delete(id).subscribe({
      next: (res) => {
        this.page.set(1);
        this.loadRows();
        this.toast.fromSuccess(res);
      },
      error: (err) => {
        this.toast.fromProblem(err);
      },
    });
  }

  save() {
    this.updateTimeAndModeRules();
    this.form.markAllAsTouched();

    if (this.form.invalid) return;

    const isEdit = this.editingRowId() !== null && this.editingRowId() !== undefined;
    this.saving.set(true);

    try {
      if (isEdit) {
        const dto = this.buildUpdateDto();
        if (!this.validateDto(dto)) {
          this.saving.set(false);
          return;
        }
        this.api.update(dto).subscribe({
          next: (res) => {
            this.page.set(1);
            this.loadRows();
            this.saving.set(false);
            this.resetForm();
            this.toast.fromSuccess(res);
          },
          error: (err) => {
            this.saving.set(false);
            this.toast.fromProblem(err);
          },
        });
      } else {
        const dto = this.buildAddDto();
        if (!this.validateDto(dto)) {
          this.saving.set(false);
          return;
        }
        this.api.add(dto).subscribe({
          next: (res) => {
            this.page.set(1);
            this.loadRows();
            this.saving.set(false);
            this.resetForm();
            this.toast.fromSuccess(res);
          },
          error: (err) => {
            this.saving.set(false);
            this.toast.fromProblem(err);
          },
        });
      }
    } catch (error: any) {
      this.saving.set(false);
      this.toast.fromProblem(error);
    }
  }

  private validateDto(dto: PricingSchemaAddDto | PricingSchemaUpdateRequest): boolean {
    const errors: string[] = [];

    if (!dto.name || dto.name.trim().length < 2) {
      errors.push(this.t('err_name'));
    }

    if ('isEnterPriceSchema' in dto && dto.isEnterPriceSchema === true) {
      if (dto.price === null || dto.price === undefined || dto.price <= 0) {
        errors.push(this.t('err_enter_price'));
      }
      if (errors.length > 0) {
        this.toast.warn(errors.join('، '), this.t('errors_title'));
        return false;
      }
      return true;
    }

    const normalDto = dto as PricingSchemaAddDto | PricingSchemaUpdateDto;

    if (normalDto.price === null || normalDto.price === undefined || normalDto.price < 0) {
      errors.push(this.t('err_price'));
    }

    if (normalDto.durationType === DurationType.Days) {
      if (!normalDto.totalDays || normalDto.totalDays < 1) {
        errors.push(this.t('err_days'));
      }
    } else if (normalDto.durationType === DurationType.Hours) {
      if (!normalDto.totalHours || normalDto.totalHours < 1) {
        errors.push(this.t('err_hours'));
      }
      if (!normalDto.isRepeated) {
        if (!normalDto.startTime || !normalDto.endTime) {
          errors.push(this.t('err_time_needed'));
        }
      }
    } else if (normalDto.durationType === DurationType.Year) {
      normalDto.totalDays = null;
      normalDto.totalHours = null;
      normalDto.startTime = null;
      normalDto.endTime = null;
      normalDto.isRepeated = false;
    }

    if (errors.length > 0) {
      this.toast.warn(errors.join('، '), this.t('errors_title'));
      return false;
    }
    return true;
  }

  cancelEdit() {
    this.resetForm();
  }

  public normalizeId(obj: any): string | null {
    const v = obj?.id ?? obj?.Id ?? obj?.pricingSchemaId ?? obj?.PricingSchemaId ?? null;
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s.length ? s : null;
  }

  private focusForm() {
    const el = document.querySelector('.subscription .card');
    if (el) (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  edit(r: PricingSchemaRow) {
    const dt = (r.durationType ?? DurationType.Days) as DurationType;
    const isHours = dt === DurationType.Hours;
    const isDays = dt === DurationType.Days;
    const isYear = dt === DurationType.Year;
    const rep = isHours ? !!r.isRepeated : false;

    this.editingRowId.set(r.id ?? null);
    this.editingEnterPriceSchema.set(!!r.isEnterPriceSchema);

    const formValues: any = {
      id: r.id ?? null,
      name: r.name ?? '',
      durationType: r.isEnterPriceSchema ? DurationType.Days : dt,
      price: r.price ?? null,
      isRepeated: r.isEnterPriceSchema ? false : rep,
      totalHours: r.isEnterPriceSchema ? null : isHours ? (r.totalHours ?? 1) : null,
      totalDays: r.isEnterPriceSchema ? null : isDays ? (r.totalDays ?? 1) : null,
    };

    if (!r.isEnterPriceSchema && isHours && !rep) {
      formValues.startTime = this.toHmForInput(r.startTime) || '00:00';
      formValues.endTime = this.toHmForInput(r.endTime) || '00:00';
    } else {
      formValues.startTime = null;
      formValues.endTime = null;
    }

    if (!r.isEnterPriceSchema && isYear) {
      formValues.totalHours = null;
      formValues.totalDays = null;
      formValues.isRepeated = false;
    }

    this.form.setValue(formValues);
    this.activeFormTab.set('scheme');
    this.mobileSheetOpen.set(true);
    this.updateTimeAndModeRules();
    this.focusForm();
  }

  saveEnterPriceSchema() {
    this.enterPriceForm.markAllAsTouched();
    if (this.enterPriceForm.invalid) {
      this.toast.warn(this.t('enter_price_validation'));
      return;
    }

    const value = this.enterPriceForm.getRawValue();
    const payload = {
      name: (value.name ?? '').trim(),
      salary: Number(value.salary ?? 0),
    };

    this.savingEnterPrice.set(true);
    this.api.createEnterPriceSchema(payload).subscribe({
      next: () => {
        this.toast.success(this.t('enter_price_added_success'));
        this.enterPriceForm.reset({
          name: '',
          salary: null,
        });
        this.mobileSheetOpen.set(false);
        this.page.set(1);
        this.loadRows();
      },
      error: (err) => {
        this.toast.fromProblem(err);
      },
      complete: () => {
        this.savingEnterPrice.set(false);
      },
    });
  }
}
