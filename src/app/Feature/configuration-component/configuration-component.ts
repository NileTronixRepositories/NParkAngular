import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { NgIf, NgFor, NgClass, CommonModule } from '@angular/common';
import {
  FormArray,
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  ParkingConfigurationUpdateCommand,
  PriceType,
  PrintType,
  VehiclePassengerData,
  ParkingConfigurationView,
  GateConfigDto,
  OnvifCameraSettingDto,
} from '../../Domain/parking-config/parking-config.model';
import { UserDto } from '../../Domain/Users/user.model';
import { UsersServices } from '../../Services/Users/users-services';
import {
  Configurationervices,
  PricingSchemaDto,
} from '../../Services/configuration/configurationervices';

import { finalize } from 'rxjs';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18nDict, I18N_DICT } from '../../Services/i18n/i18n.tokens';
import { ToastServices } from '../../Services/Toster/toast-services';
import { ConfigurationTourService } from '../../Services/configuration/configuration-tour.service';

type Mode = 'entry' | 'exit';

const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const IPV6_REGEX =
  /^(?:(?:[0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,7}:|:(?::[0-9A-Fa-f]{1,4}){1,7}|(?:[0-9A-Fa-f]{1,4}:){1,6}:[0-9A-Fa-f]{1,4}|(?:[0-9A-Fa-f]{1,4}:){1,5}(?::[0-9A-Fa-f]{1,4}){1,2}|(?:[0-9A-Fa-f]{1,4}:){1,4}(?::[0-9A-Fa-f]{1,4}){1,3}|(?:[0-9A-Fa-f]{1,4}:){1,3}(?::[0-9A-Fa-f]{1,4}){1,4}|(?:[0-9A-Fa-f]{1,4}:){1,2}(?::[0-9A-Fa-f]{1,4}){1,5}|[0-9A-Fa-f]{1,4}:(?:(?::[0-9A-Fa-f]{1,4}){1,6})|::)$/;

function ipAddressValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim();
    if (!value) return null;
    return IPV4_REGEX.test(value) || IPV6_REGEX.test(value) ? null : { ipAddress: true };
  };
}

function completeOnvifValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value || {};
  const urlRequest = String(value.urlRequest || '').trim();
  const userName = String(value.userName || '').trim();
  const password = String(value.password || '').trim();
  const hasAny = !!(urlRequest || userName || password);
  const hasAll = !!(urlRequest && userName && password);
  return hasAny && !hasAll ? { incompleteOnvif: true } : null;
}

