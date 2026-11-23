import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, inject, signal } from '@angular/core';
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

  t = (key: string) => this.i18n.translate(this.dict, key);
  dir = computed(() => this.i18n.dir());
  isRTL = computed(() => this.i18n.isRTL());

  // Responsive viewport & sidebar state
  private viewportWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1440);
  isMobileViewport = computed(() => this.viewportWidth() < 992);
  sidebarCollapsed = signal(this.viewportWidth() < 1200);
  mobileSidebarOpen = signal(false);
  currentUrl = signal(this.router.url);

  effectiveSidebarCollapsed = computed(() => {
    // On mobile/tablet (< 992px), the drawer is always full-width when opened
    if (this.isMobileViewport()) return false;
    if (!this.isAdmin) return true;
    return this.sidebarCollapsed();
  });

  gateOpen = false;
  private sub?: Subscription;

  constructor() {
    this.sub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.currentUrl.set(event.urlAfterRedirects);
        this.gateOpen = false;
        this.mobileSidebarOpen.set(false);
      }
    });
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (typeof window === 'undefined') return;
    const width = window.innerWidth;
    this.viewportWidth.set(width);
    if (width >= 992 && this.mobileSidebarOpen()) {
      this.mobileSidebarOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.mobileSidebarOpen()) {
      this.mobileSidebarOpen.set(false);
    }
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

  isExitRoute(): boolean {
    return this.currentUrl().startsWith('/tickets/exit');
  }

  get shouldShowHeader(): boolean {
    return this.isAdmin || (!this.isEntryRoute() && !this.isExitRoute());
  }

  toggleGate() {
    this.gateOpen = !this.gateOpen;
  }

  toggleSidebar() {
    if (this.isMobileViewport()) {
      this.mobileSidebarOpen.update((v) => !v);
      return;
    }
    if (!this.isAdmin) return;
    this.sidebarCollapsed.update((v) => !v);
  }

  closeMobileSidebar() {
    this.mobileSidebarOpen.set(false);
  }

  switchLang() {
    this.i18n.set(this.isRTL() ? 'en' : 'ar');
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
