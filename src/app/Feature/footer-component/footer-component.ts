import { Component, Inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';

@Component({
  selector: 'app-footer-component',
  standalone: true,
  imports: [CommonModule, TranslatePipePipe],
  templateUrl: './footer-component.html',
  styleUrls: ['./footer-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: (<I18nDict>{
        ar: {
          rights: 'جميع الحقوق محفوظة',
          poweredBy: 'مدعوم من',
          version: 'إصدار',
        },
        en: {
          rights: 'All rights reserved',
          poweredBy: 'Powered by',
          version: 'v',
        },
      }) as I18nDict,
    },
  ],
})
export class FooterComponent {
  @Input() variant: 'default' | 'login' = 'default';

  constructor(public lang: LanguageService, @Inject(I18N_DICT) private dict: I18nDict) {}
  currentYear = new Date().getFullYear();
}