@Component({
  selector: 'app-configuration-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatDividerModule,
    MatTabsModule,
    MatExpansionModule,
    MatCheckboxModule,
    TranslatePipePipe,
  ],
  templateUrl: './configuration-component.html',
  styleUrls: ['./configuration-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>{
        ar: {
          basics: 'الأساسيات',
          entryGatesCount: 'عدد بوابات الدخول',
          exitGatesCount: 'عدد بوابات الخروج',
          allowedParkingSlots: 'عدد الباكيّات المسموح',
          gracePeriodMinutes: 'فترة السماح (دقائق)',
          next: 'التالي',
          modeAndSettings: 'الوضع والإعدادات',
          mode: 'الوضع',
          entry: 'Entry (دخول)',
          exit: 'Exit (خروج)',
          captureMode: 'طريقة الالتقاط',
          vehiclePlate: 'رقم اللوحة',
          scanner: 'ScannerID كاميرا',
          printType: 'أنواع التذاكر',
          qr: 'QR',
          receipt: 'Receipt',
          dateTimeFlag: 'إظهار التاريخ والوقت على التذكرة',
          ticketIdFlag: 'إظهار رقم التذكرة',
          feesFlag: 'إظهار الرسوم على التذكرة',
          pricingSchema: 'نظام التسعير',
          entryGates: 'بوابات الدخول',
          exitGates: 'بوابات الخروج',
          gate: 'البوابة',
          ipPlaceholder: 'مثال: 192.168.1.100',
          pcIpLabel: 'عنوان IP للـ PC',
          deviceIpLabel: 'عنوان IP LPR',
          controlIpLabel: 'معرّف التحكم',
          controlIdPlaceholder: 'مثال: 123456',
          qrPrinterName: 'اسم طابعة QR',
          receiptPrinterName: 'اسم طابعة الإيصال',
          onvifCameraSettings: 'إعدادات كاميرا ONVIF',
          onvifUrlRequest: 'رابط طلب ONVIF',
          onvifUsername: 'اسم مستخدم ONVIF',
          onvifPassword: 'كلمة مرور ONVIF',
          back: 'رجوع',
          save: 'حفظ',
          summary: 'الملخّص',
          startDate: 'تاريخ البداية',
          notSet: 'غير محدد',
          helpTour: 'شرح الواجهة',
          assignTo: 'تعيين لـ',
          cashier: 'محصل',
        },
        en: {
          basics: 'Basics',

          entryGatesCount: 'Entry gates count',
          exitGatesCount: 'Exit gates count',
          allowedParkingSlots: 'Allowed parking slots',
          gracePeriodMinutes: 'Grace period (minutes)',
          next: 'Next',
          modeAndSettings: 'Mode & Settings',
          mode: 'Mode',
          entry: 'Entry',
          exit: 'Exit',
          captureMode: 'Capture mode',
          vehiclePlate: 'Vehicle Plate',
          scanner: 'Scanner Cam',
          printType: 'Ticket types',
          qr: 'QR',
          receipt: 'Receipt',
          dateTimeFlag: 'Show date & time on ticket',
          ticketIdFlag: 'Show ticket ID',
          feesFlag: 'Show fees on ticket',
          pricingSchema: 'Pricing schema',
          entryGates: 'Entry Gates',
          exitGates: 'Exit Gates',
          gate: 'Gate',
          ipPlaceholder: 'e.g. 192.168.1.100',
          pcIpLabel: 'PC IP address',
          deviceIpLabel: 'LPR IP address',
          controlIpLabel: 'Control ID',
          controlIdPlaceholder: 'e.g. 123456',
          qrPrinterName: 'QR printer name',
          receiptPrinterName: 'Receipt printer name',
          onvifCameraSettings: 'ONVIF camera settings',
          onvifUrlRequest: 'ONVIF URL request',
          onvifUsername: 'ONVIF username',
          onvifPassword: 'ONVIF password',
          back: 'Back',
          save: 'Save',
          summary: 'Summary',
          startDate: 'Start Date',
          notSet: 'Not set',
          helpTour: 'Help Tour',
          assignTo: 'Assign To',
          cashier: 'Cashier',
        },
      },
    },
  ],
})
export class ConfigurationComponent implements OnInit {
  @Output() submitted = new EventEmitter<ParkingConfigurationUpdateCommand>();

  pricingSchemas: PricingSchemaDto[] = [];
  currentPricingSchemaOption: PricingSchemaDto | null = null;
  cashiersEntrance: UserDto[] = [];
  cashiersExit: UserDto[] = [];

  stepIndex = 0;

  modeCtrl = new FormControl<Mode>('entry', { nonNullable: true });
  step1Form!: FormGroup;
  step2Form!: FormGroup;
  saving = false;
  loading = false;

  readonly TOTAL_STEPS = 2;

