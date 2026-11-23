import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  DocumentItem,
  PagedResult,
  ParkingMembershipDto,
  PlateGroup,
  VehicleImageDto,
} from '../../Domain/registration/registration-model';
import { DurationType } from '../../Domain/Subscription-type/subscription-type.models';
import {
  PricingSchemaDto,
  Registrationservice,
} from '../../Services/registration/registrationservice';
import { NfcReaderService } from '../../Services/registration/nfc-reader.service';
import { AuthService } from '../../Services/Auth/auth-service';

import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { ToastServices } from '../../Services/Toster/toast-services';
import { RegistrationTourService } from '../../Services/registration/registration-tour.service';
import { SafePipe } from '../../Pipes/safe.pipe';
import { ScanFileMessage, ScanHubService } from '../../Services/Gate/scan-hub.service';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';
import { environment } from '../../Shared/environment/environment';

@Component({
  selector: 'app-registration-component',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TranslatePipePipe, SafePipe],
  templateUrl: './registration-component.html',
  styleUrl: './registration-component.css',
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          // ===== Page header =====
          registrationTitle: 'إدارة الاشتراكات',
          registrationSubtitle: 'تسجيل اشتراك جديد ومتابعة قائمة المشتركين الحالية',

          // ===== Form: subscriber =====
          subscriberCard: 'بيانات المشترك',
          newBadge: 'جديد',
          plateNumber: 'رقم السيارة',
          plateIncomplete: 'برجاء استكمال خانات لوحة السيارة',
          subscriberName: 'اسم المشترك',
          namePlaceholder: 'مثال: حسام خالد',
          nameRequired: 'الاسم مطلوب (3 أحرف فأكثر)',
          phone: 'رقم التليفون',
          phonePlaceholder: 'مثال: 01012345678',
          phoneInvalid: 'رقم هاتف غير صالح',
          nationalId: 'رقم البطاقة',
          nationalIdPlaceholder: 'مثال: 2980*********',
          nationalIdInvalid: 'رقم بطاقة غير صالح',

          // ===== subscription type =====
          subscriptionType: 'نوع الاشتراك',
          loadingSchemas: 'جاري التحميل…',
          chooseSubscription: 'اختر نوع الاشتراك',
          chooseSubscriptionPlaceholder: '— اختر نوع الاشتراك —',
          schemaRequired: 'اختيار نوع الاشتراك مطلوب',

          // ===== card data =====
          cardData: 'بيانات الكارت',
          cardNumber: 'رقم الكارت',
          cardInvalid: 'رقم الكارت يجب أن يكون أحرف/أرقام هيكس بين 6 و 16.',
          readCard: 'قراءة الكارت',
          reading: 'جاري القراءة…',
          readCardTitle: 'قراءة UID من القارئ',

          // ===== documents =====
          documents: 'المستندات',
          filesCount: 'ملف',
          uploadDocs: 'رفع مستندات',
          scanCamera: 'مسح بالمـاسـح/الكاميرا',
          deleteDoc: 'حذف',
          noDocs: 'لا توجد مستندات مرفوعة بعد.',
          notPreviewable: 'لا يمكن معاينة هذا النوع هنا. يمكنك تنزيله لفتحه محلياً.',
          download: 'تنزيل الملف',
          close: 'إغلاق',
          scanner_ready: 'الماسح جاهز',
          save_to_pc: 'حفظ على الجهاز',

          // ===== preview overlay =====
          previewCloseAria: 'إغلاق',

          // ===== submit =====
          saving: 'جاري الحفظ...',
          saveSubscription: 'حفظ الاشتراك',
          savedOk: 'تم حفظ الاشتراك بنجاح ',
          saveFail: 'تعذر حفظ الاشتراك. تأكد من الـ API والبيانات.',

          // ===== list =====
          memberships: 'الاشتراكات',
          pageSize: 'حجم الصفحة',
          nameCol: 'الاسم',
          phoneCol: 'الهاتف',
          nidCol: 'الرقم القومي',
          vehicleNumberCol: 'رقم المركبة',
          cardNoCol: 'رقم الكارت',
          usageTimeCol: 'وقت الاستخدام',
          createdAtCol: 'تاريخ الإنشاء',
          endDateCol: 'تاريخ الانتهاء',
          noData: 'لا توجد بيانات',
          total: 'إجمالي',
          page: 'صفحة',
          of: 'من',
          first: 'الأولى',
          prev: 'السابق',
          next: 'التالي',
          last: 'الأخيرة',

          // ===== actions =====
          actionsCol: 'إجراءات',
          edit: 'تعديل',
          deleteAction: 'حذف',
          cancelEdit: 'إلغاء التعديل',
          deleteConfirm: 'هل أنت متأكد من حذف هذا الاشتراك؟',
          deleteSuccess: 'تم حذف الاشتراك بنجاح ',
          deleteFailed: 'فشل في حذف الاشتراك.',
          updateSuccess: 'تم تحديث الاشتراك بنجاح ',
          updateFailed: 'فشل في تحديث الاشتراك.',
          updateSubscription: 'تحديث الاشتراك',

          // ===== plate helpers =====
          plateExampleNumbers: '5678',
          plateExampleLetters: 'أ ب ج',

          // ===== misc =====
          loading: 'جاري التحميل…',
          helpTour: 'جولة إرشادية',
        },
        en: {
          helpTour: 'Help Tour',
          // ===== Page header =====
          registrationTitle: 'Membership management',
          registrationSubtitle: 'Create a new membership and review the existing list',

          // ===== Form: subscriber =====
          subscriberCard: 'Subscriber details',
          newBadge: 'New',
          plateNumber: 'Plate number',
          plateIncomplete: 'Please complete the plate fields.',
          subscriberName: 'Subscriber name',
          namePlaceholder: 'e.g., Hussam Khaled',
          nameRequired: 'Name is required (min 3 chars).',
          phone: 'Phone number',
          phonePlaceholder: 'e.g., +201012345678',
          phoneInvalid: 'Invalid phone number',
          nationalId: 'National ID',
          nationalIdPlaceholder: 'e.g., 2980*********',
          nationalIdInvalid: 'Invalid national ID',

          // ===== subscription type =====
          subscriptionType: 'Subscription type',
          loadingSchemas: 'Loading…',
          chooseSubscription: 'Choose a subscription',
          chooseSubscriptionPlaceholder: '— Choose a subscription —',
          schemaRequired: 'Subscription is required',

          // ===== card data =====
          cardData: 'Card data',
          cardNumber: 'Card number',
          cardInvalid: 'Card number must be hex (6–16).',
          readCard: 'Read card',
          reading: 'Reading…',
          readCardTitle: 'Read UID from reader',

          // ===== documents =====
          documents: 'Documents',
          filesCount: 'file(s)',
          uploadDocs: 'Upload documents',
          scanCamera: 'Scan by camera',
          deleteDoc: 'Delete',
          noDocs: 'No documents yet.',
          notPreviewable: 'Preview is not available. You can download and open locally.',
          download: 'Download',
          close: 'Close',
          scanner_ready: 'Scanner ready',
          save_to_pc: 'Save to PC',

          // ===== preview overlay =====
          previewCloseAria: 'Close',

          // ===== submit =====
          saving: 'Saving...',
          saveSubscription: 'Save membership',
          savedOk: 'Saved successfully',
          saveFail: 'Failed to save. Check API & data.',

          // ===== list =====
          memberships: 'Memberships',
          pageSize: 'Page size',
          nameCol: 'Name',
          phoneCol: 'Phone',
          nidCol: 'National ID',
          vehicleNumberCol: 'Vehicle number',
          cardNoCol: 'Card number',
          usageTimeCol: 'Usage time',
          createdAtCol: 'Created at',
          endDateCol: 'End date',
          noData: 'No data',
          total: 'Total',
          page: 'Page',
          of: 'of',
          first: 'First',
          prev: 'Prev',
          next: 'Next',
          last: 'Last',

          // ===== actions =====
          actionsCol: 'Actions',
          edit: 'Edit',
          deleteAction: 'Delete',
          cancelEdit: 'Cancel Edit',
          deleteConfirm: 'Are you sure you want to delete this membership?',
          deleteSuccess: 'Membership deleted successfully',
          deleteFailed: 'Failed to delete membership.',
          updateSuccess: 'Membership updated successfully',
          updateFailed: 'Failed to update membership.',
          updateSubscription: 'Update Membership',

          // ===== plate helpers =====
          plateExampleNumbers: '5678',
          plateExampleLetters: 'A B C',

          // ===== misc =====
          loading: 'Loading…',
        },
      }),
    },
  ],
})
export class RegistrationComponent implements OnInit, OnDestroy {
  // ===== DI =====
  private fb = inject(FormBuilder);
  private svc = inject(Registrationservice);
  private nfc = inject(NfcReaderService);
  public lang = inject(LanguageService);
  private toast = inject(ToastServices);
  private dict = inject<I18nDict>(I18N_DICT as any);
  private regTour = inject(RegistrationTourService);
  private scanHub = inject(ScanHubService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthService);
  private errorExtractor = inject(ErrorExtractorService);
  private hubSubscriptions = new Subscription();
  // ===== State (list/paging) =====
  loading = signal(false);
  pageNumber = signal(1);
  pageSize = signal(10);

