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
    // إرسال طلب تسجيل الخروج إلى الـ API
    this.auth.logout().subscribe(
      (response) => {
        console.log('API call successful, logging out...');

        // بعد نجاح الاتصال مع الـ API، قم بمسح الـ Token وبيانات الـ User
        this.auth.clearUserData();

        // التوجيه إلى صفحة الـ login بعد نجاح العملية
        this.router.navigate(['/login']);
      },
      (error) => {
        console.error('Logout API call failed', error);

        // إذا فشل الاتصال مع الـ API، قم بمسح الـ Token وبيانات الـ User أيضًا
        this.auth.clearUserData();

        // التوجيه إلى صفحة الـ login حتى وإن فشل الاتصال
        this.router.navigate(['/login']);
      }
    );
  }

  // دالة لمسح الـ Token وبيانات الـ User
}