  constructor(
    private fb: FormBuilder,
    private svc: Configurationervices,
    private usersSvc: UsersServices,
    public lang: LanguageService,
    private toast: ToastServices,
    private configTour: ConfigurationTourService,
  ) {
    // Step 1
    this.step1Form = this.fb.group({
      entryGatesCount: [1, [Validators.required, Validators.min(1)]],
      exitGatesCount: [1, [Validators.required, Validators.min(1)]],
      allowedParkingSlots: [100, [Validators.required, Validators.min(1)]],
      gracePeriodMinutes: [15, [Validators.required, Validators.min(0)]],
    });

    // Step 2
    this.step2Form = this.fb.group({
      captureMode: ['VEHICLE_PLATE'], // 'VEHICLE_PLATE' | 'SCANNER'
      printType: ['QR'],

      startDate: [new Date()],
      ticketIdPrefix: ['TK', [Validators.maxLength(10)]],

      dateTimeFlag: [true],
      ticketIdFlag: [true],
      feesFlag: [true],

      pricingSchemaId: [''],

      entryGates: this.fb.array([]),
      exitGates: this.fb.array([]),
    });

    this.step1Form.get('entryGatesCount')?.valueChanges.subscribe(() => this.syncGateArrays());
    this.step1Form.get('exitGatesCount')?.valueChanges.subscribe(() => this.syncGateArrays());

    this.modeCtrl.valueChanges.subscribe((mode: Mode) => {
      this.updatePricingSchemaValidator(mode);
    });

    this.updatePricingSchemaValidator(this.modeCtrl.value);
  }

  // ======= Progress Helpers =======
  get progressPercentage(): number {
    return ((this.stepIndex + 1) / this.TOTAL_STEPS) * 100;
  }

  isStepActive(index: number): boolean {
    return this.stepIndex >= index;
  }

  isStepCompleted(index: number): boolean {
    return this.stepIndex > index;
  }

  ngOnInit() {
    this.loadPricingSchemas();
    this.loadCashiers();
    this.syncGateArrays();
    this.loadExistingConfigAndPatch();
  }

  // ======= Data loading =======
  loadCashiers() {
    // Entrance cashiers (GateType = 1)
    this.usersSvc.getCashiers(1).subscribe((list) => (this.cashiersEntrance = list));
    // Exit cashiers (GateType = 2)
    this.usersSvc.getCashiers(2).subscribe((list) => (this.cashiersExit = list));
  }