  result = signal<PagedResult<ParkingMembershipDto> | null>(null);
  rows = computed(() => this.result()?.data ?? []);
  hasNext = computed(() => !!this.result()?.hasNextPage);
  hasPrev = computed(() => !!this.result()?.hasPreviousPage);
  totalItems = computed(() => this.result()?.totalItems ?? 0);
  totalPages = computed(() => this.result()?.totalPages ?? 0);

  // ===== State (form) =====
  saving = signal(false);

  documents = signal<DocumentItem[]>([]);
  previewOpen = signal(false);
  currentPreview = signal<DocumentItem | null>(null);

  schemas = signal<PricingSchemaDto[]>([]);
  loadingSchemas = signal(false);

  readingCard = signal(false);

  scannedFile = signal<{
    name: string;
    url: string;
    safeUrl?: any;
    type: string;
    bytes: any;
  } | null>(null);

  // ===== Edit mode state =====
  editingId = signal<string | null>(null);
  isEditing = computed(() => !!this.editingId());
  removedRemoteIds = signal<string[]>([]);

  // ===== Form & Validators =====
  form: FormGroup = this.fb.group(
    {
      cardNo: ['', [Validators.required, Validators.pattern(/^[0-9A-Fa-f]{6,16}$/)]],
      pricingSchemaId: [null, [Validators.required]],

      plate: this.fb.group(
        { p1: [''], p2: [''], p3: [''], p4: [''] },
        { validators: [this.plateRequiredValidator] },
      ),

      subscriberName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^(\+?\d{7,15})$/)]],
      nationalId: ['', [Validators.required, Validators.pattern(/^\d{10,16}$/)]],

      durationType: [DurationType.Hours, Validators.required],
      dateFrom: [null],
      dateTo: [null],
      timeFrom: ['09:00'],
      timeTo: ['15:30'],
      price: [null],
      orderPriority: [1, [Validators.min(1)]],
    },
    { validators: [timeRangeValidator] },
  );

  isHours = computed(() => this.form.get('durationType')?.value === DurationType.Hours);
  isDaysOrMonthly = computed(() => this.form.get('durationType')?.value !== DurationType.Hours);

  constructor() {
    // dynamic enable/disable & validators based on duration type
    effect(() => {
      const hours = this.isHours();
      const timeFrom = this.form.get('timeFrom')!;
      const timeTo = this.form.get('timeTo')!;
      const dateFrom = this.form.get('dateFrom')!;
      const dateTo = this.form.get('dateTo')!;

      if (hours) {
        timeFrom.enable({ emitEvent: false });
        timeTo.enable({ emitEvent: false });
      } else {
        timeFrom.disable({ emitEvent: false });
        timeTo.disable({ emitEvent: false });
      }

      if (this.isDaysOrMonthly()) {
        dateFrom.setValidators([Validators.required]);
        dateTo.setValidators([Validators.required]);
      } else {
        dateFrom.clearValidators();
        dateTo.clearValidators();
      }
      dateFrom.updateValueAndValidity({ emitEvent: false });
      dateTo.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.loadPricingSchemas();
    this.load();

    // Initialize scanner hub connection
    this.scanHub.start().then(() => {
      const gateId = this.auth.getGateId();
      if (gateId) {
        this.scanHub.joinStation(gateId.toString());
        console.log('RegistrationComponent: Joined scanner station', gateId);
      } else {
        console.log('RegistrationComponent: Scanner hub started, but no gateId found');
      }
    });

    // Subscribe to scan events
    this.hubSubscriptions.add(
      this.scanHub.scan$.subscribe((msg) => {
        console.log('RegistrationComponent: Received scan event', msg.fileName);
        this.handleScannedFile(msg);
      }),
    );
  }

  ngOnDestroy(): void {
    this.regTour.cancelTour();
    this.hubSubscriptions.unsubscribe();
  }

  private handleScannedFile(msg: ScanFileMessage): void {
    console.log(
      '%c RegistrationComponent: [SCAN EVENT] Handling file: ' + msg.fileName,
      'color: #00ff00; font-weight: bold;',
    );
    this.toast.success(this.t('scanner_ready') + ': ' + msg.fileName);

    // Cleanup old URL if exists
    if (this.scannedFile()?.url) {
      URL.revokeObjectURL(this.scannedFile()!.url);
    }

    try {
      let data: Uint8Array;
      if (typeof msg.bytes === 'string') {
        const binaryString = window.atob(msg.bytes);
        data = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          data[i] = binaryString.charCodeAt(i);
        }
      } else if (msg.bytes instanceof ArrayBuffer) {
        data = new Uint8Array(msg.bytes);
      } else {
        data = new Uint8Array(msg.bytes as any);
      }

      const blob = new Blob([data as any], { type: msg.contentType });
      const rawUrl = URL.createObjectURL(blob);
      const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(rawUrl);

      // 1. Update the "Ready to save" preview banner
      this.scannedFile.set({
        name: msg.fileName,
        url: rawUrl,
        safeUrl: safeUrl,
        type: msg.contentType,
        bytes: msg.bytes,
      });

      // 2. ALSO add it to the main documents list so it gets saved in FormData
      const scFile = new File([blob], msg.fileName, { type: msg.contentType });
      const doc: DocumentItem = {
        name: msg.fileName,
        mime: msg.contentType,
        size: data.length,
        dataUrl: rawUrl,
        isImage: msg.contentType.startsWith('image/'),
        file: scFile,
      };

      this.documents.set([...this.documents(), doc]);

      this.cdr.markForCheck();
    } catch (err) {
      console.error('RegistrationComponent: Error rendering scan', err);
      this.toast.error('Error rendering scan');
    }
  }

  // ===== i18n helper =====
  private t(key: string): string {
    return this.lang.translate(this.dict, key);
  }

  // ===== Message extractors (from backend) =====
  private extractErrorMessage(err: any, fallbackKey: string): string {
    return this.errorExtractor.extractErrorMessage(err, this.t(fallbackKey));
  }

  private extractSuccessMessage(res: any, fallbackKey: string): string {
    return this.errorExtractor.extractSuccessMessage(res, this.t(fallbackKey));
  }

  // ===== Data =====
  private loadPricingSchemas() {
    this.loadingSchemas.set(true);
    this.svc.getAll().subscribe({
      next: (list) => this.schemas.set(list ?? []),
      error: (err) => {
        console.error(err);
        this.toast.fromProblem(err);
        this.loadingSchemas.set(false);
      },
      complete: () => this.loadingSchemas.set(false),
    });
  }

  load() {
    this.loading.set(true);
    this.svc.getMemberships(this.pageNumber(), this.pageSize()).subscribe({
      next: (res) => this.result.set(res),
      error: (err) => {
        console.error(err);
        this.toast.fromProblem(err);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  // ===== Paging actions =====
  first() {
    if (this.pageNumber() === 1) return;
    this.pageNumber.set(1);
    this.load();
  }
  prev() {
    if (!this.hasPrev()) return;
    this.pageNumber.set(this.pageNumber() - 1);
    this.load();
  }
  next() {
    if (!this.hasNext()) return;
    this.pageNumber.set(this.pageNumber() + 1);
    this.load();
  }
  last() {
    const lastPage = this.totalPages();
    if (!lastPage || this.pageNumber() === lastPage) return;
    this.pageNumber.set(lastPage);
    this.load();
  }
  changePageSize(size: number) {
    this.pageSize.set(size);
    this.pageNumber.set(1);
    this.load();
  }

  // ===== Validators =====
  plateRequiredValidator(group: AbstractControl) {
    const p1 = (group.get('p1')?.value || '').trim();
    const p2 = (group.get('p2')?.value || '').trim();
    const p3 = (group.get('p3')?.value || '').trim();
    const p4 = (group.get('p4')?.value || '').trim();
    return p1 || p2 || p3 || p4 ? null : { required: true };
  }

  // ===== NFC read =====
  async readCard() {
    if (this.readingCard()) return;
    this.readingCard.set(true);
    try {
      const uid = await this.nfc.readUID();
      const normalized = String(uid).trim().toUpperCase();
      this.form.get('cardNo')?.setValue(normalized);
      this.form.get('cardNo')?.markAsDirty();
      this.form.get('cardNo')?.markAsTouched();
      this.form.get('cardNo')?.updateValueAndValidity();

      // success toast (local message، مفيش backend هنا)
      this.toast.success(this.t('readCard'));
    } catch (err: any) {
      console.error(err);
      const msg = err?.message || 'تعذر قراءة الكارت. تأكد من تشغيل قارئ الـ NFC.';
      this.toast.error(msg);
    } finally {
      this.readingCard.set(false);
    }
  }

  // ===== Documents (upload/preview) =====
  openScanner(inputEl: HTMLInputElement) {
    try {
      inputEl.click();
    } catch {}
  }

  async onPickDocuments(ev: Event) {
    const files = (ev.target as HTMLInputElement).files;
    if (!files || !files.length) return;

    const addeds: DocumentItem[] = [];
    for (const f of Array.from(files)) {
      const dataUrl = await fileToDataUrl(f);
      addeds.push({
        name: f.name,
        mime: f.type || 'application/octet-stream',
        size: f.size,
        dataUrl,
        isImage: isImageMime(f.type),
        file: f,
      });
    }
    this.documents.set([...this.documents(), ...addeds]);
    (ev.target as HTMLInputElement).value = '';
  }

  openPreview(d: DocumentItem) {
    this.currentPreview.set(d);
    this.previewOpen.set(true);
    queueMicrotask(() => {
      const overlay = document.querySelector('.preview-overlay') as HTMLElement | null;
      overlay?.focus();
    });
  }
  closePreview(_: MouseEvent) {
    this.previewOpen.set(false);
    this.currentPreview.set(null);
  }
  forceClose() {
    this.previewOpen.set(false);
    this.currentPreview.set(null);
  }

  removeDocument(index: number) {
    const arr = [...this.documents()];
    const doc = arr[index];
    if (doc.remoteId) {
      this.removedRemoteIds.set([...this.removedRemoteIds(), doc.remoteId]);
    }
    arr.splice(index, 1);
    this.documents.set(arr);
  }

  // ===== Plate helpers =====
  private normalizeLetters(raw: string): string {
    if (!raw) return '';
    const letters =
      raw
        .replace(/\s+/g, '')
        .toUpperCase()
        .match(/[A-Z\u0621-\u064A]/g) ?? [];
    return letters.join(' ');
  }

  formatLetters(ctrl: 'p2') {
    const group = this.form.get('plate');
    if (!group) return;
    const c = group.get(ctrl);
    const val = (c?.value ?? '') as string;
    const formatted = this.normalizeLetters(val);
    if (formatted !== val) {
      c?.setValue(formatted, { emitEvent: false });
      c?.markAsDirty();
    }
  }

  private joinPlate(plate: PlateGroup): string {
    const p1 = (plate?.p1 ?? '').toString().trim();
    const p2 = this.normalizeLetters(plate?.p2 ?? '');
    const p4 = (plate?.p4 ?? '').toString().trim();
    return [p1, p2, p4].filter(Boolean).join(' ');
  }

  // ===== Submit =====

  save() {
    this.form.get('plate')?.markAllAsTouched();
    if (this.form.invalid) return;

    this.saving.set(true);
    const v = this.form.getRawValue();

    const vehicleNumber = this.joinPlate(v.plate as PlateGroup);

    const fd = new FormData();
    fd.append('Name', (v.subscriberName ?? '').trim());
    fd.append('Phone', v.phone);
    fd.append('NationalId', v.nationalId);
    fd.append('VehicleNumber', vehicleNumber);
    fd.append('CardNumber', v.cardNo);
    fd.append('PricingSchemeId', v.pricingSchemaId);

    const editingId = this.editingId();
    if (editingId) {
      fd.append('Id', editingId);
    }

    const fileField = editingId ? 'NewVehicleImages' : 'VehicleImage';
    const files = this.documents().filter((d) => d.file);
    for (const doc of files) {
      fd.append(fileField, doc.file as File, doc.name);
    }

    if (editingId) {
      const removedIds = this.removedRemoteIds();
      for (const rid of removedIds) {
        fd.append('RemoveAttachmentIds', rid);
      }
    }

    // Choose create or update
    const request$ = editingId
      ? this.svc.updateMembership(editingId, fd)
      : this.svc.addMembership(fd);

    request$.subscribe({
      next: (res) => {
        const successKey = editingId ? 'updateSuccess' : 'savedOk';
        this.toast.fromSuccess(res, this.t(successKey));

        this.editingId.set(null);
        this.reset();
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.toast.fromProblem(err);
        this.saving.set(false);
      },
      complete: () => this.saving.set(false),
    });
  }

  reset() {
    this.form.reset({
      pricingSchemaId: null,
      durationType: 'Monthly',
      timeFrom: '09:00',
      timeTo: '15:30',
      orderPriority: 1,
    });
    this.documents.set([]);
    this.removedRemoteIds.set([]);
    this.previewOpen.set(false);
    this.currentPreview.set(null);
  }

  hasErr(ctrlName: string, err?: string) {
    const c = this.form.get(ctrlName);
    if (!c) return false;
    return err ? !!(c.touched && c.errors?.[err]) : !!(c.touched && c.invalid);
  }

  humanSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  // ===== CRUD Actions =====
  editMembership(row: ParkingMembershipDto) {
    this.editingId.set(row.id);

    const vehicleNum = row.vehicleNumber || '';
    const parts = vehicleNum.split(' ').filter(Boolean);

    const numbers: string[] = [];
    const letters: string[] = [];

    for (const part of parts) {
      if (/^\d+$/.test(part)) {
        numbers.push(part);
      } else {
        letters.push(part);
      }
    }

    const p4 = numbers.join('');
    const p2 = letters.join(' ');

    // Populate form
    this.form.patchValue({
      subscriberName: row.name,
      phone: row.phone,
      nationalId: row.nationalId,
      cardNo: row.cardNumber,
      pricingSchemaId: row.pricingSchemeId || null,
      plate: {
        p1: '',
        p2: p2,
        p3: '',
        p4: p4,
      },
    });

    this.documents.set(this.mapRemoteDocuments(row));

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteMembership(id: string) {
    const confirmMsg = this.t('deleteConfirm');
    if (!confirm(confirmMsg || 'Are you sure?')) {
      return;
    }

    this.loading.set(true);
    this.svc.deleteMembership(id).subscribe({
      next: (res) => {
        this.toast.fromSuccess(res, this.t('deleteSuccess'));
        this.load();
      },
      error: (err) => {
        console.error(err);
        this.toast.fromProblem(err);
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  cancelEdit() {
    this.editingId.set(null);
    this.reset();
  }
  startRegistrationTour() {
    this.regTour.startTour();
  }

  private mapRemoteDocuments(row: ParkingMembershipDto): DocumentItem[] {
    const remoteFiles = row.vehicleImage ?? row.vehicleImages ?? row.attachments ?? [];

    return remoteFiles
      .map((file) => this.mapRemoteDocument(file))
      .filter((file): file is DocumentItem => !!file);
  }

  private mapRemoteDocument(file: VehicleImageDto): DocumentItem | null {
    const filePath = file.filePath ?? file.imagePath ?? file.path ?? file.url ?? file.fileUrl;
    if (!filePath) return null;

    const apiOrigin = new URL(environment.baseUrl).origin;
    const fullUrl = filePath.startsWith('http')
      ? filePath
      : `${apiOrigin}/${filePath.replace(/^\//, '')}`;

    const fileName = file.fileName ?? file.name ?? filePath.split('/').pop() ?? 'document';
    const mimeType = file.contentType ?? file.mimeType ?? mimeFromFileName(fileName);

    return {
      name: fileName,
      mime: mimeType,
      size: 0,
      dataUrl: fullUrl,
      isImage: mimeType.startsWith('image/'),
      file: null,
      remoteId: file.id,
    };
  }
}

/* ===== Helpers (file utils + time range) ===== */
function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function isImageMime(mime: string) {
  return !!mime && mime.startsWith('image/');
}

function mimeFromFileName(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return 'application/octet-stream';
}

function timeRangeValidator(group: AbstractControl) {
  const type = group.get('durationType')?.value as DurationType;
  if (type !== DurationType.Hours) return null;
  const from = group.get('timeFrom')?.value as string | null;
  const to = group.get('timeTo')?.value as string | null;
  if (!from || !to) return null;
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  const start = fh * 60 + fm;
  const end = th * 60 + tm;
  return end > start ? null : { timerange: true };
}
