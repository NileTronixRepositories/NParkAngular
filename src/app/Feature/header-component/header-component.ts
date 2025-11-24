import { Component, inject } from '@angular/core';
import { AuthService } from '../../Services/Auth/auth-service';
import { Router } from '@angular/router';
import { SwitchlanguageComponent } from '../switchlanguage-component/switchlanguage-component';

@Component({
  selector: 'app-header-component',
  standalone: true,
  imports: [SwitchlanguageComponent],
  templateUrl: './header-component.html',
  styleUrl: './header-component.css',
})
export class HeaderComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

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