  loadPricingSchemas() {
    this.svc.getPricingSchemas().subscribe({
      next: (list: PricingSchemaDto[]) => {
        const mapped = (list || []).map((s: PricingSchemaDto) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? '',
        }));
        this.pricingSchemas = this.mergePricingSchemaOption(mapped);
      },
      error: () => {
        this.pricingSchemas = this.mergePricingSchemaOption([]);
      },
    });
  }

  loadExistingConfigAndPatch() {
    this.loading = true;
    this.svc
      .getConfiguration()
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (cfg: ParkingConfigurationView) => {
          if (!cfg) return;

          this.step1Form.patchValue({
            entryGatesCount: cfg.entryGatesCount ?? 1,
            exitGatesCount: cfg.exitGatesCount ?? 1,
            allowedParkingSlots: cfg.allowedParkingSlots ?? 100,
            gracePeriodMinutes: cfg.gracePeriodMinutes ?? 0,
          });

          this.syncGateArrays();

          const captureMode = this.formCaptureModeFromApi(cfg.vehiclePassengerData);
          const printType = this.formPrintTypeFromApi(cfg.printType);
          const mode: Mode = this.formPriceTypeFromApi(cfg.priceType);

          this.modeCtrl.setValue(mode, { emitEvent: true });
          this.updatePricingSchemaValidator(mode);

          this.step2Form.patchValue({
            captureMode,
            printType,
            startDate: cfg.ticketCard?.startDate ? new Date(cfg.ticketCard.startDate) : new Date(),
            ticketIdPrefix: cfg.ticketCard?.ticketIdPrefix ?? 'TK',
            dateTimeFlag: cfg.dateTimeFlag ?? true,
            ticketIdFlag: cfg.ticketIdFlag ?? true,
            feesFlag: cfg.feesFlag ?? true,
            pricingSchemaId: cfg.pricingSchemaId ?? '',
          });
          this.setCurrentPricingSchemaOption(cfg.pricingSchemaId, cfg.pricingSchemaName);

          this.patchGateArray(this.entryGatesFA, cfg.entryGates || []);
          this.patchGateArray(this.exitGatesFA, cfg.exitGates || []);
        },
        error: (err: any) => console.error('Failed to load existing configuration', err),
      });
  }

  private updatePricingSchemaValidator(mode: Mode | null) {
    const ctrl = this.step2Form.get('pricingSchemaId');
    if (!ctrl) return;

    if (mode === 'entry') {
      ctrl.setValidators([Validators.required]);
    } else {
      ctrl.clearValidators();
    }
    ctrl.updateValueAndValidity();
  }

  private formCaptureModeFromApi(value: VehiclePassengerData | number | string | null | undefined) {
    return value === VehiclePassengerData.ScannerId || value === 1 || value === 'ScannerId'
      ? 'SCANNER'
      : 'VEHICLE_PLATE';
  }

  private formPrintTypeFromApi(value: PrintType | number | string | null | undefined) {
    return value === PrintType.Receipt || value === 1 || value === 'Receipt' ? 'RECEIPT' : 'QR';
  }

  private formPriceTypeFromApi(value: PriceType | number | string | null | undefined): Mode {
    return value === PriceType.Exit || value === 1 || value === 'Exit' ? 'exit' : 'entry';
  }

  // ======= FormArray helpers =======
  get entryGatesFA(): FormArray<FormGroup> {
    return this.step2Form.get('entryGates') as FormArray<FormGroup>;
  }
  get exitGatesFA(): FormArray<FormGroup> {
    return this.step2Form.get('exitGates') as FormArray<FormGroup>;
  }
  get entryGatesControls(): FormGroup[] {
    return this.entryGatesFA.controls as FormGroup[];
  }
  get exitGatesControls(): FormGroup[] {
    return this.exitGatesFA.controls as FormGroup[];
  }

  private makeGateGroup(defaultNumber: number): FormGroup {
    const group = this.fb.group({
      gateId: [null],
      gateNumber: [{ value: defaultNumber, disabled: true }, [Validators.min(1)]],
      pcIp: ['', [ipAddressValidator()]],
      deviceIp: ['', [ipAddressValidator()]],
      controlIp: ['', [Validators.required]],
      onvifCameraSetting: this.fb.group(
        {
          urlRequest: [''],
          userName: [''],
          password: [''],
        },
        { validators: completeOnvifValidator },
      ),
      isAssigned: [false],
      assignedTo: [null],
      qrPrinterName: ['', [Validators.maxLength(100)]],
      receiptPrinterName: ['', [Validators.maxLength(100)]],
    });

    group.get('isAssigned')?.valueChanges.subscribe((val) => {
      const ctrl = group.get('assignedTo');
      if (val) {
        ctrl?.setValidators([Validators.required]);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue(null);
      }
      ctrl?.updateValueAndValidity();
    });

    return group;
  }

  private resizeFormArray(arr: FormArray, target: number) {
    while (arr.length < target) arr.push(this.makeGateGroup(this.getNextGateNumber(arr)));
    while (arr.length > target) arr.removeAt(arr.length - 1);
  }

  private syncGateArrays() {
    const entries = Number(this.step1Form.get('entryGatesCount')!.value || 0);
    const exits = Number(this.step1Form.get('exitGatesCount')!.value || 0);
    this.resizeFormArray(this.entryGatesFA, entries);
    this.resizeFormArray(this.exitGatesFA, exits);
  }

  private getNextGateNumber(arr: FormArray<FormGroup>): number {
    const currentNumbers = arr.controls
      .map((fg: FormGroup) => Number(fg.get('gateNumber')?.value || 0))
      .filter((value: number) => value > 0);

    return currentNumbers.length ? Math.max(...currentNumbers) + 1 : 1;
  }

  private patchGateArray(arr: FormArray<FormGroup>, data: GateConfigDto[]) {
    const target = data?.length || arr.length;
    this.resizeFormArray(arr, target);

    arr.controls.forEach((fg: FormGroup, i: number) => {
      const src = data?.[i];
      fg.patchValue({
        gateId: src?.gateId ?? null,
        gateNumber: src?.gateNumber ?? i + 1,
        pcIp: src?.pcIp ?? '',
        deviceIp: src?.lprIp ?? '',
        controlIp: src?.controlIp ?? '',
        onvifCameraSetting: {
          urlRequest: src?.onvifCameraSetting?.urlRequest ?? '',
          userName: src?.onvifCameraSetting?.userName ?? '',
          password: src?.onvifCameraSetting?.password ?? '',
        },
        isAssigned: src?.isAssigned ?? false,
        assignedTo: src?.assignedTo ?? null,
        qrPrinterName: src?.qrPrinterName ?? '',
        receiptPrinterName: src?.receiptPrinterName ?? '',
      });
    });
  }

  // ======= UX =======
  goNext() {
    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      return;
    }
    this.syncGateArrays();
    this.stepIndex = 1;
  }

  goBack() {
    if (this.stepIndex > 0) this.stepIndex--;
  }

  // ======= Summary =======
  get summaryForView() {
    const s1 = this.step1Form.value as any;
    const s2 = this.step2Form.getRawValue() as any;
    const mode = this.modeCtrl.value;
    const pricingSchemaName =
      this.pricingSchemas.find((schema) => schema.id === s2.pricingSchemaId)?.name ??
      this.currentPricingSchemaOption?.name ??
      '';

    return {
      entryGatesCount: s1.entryGatesCount,
      exitGatesCount: s1.exitGatesCount,
      allowedParkingSlots: s1.allowedParkingSlots,
      gracePeriodMinutes: s1.gracePeriodMinutes,
      mode,
      captureMode: s2.captureMode,
      printType: s2.printType,
      ticketCard: { startDate: s2.startDate, ticketIdPrefix: s2.ticketIdPrefix },
      pricingSchemaId: s2.pricingSchemaId,
      pricingSchemaName,
      entryGates: s2.entryGates || [],
      exitGates: s2.exitGates || [],
    };
  }

  buildDto(): ParkingConfigurationUpdateCommand {
    const s1 = this.step1Form.value as any;
    const s2 = this.step2Form.getRawValue() as any;

    const mapGate = (g: any, i: number): GateConfigDto => {
      const pcIp = this.toNullableTrimmedString(g['pcIp']);
      const deviceIp = this.toNullableTrimmedString(g['deviceIp']);
      const controlIp = (g['controlIp'] || '').trim();
      const rawOnvif = g['onvifCameraSetting'] || {};
      const onvifCameraSetting = this.normalizeOnvifSettings(rawOnvif);

      return {
        gateId: g['gateId'] ?? null,
        gateNumber: Number(g['gateNumber'] ?? i + 1),
        lprIp: deviceIp,
        pcIp,
        controlIp,
        onvifCameraSetting,
        isAssigned: !!g['isAssigned'],
        assignedTo: g['isAssigned'] ? g['assignedTo'] : null,
        qrPrinterName: this.toNullableTrimmedString(g['qrPrinterName']),
        receiptPrinterName: this.toNullableTrimmedString(g['receiptPrinterName']),
      };
    };

    const entryGates: GateConfigDto[] = this.entryGatesFA.getRawValue().map(mapGate);
    const exitGates: GateConfigDto[] = this.exitGatesFA.getRawValue().map(mapGate);

    const vehiclePassengerData =
      s2.captureMode === 'SCANNER'
        ? VehiclePassengerData.ScannerId
        : VehiclePassengerData.VehiclePlate;

    return {
      entryGatesCount: s1.entryGatesCount,
      exitGatesCount: s1.exitGatesCount,
      allowedParkingSlots: s1.allowedParkingSlots,
      priceType: this.modeCtrl.value === 'entry' ? PriceType.Entry : PriceType.Exit,
      gracePeriodMinutes: s1.gracePeriodMinutes,
      vehiclePassengerData,
      printType: s2.printType === 'QR' ? PrintType.QrCode : PrintType.Receipt,
      dateTimeFlag: !!s2.dateTimeFlag,
      ticketIdFlag: !!s2.ticketIdFlag,
      feesFlag: !!s2.feesFlag,
      pricingSchemaId: s2.pricingSchemaId || null,
      entryGates,
      exitGates,
    };
  }

  private normalizeOnvifSettings(raw: any): OnvifCameraSettingDto | null {
    const urlRequest = (raw?.urlRequest || '').trim();
    const userName = (raw?.userName || '').trim();
    const password = (raw?.password || '').trim();

    if (!urlRequest && !userName && !password) {
      return null;
    }

    return {
      urlRequest,
      userName,
      password,
    };
  }

  private toNullableTrimmedString(value: unknown): string | null {
    const trimmed = String(value || '').trim();
    return trimmed || null;
  }

  private setCurrentPricingSchemaOption(
    pricingSchemaId: string | null | undefined,
    pricingSchemaName: string | null | undefined,
  ): void {
    if (!pricingSchemaId) {
      this.currentPricingSchemaOption = null;
      return;
    }

    this.currentPricingSchemaOption = {
      id: pricingSchemaId,
      name: pricingSchemaName?.trim() || pricingSchemaId,
      description: '',
    };
    this.pricingSchemas = this.mergePricingSchemaOption(this.pricingSchemas);
  }

  private mergePricingSchemaOption(list: PricingSchemaDto[]): PricingSchemaDto[] {
    const current = this.currentPricingSchemaOption;
    if (!current) return list;
    if (list.some((schema) => schema.id === current.id)) return list;
    return [current, ...list];
  }

  // ======= Save =======
  save() {
    if (this.stepIndex !== 1) return;

    this.applyLocalValidationRules();

    if (this.step1Form.invalid) {
      this.step1Form.markAllAsTouched();
      return;
    }
    if (this.step2Form.invalid) {
      this.step2Form.markAllAsTouched();
      return;
    }

    const dto = this.buildDto();
    console.log('DTO TO SEND:', dto);
    this.saving = true;

    this.svc
      .updateConfig(dto)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (res) => {
          const successMsg =
            this.lang.current === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully';
          this.toast.fromSuccess(res, successMsg);
          this.submitted.emit(dto);
          this.loadExistingConfigAndPatch();
        },
        error: (err) => {
          this.toast.fromProblem(err);
        },
      });
  }

  private applyLocalValidationRules(): void {
    this.syncGateArrays();
    this.validateGateCounts();
    this.validateUniqueGateIps('controlIp');
    this.validateUniqueGateIps('deviceIp');
    this.step2Form.updateValueAndValidity({ emitEvent: false });
  }

  private validateGateCounts(): void {
    this.setControlError(
      this.step1Form.get('entryGatesCount'),
      'countMismatch',
      Number(this.step1Form.get('entryGatesCount')?.value) !== this.entryGatesFA.length,
    );
    this.setControlError(
      this.step1Form.get('exitGatesCount'),
      'countMismatch',
      Number(this.step1Form.get('exitGatesCount')?.value) !== this.exitGatesFA.length,
    );
  }

  private validateUniqueGateIps(controlName: 'controlIp' | 'deviceIp'): void {
    const gates = [...this.entryGatesControls, ...this.exitGatesControls];
    const normalizedValues = gates.map((gate) =>
      String(gate.get(controlName)?.value || '')
        .trim()
        .toLowerCase(),
    );

    gates.forEach((gate, index) => {
      const ctrl = gate.get(controlName);
      const value = normalizedValues[index];
      const isDuplicate = !!value && normalizedValues.filter((item) => item === value).length > 1;
      this.setControlError(ctrl, 'duplicateIp', isDuplicate);
    });
  }

  private setControlError(
    control: AbstractControl | null | undefined,
    key: string,
    active: boolean,
  ): void {
    if (!control) return;

    const errors = { ...(control.errors || {}) };
    if (active) {
      errors[key] = true;
      control.setErrors(errors);
      return;
    }

    delete errors[key];
    control.setErrors(Object.keys(errors).length ? errors : null);
  }

  startConfigTour() {
    this.configTour.startTour({
      ensureStep1: () => {
        this.stepIndex = 0;
      },
      ensureStep2: () => {
        this.stepIndex = 1;
      },
      ensureModeEntry: () => {
        if (this.modeCtrl.value !== 'entry') {
          this.modeCtrl.setValue('entry');
        }
      },
    });
  }
}
