import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../Services/Auth/auth-service';
import { LanguageService } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-header-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {
  public lang = inject(LanguageService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  get langLabel(): string {
    return this.lang.current === 'ar' ? 'AR' : 'EN';
  }

  get logoutLabel(): string {
    return this.lang.current === 'ar' ? 'تسجيل الخروج' : 'Logout';
  }

  switchLang(): void {
    this.lang.toggle();
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.finishLogout(),
      error: () => this.finishLogout(),
    });
  }

  private finishLogout(): void {
    this.auth.clearUserData();
    this.router.navigate(['/login']);
  }
}
