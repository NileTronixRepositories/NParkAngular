import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { tokenInterceptor } from './interceptors/Auth/token.interceptor';
import { errorInterceptor } from './interceptors/Auth/error.interceptor';
import { languageHeaderInterceptor } from './interceptors/Lang/language-header.interceptor';

import { provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';

import { ToastrModule } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideHttpClient(
      withFetch(),
      withInterceptors([tokenInterceptor, errorInterceptor, languageHeaderInterceptor]),
    ),

    provideRouter(routes),

    provideAnimations(),

    importProvidersFrom(
      ToastrModule.forRoot({
        positionClass: 'toast-top-center',
        timeOut: 4000,
        progressBar: true,
        preventDuplicates: true,
        closeButton: true,
      }),
    ),
  ],
};
