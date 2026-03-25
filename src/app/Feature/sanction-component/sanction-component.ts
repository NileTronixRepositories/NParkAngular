import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, NgIf, NgFor, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SanctionService } from '../../Services/Sanction/sanction.service';
import {
  SanctionDto,
  SanctionAddDto,
  SanctionUpdateDto,
} from '../../Domain/Sanction/sanction.models';
import { ToastServices } from '../../Services/Toster/toast-services';
import { LanguageService } from '../../Services/i18n/language-service';
import { SanctionTourService } from '../../Services/Sanction/sanction-tour.service';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';

@Component({
  selector: 'app-sanction-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe, NgIf, NgFor, NgClass],
  templateUrl: './sanction-component.html',
  styleUrl: './sanction-component.css',
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>{
        ar: {
          sanctions: 'العقوبات',
          name: 'الاسم',
          description: 'الوصف',
          amount: 'المبلغ',
          actions: 'إجراءات',
          add: 'إضافة',
          edit: 'تعديل',
          delete: 'حذف',
          save: 'حفظ',
          cancel: 'إلغاء',
          confirmDelete: 'هل أنت متأكد من الحذف؟',
          nameRequired: 'الاسم مطلوب',
          helpTour: 'شرح الواجهة',
        },
        en: {
          sanctions: 'Sanctions',
          name: 'Name',
          description: 'Description',
          amount: 'Amount',
          actions: 'Actions',
          add: 'Add',
          edit: 'Edit',
          delete: 'Delete',
          save: 'Save',
          cancel: 'Cancel',
          confirmDelete: 'Are you sure you want to delete?',
          nameRequired: 'Name is required',
          helpTour: 'Help Tour',
        },
      },
    },
  ],
})
export class SanctionComponent implements OnInit {
  private sanctionService = inject(SanctionService);
  private toast = inject(ToastServices);
  private sanctionTour = inject(SanctionTourService);
  i18n = inject(LanguageService);

  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  startTour() {
    this.sanctionTour.startTour();
  }

  // ===== State =====
  loading = signal(false);
  saving = signal(false);
  deleting = signal(false);

  sanctions = signal<SanctionDto[]>([]);
  searchTerm = signal('');

  // Modal state
  showModal = signal(false);
  isEditMode = signal(false);
  showDeleteModal = signal(false);
  selectedId = signal<string | null>(null);

  // Form model
  form = signal<SanctionAddDto>({ name: '', description: '', amount: 0 });

  filtered = computed(() => {
    const q = this.searchTerm().toLowerCase().trim();
    if (!q) return this.sanctions();
    return this.sanctions().filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        String(s.amount).includes(q),
    );
  });

  // ===== Lifecycle =====
  ngOnInit() {
    this.load();
  }

  // ===== API calls =====
  load() {
    this.loading.set(true);
    this.sanctionService.getAll().subscribe({
      next: (res) => {
        this.sanctions.set(res ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.toast.fromProblem(err);
        this.loading.set(false);
      },
    });
  }

  save() {
    const f = this.form();
    if (!f.name?.trim()) {
      this.toast.warn(this.i18n.current === 'ar' ? 'الاسم مطلوب' : 'Name is required');
      return;
    }
    this.saving.set(true);

    if (this.isEditMode()) {
      const dto: SanctionUpdateDto = { id: this.selectedId()!, ...f };
      this.sanctionService.update(dto).subscribe({
        next: (res) => {
          this.toast.fromSuccess(res);
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (err) => {
          this.toast.fromProblem(err);
          this.saving.set(false);
        },
      });
    } else {
      this.sanctionService.add(f).subscribe({
        next: (res) => {
          this.toast.fromSuccess(res);
          this.saving.set(false);
          this.closeModal();
          this.load();
        },
        error: (err) => {
          this.toast.fromProblem(err);
          this.saving.set(false);
        },
      });
    }
  }

  confirmDelete() {
    const id = this.selectedId();
    if (!id) return;
    this.deleting.set(true);
    this.sanctionService.delete(id).subscribe({
      next: (res) => {
        this.toast.fromSuccess(res);
        this.deleting.set(false);
        this.closeDeleteModal();
        this.load();
      },
      error: (err) => {
        this.toast.fromProblem(err);
        this.deleting.set(false);
      },
    });
  }

  // ===== Modal helpers =====
  openAddModal() {
    this.form.set({ name: '', description: '', amount: 0 });
    this.isEditMode.set(false);
    this.selectedId.set(null);
    this.showModal.set(true);
  }

  openEditModal(item: SanctionDto) {
    this.form.set({ name: item.name, description: item.description, amount: item.amount });
    this.isEditMode.set(true);
    this.selectedId.set(item.id);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  openDeleteModal(item: SanctionDto) {
    this.selectedId.set(item.id);
    this.showDeleteModal.set(true);
  }

  closeDeleteModal() {
    this.showDeleteModal.set(false);
    this.selectedId.set(null);
  }

  // ===== Form binding helpers =====
  setName(v: string) {
    this.form.update((f) => ({ ...f, name: v }));
  }
  setDescription(v: string) {
    this.form.update((f) => ({ ...f, description: v }));
  }
  setAmount(v: number) {
    this.form.update((f) => ({ ...f, amount: v }));
  }

  trackById(_: number, item: SanctionDto) {
    return item.id;
  }
}
