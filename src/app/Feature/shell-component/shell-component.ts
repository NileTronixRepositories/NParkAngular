import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule, RouterOutlet } from '@angular/router';

import { Subscription } from 'rxjs';

import { LanguageService, AppLang } from '../../Services/i18n/language-service';
import { AuthService } from '../../Services/Auth/auth-service';
import { FooterComponent } from '../footer-component/footer-component';
import { HeaderComponent } from '../header-component/header-component';
import { SidebarComponent } from '../sidebar-component/sidebar-component';

@Component({
  selector: 'app-shell-component',
  standalone: true,
  imports: [RouterOutlet, CommonModule, RouterModule, FooterComponent, HeaderComponent, SidebarComponent],
  templateUrl: './shell-component.html',
  styleUrl: './shell-component.css',
})
export class ShellComponent implements OnDestroy {
  // ===== DI =====
  private router = inject(Router);
  public i18n = inject(LanguageService);
  private auth = inject(AuthService);

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
      sanction: 'الغرامات',
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

  // Sidebar collapse state
  sidebarCollapsed = signal(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  currentUrl = signal(this.router.url);
  effectiveSidebarCollapsed = computed(
    () => this.sidebarCollapsed() || (this.isEntryRoute() && !this.isAdmin),
  );

  gateOpen = false;
  private sub?: Subscription;

  constructor() {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
        this.gateOpen = false;
      }
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

  isEntryRoute(): boolean {
    return this.currentUrl().startsWith('/tickets/entry');
  }

  toggleGate() {
    this.gateOpen = !this.gateOpen;
  }

  toggleSidebar() {
    if (this.isEntryRoute() && !this.isAdmin) return;
    this.sidebarCollapsed.update((v) => !v);
  }

  switchLang() {
    this.i18n.set(this.isRTL() ? 'en' : 'ar');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
