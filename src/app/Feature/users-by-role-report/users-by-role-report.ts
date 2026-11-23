import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import {
  RoleDto,
  RoleIds,
  UserByRoleResponse,
} from '../../Domain/Users/user.model';
import { UsersServices } from '../../Services/Users/users-services';
import { UsersByRoleTourService } from '../../Services/Users/users-by-role-tour.service';
import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { ErrorExtractorService } from '../../Services/Shared/error-extractor.service';
import { EntranceCashierTicketsReport } from '../entrance-cashier-tickets-report/entrance-cashier-tickets-report';
import { SupervisorCollectionsReport } from '../supervisor-collections-report/supervisor-collections-report';

@Component({
  selector: 'app-users-by-role-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, EntranceCashierTicketsReport, SupervisorCollectionsReport],
  templateUrl: './users-by-role-report.html',
  styleUrl: './users-by-role-report.css',
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          usersByRole: 'تقرير المستخدمين حسب الدور',
          subtitle: 'عرض المستخدمين التابعين للدور المختار',
          chooseRole: 'اختر الدور',
          selectRole: 'اختر دورا لعرض المستخدمين',
          openRole: 'فتح',
          search: 'بحث',
          searchPlaceholder: 'ابحث بالاسم، اسم المستخدم، البريد، الهاتف، أو الرقم القومي',
          clear: 'مسح',
          name: 'الاسم',
          username: 'اسم المستخدم',
          email: 'البريد الإلكتروني',
          phoneNumber: 'رقم الهاتف',
          nationalId: 'الرقم القومي',
          role: 'الدور',
          shiftStart: 'بداية الشفت',
          shiftEnd: 'نهاية الشفت',
          shift: 'الشفت',
          noShift: 'لا يوجد شفت',
          noUsers: 'لا يوجد مستخدمين لهذا الدور.',
          loading: 'جاري تحميل المستخدمين...',
          failedLoad: 'تعذر تحميل مستخدمي هذا الدور.',
          total: 'الإجمالي',
          page: 'صفحة',
          of: 'من',
          rows: 'صفوف',
          previous: 'السابق',
          next: 'التالي',
          showing: 'عرض',
          noRoleSelected: 'اختر دورا من القائمة لعرض المستخدمين.',
          roleId: 'معرف الدور',
          usersSuffix: 'مستخدمين',
          actions: 'إجراءات',
          ticketsReport: 'تقرير التذاكر',
          collectionsReport: 'تقرير التحصيلات',
          closeReport: 'إغلاق التقرير',
          helpTour: 'شرح الواجهة',
        },
        en: {
          usersByRole: 'Users By Role Report',
          subtitle: 'View users assigned to the selected role',
          chooseRole: 'Choose role',
          selectRole: 'Select a role to view users',
          openRole: 'Open',
          search: 'Search',
          searchPlaceholder: 'Search name, username, email, phone, or national ID',
          clear: 'Clear',
          name: 'Name',
          username: 'Username',
          email: 'Email',
          phoneNumber: 'Phone Number',
          nationalId: 'National ID',
          role: 'Role',
          shiftStart: 'Shift Start',
          shiftEnd: 'Shift End',
          shift: 'Shift',
          noShift: 'No Shift',
          noUsers: 'No users found for this role.',
          loading: 'Loading users...',
          failedLoad: 'Failed to load users for this role.',
          total: 'Total',
          page: 'Page',
          of: 'of',
          rows: 'Rows',
          previous: 'Previous',
          next: 'Next',
          showing: 'Showing',
          noRoleSelected: 'Select a role from the list to view users.',
          roleId: 'Role ID',
          usersSuffix: 'Users',
          actions: 'Actions',
          ticketsReport: 'Tickets Report',
          collectionsReport: 'Collections Report',
          closeReport: 'Close Report',
          helpTour: 'Help Tour',
        },
      }),
    },
  ],
})
export class UsersByRoleReport implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly usersService = inject(UsersServices);
  private readonly tour = inject(UsersByRoleTourService);
  private readonly errorExtractor = inject(ErrorExtractorService);
  readonly lang = inject(LanguageService);
  private readonly dict = inject(I18N_DICT);

  readonly dir = computed(() => this.lang.dir());
  readonly isRTL = computed(() => this.lang.isRTL());

  private readonly searchChanges = new Subject<string>();
  private readonly subscriptions = new Subscription();

  readonly pageSizeOptions = [10, 25, 50];
  readonly fallbackRoleOptions: RoleDto[] = [
    { id: RoleIds.admin, name: 'Admin' },
    { id: RoleIds.entranceCashier, name: 'EntranceCashier' },
    { id: RoleIds.exitCashier, name: 'ExitCashier' },
    { id: RoleIds.supervisor, name: 'Supervisor' },
  ];

  roles: RoleDto[] = [];
  roleId = '';
  selectedRoleId = '';
  roleNameEn = '';
  roleNameAr = '';
  searchText = '';
  pageNumber = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  users: UserByRoleResponse[] = [];
  loading = false;
  rolesLoading = false;
  errorMessage = '';
  selectedCashierReportUser: UserByRoleResponse | null = null;
  selectedSupervisorReportUser: UserByRoleResponse | null = null;

  ngOnInit(): void {
    this.loadRoles();

    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const nextRoleId = String(params.get('roleId') ?? '').trim();
        this.roleId = nextRoleId;
        this.selectedRoleId = nextRoleId;
        this.pageNumber = 1;
        this.errorMessage = '';
        this.selectedCashierReportUser = null;
        this.selectedSupervisorReportUser = null;

        if (nextRoleId) {
          this.loadUsers();
        } else {
          this.clearResult();
        }
      }),
    );

    this.subscriptions.add(
      this.searchChanges.pipe(debounceTime(350), distinctUntilChanged()).subscribe((value) => {
        this.searchText = value.trim();
        this.pageNumber = 1;
        this.loadUsers();
      }),
    );
  }

  ngOnDestroy(): void {
    this.tour.cancelTour();
    this.subscriptions.unsubscribe();
  }

  startTour(): void {
    this.tour.startTour();
  }

  t(key: string): string {
    return this.lang.translate(this.dict as any, key);
  }

  get roleOptions(): RoleDto[] {
    return this.roles.length > 0 ? this.roles : this.fallbackRoleOptions;
  }

  get hasRoleSelected(): boolean {
    return this.roleId.trim().length > 0;
  }

  get currentRoleName(): string {
    const apiName = this.lang.current === 'ar' ? this.roleNameAr : this.roleNameEn;
    if (apiName?.trim()) return apiName.trim();

    const alternateApiName = this.roleNameAr || this.roleNameEn;
    if (alternateApiName?.trim()) return alternateApiName.trim();

    const optionName = this.roles.find((r) => this.sameId(r.id, this.roleId))?.name;
    return optionName?.trim() || this.t('usersByRole');
  }

  get pageTitle(): string {
    if (!this.hasRoleSelected || !this.currentRoleName) return this.t('usersByRole');
    return this.lang.current === 'ar'
      ? `${this.t('usersSuffix')} ${this.currentRoleName}`
      : `${this.currentRoleName} ${this.t('usersSuffix')}`;
  }

  get showingFrom(): number {
    if (!this.totalItems || this.users.length === 0) return 0;
    return (this.pageNumber - 1) * this.pageSize + 1;
  }

  get showingTo(): number {
    if (!this.totalItems || this.users.length === 0) return 0;
    return Math.min(this.pageNumber * this.pageSize, this.totalItems);
  }

  get canGoPrevious(): boolean {
    return this.pageNumber > 1 && !this.loading;
  }

  get canGoNext(): boolean {
    return this.pageNumber < this.totalPages && !this.loading;
  }

  trackByUserId(_: number, user: UserByRoleResponse): string {
    return user.userId;
  }

  loadRoles(): void {
    this.rolesLoading = true;
    this.usersService.getRoles().subscribe({
      next: (roles) => {
        this.roles = (roles ?? []).filter((role) => !!role.id);
        this.rolesLoading = false;
      },
      error: () => {
        this.roles = [];
        this.rolesLoading = false;
      },
    });
  }

  onRoleChange(roleId: string): void {
    const normalizedRoleId = String(roleId ?? '').trim();
    if (!normalizedRoleId) return;
    void this.router.navigate(['/users/by-role', normalizedRoleId]);
  }

  onSearchTextChange(value: string): void {
    if (!this.hasRoleSelected) return;
    this.searchChanges.next(value);
  }

  clearSearch(): void {
    if (!this.searchText) return;
    this.searchText = '';
    this.pageNumber = 1;
    this.loadUsers();
  }

  changePageSize(value: string | number): void {
    const nextPageSize = Number(value);
    if (!Number.isFinite(nextPageSize) || nextPageSize <= 0) return;
    this.pageSize = nextPageSize;
    this.pageNumber = 1;
    if (!this.hasRoleSelected) return;
    this.loadUsers();
  }

  goToPage(page: number): void {
    const nextPage = Math.min(Math.max(page, 1), Math.max(this.totalPages, 1));
    if (nextPage === this.pageNumber || this.loading) return;
    this.pageNumber = nextPage;
    this.loadUsers();
  }

  pages(): number[] {
    if (this.totalPages <= 1) return [1];

    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    const start = Math.max(1, Math.min(this.pageNumber - half, this.totalPages - maxVisible + 1));
    const end = Math.min(this.totalPages, start + maxVisible - 1);

    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }

  roleLabel(user: UserByRoleResponse): string {
    const current = this.lang.current === 'ar' ? user.roleNameAr : user.roleNameEn;
    return current?.trim() || user.roleNameAr?.trim() || user.roleNameEn?.trim() || user.roleId;
  }

  roleIconClass(user: UserByRoleResponse): string {
    switch (this.roleKey(user)) {
      case 'admin':
        return 'fa-shield-halved';
      case 'entrancecashier':
        return 'fa-right-to-bracket';
      case 'exitcashier':
        return 'fa-right-from-bracket';
      case 'supervisor':
        return 'fa-user-check';
      default:
        return 'fa-user';
    }
  }

  roleBadgeClass(user: UserByRoleResponse): string {
    switch (this.roleKey(user)) {
      case 'admin':
        return 'role-badge-admin';
      case 'entrancecashier':
        return 'role-badge-entry';
      case 'exitcashier':
        return 'role-badge-exit';
      case 'supervisor':
        return 'role-badge-supervisor';
      default:
        return 'role-badge-default';
    }
  }

  canOpenTicketsReport(user: UserByRoleResponse): boolean {
    return this.roleKey(user) === 'entrancecashier';
  }

  openTicketsReport(user: UserByRoleResponse): void {
    this.selectedCashierReportUser = user;
    this.selectedSupervisorReportUser = null;
  }

  closeTicketsReport(): void {
    this.selectedCashierReportUser = null;
  }

  canOpenCollectionsReport(_user: UserByRoleResponse): boolean {
    // Disabled until backend implements GET /api/reports/supervisors/{supervisorId}/collection-report
    return false;
  }

  openCollectionsReport(user: UserByRoleResponse): void {
    this.selectedSupervisorReportUser = user;
    this.selectedCashierReportUser = null;
  }

  closeCollectionsReport(): void {
    this.selectedSupervisorReportUser = null;
  }

  formatTime(value: string | null | undefined): string {
    const normalized = this.normalizeShiftTime(value);
    return normalized || this.t('noShift');
  }

  formatShiftRange(user: UserByRoleResponse): string {
    const start = this.normalizeShiftTime(user.shiftStartTime);
    const end = this.normalizeShiftTime(user.shiftEndTime);
    if (!start || !end) return this.t('noShift');
    return `${start} - ${end}`;
  }

  private loadUsers(): void {
    if (!this.roleId) return;

    this.loading = true;
    this.errorMessage = '';

    this.usersService
      .getUsersByRoleId(this.roleId, this.pageNumber, this.pageSize, this.searchText)
      .subscribe({
        next: (response) => {
          const usersPage = response.users;
          this.roleNameEn = response.roleNameEn ?? '';
          this.roleNameAr = response.roleNameAr ?? '';
          this.users = usersPage?.data ?? [];
          this.pageNumber = usersPage?.currentPage ?? this.pageNumber;
          this.pageSize = usersPage?.pageSize ?? this.pageSize;
          this.totalItems = usersPage?.totalItems ?? 0;
          this.totalPages = usersPage?.totalPages ?? 0;
          this.loading = false;
        },
        error: (err) => {
          this.clearResult(false);
          this.errorMessage = this.errorExtractor.extractErrorMessage(err, this.t('failedLoad'));
          this.loading = false;
        },
      });
  }

  private clearResult(clearRoleNames = true): void {
    if (clearRoleNames) {
      this.roleNameEn = '';
      this.roleNameAr = '';
    }

    this.selectedCashierReportUser = null;
    this.selectedSupervisorReportUser = null;
    this.users = [];
    this.totalItems = 0;
    this.totalPages = 0;
  }

  private normalizeShiftTime(value: string | null | undefined): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;

    const dayTimeMatch = raw.match(/^0\.([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/);
    if (dayTimeMatch) {
      return `${dayTimeMatch[1]}:${dayTimeMatch[2]}`;
    }

    const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
    if (!match) return raw;

    return `${match[1]}:${match[2]}`;
  }

  private sameId(a: string | null | undefined, b: string | null | undefined): boolean {
    return String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase();
  }

  private roleKey(user: UserByRoleResponse): string {
    const roleName = String(user.roleNameEn || user.roleNameAr || '').replace(/\s+/g, '');
    const roleId = String(user.roleId ?? '').toLowerCase();

    if (roleId === RoleIds.admin || /admin|مدير/i.test(roleName)) return 'admin';
    if (roleId === RoleIds.entranceCashier || /entrancecashier|كاشيرالدخول/i.test(roleName)) {
      return 'entrancecashier';
    }
    if (roleId === RoleIds.exitCashier || /exitcashier|كاشيرالخروج/i.test(roleName)) {
      return 'exitcashier';
    }
    if (roleId === RoleIds.supervisor || /supervisor|مشرف/i.test(roleName)) return 'supervisor';

    return 'default';
  }
}
