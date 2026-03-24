import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  computed,
  inject,
  signal,
  HostListener,
  ElementRef,
} from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { Subscription } from 'rxjs';

import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { AuthService } from '../../Services/Auth/auth-service';

@Component({
  selector: 'app-sidebar-component',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar-component.html',
  styleUrl: './sidebar-component.css',
})
export class SidebarComponent implements OnDestroy {
  @Input() collapsed = false;
  @Output() toggle = new EventEmitter<void>();

  private router = inject(Router);
  public i18n = inject(LanguageService);
  private auth = inject(AuthService);
  private el = inject(ElementRef);

  private dict: Record<AppLang, Record<string, string>> = {
    ar: {
      overview: 'نظرة عامة',
      parking: 'المواقف',
      gate: 'بوابات',
      entryGate: 'بوابة الدخول',
      exitGate: 'بوابة الخروج',
      visitor: 'الزائر',
      altaeriffa: 'التعريفة',
      subscription: 'الاشتراك',
      management: 'الإدارة',
      users: 'المستخدمون',
      configuration: 'الإعدادات',
      sanction: 'العقوبات',
      parkingGuidanceDiagram: 'مخطط توجيه المواقف',
      dashboard: 'لوحة التحكم',
      welcome: 'مرحبًا بعودتك',
      version: 'إصدار',
      toggleSubmenu: 'تبديل القائمة الفرعية',
      brand: 'إن بارك',
      langButton: 'English',
    },
    en: {
      overview: 'Overview',
      parking: 'Parking',
      gate: 'Gate',
      entryGate: 'Entry Gate',
      exitGate: 'Exit Gate',
      visitor: 'Visitor',
      altaeriffa: 'Altaeriffa',
      subscription: 'Subscription',
      management: 'Management',
      users: 'Users',
      configuration: 'Configuration',
      sanction: 'Sanctions',
      parkingGuidanceDiagram: 'Parking Guidance Diagram',
      dashboard: 'Dashboard',
      welcome: 'Welcome back',
      version: 'v',
      toggleSubmenu: 'Toggle submenu',
      brand: 'NPark',
      langButton: 'العربية',
    },
  };

  t = (key: string) => this.dict[this.i18n.current]?.[key] ?? key;
  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  gateOpen = false;
  private sub?: Subscription;

  constructor() {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.gateOpen = false;
    });
  }

  // ===== Roles helpers =====
  get role(): string | null {
    return this.auth.role;
  }

  get isAdmin(): boolean {
    return this.role === 'Admin';
  }

  get isEntranceCashier(): boolean {
    return this.role === 'EntranceCashier';
  }

  get isExitCashier(): boolean {
    return this.role === 'ExitCashier';
  }

  get isSupervisor(): boolean {
    return this.role === 'Supervisor';
  }

  toggleGate() {
    this.gateOpen = !this.gateOpen;
  }

  onToggle() {
    this.toggle.emit();
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    if (this.collapsed && this.gateOpen) {
      const clickedInside = this.el.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.gateOpen = false;
      }
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
