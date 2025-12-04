import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LanguageService } from '../../Services/i18n/language-service';

@Component({
  selector: 'app-switch-language',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './switchlanguage-component.html',
  styleUrl: './switchlanguage-component.css',
})
export class SwitchlanguageComponent {
  readonly i18n = inject(LanguageService);

  // Use computed signals for reactive updates
  readonly isRTL = computed(() => this.i18n.currentSignal() === 'ar');
  readonly label = computed(() => (this.isRTL() ? 'English' : 'Arabic'));

  toggle() {
    this.i18n.toggle();
  }
}
