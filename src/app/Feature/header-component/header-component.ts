import { Component, inject } from '@angular/core';
import { AuthService } from '../../Services/Auth/auth-service';
import { Router } from '@angular/router';
import { SwitchlanguageComponent } from '../switchlanguage-component/switchlanguage-component';
import { LanguageService } from '../../Services/i18n/language-service';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header-component',
  standalone: true,
  imports: [SwitchlanguageComponent, CommonModule, RouterLink],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  public lang = inject(LanguageService);

  t = (ar: string, en: string) => (this.lang.isRTL() ? ar : en);

  logout() {
    this.auth.logout().subscribe({
      next: () => {
        this.finishLogout();
      },
      error: () => {
        this.finishLogout();
      },
    });
  }

  private finishLogout() {
    this.auth.clearUserData();
    this.router.navigate(['/login']);
  }
}
