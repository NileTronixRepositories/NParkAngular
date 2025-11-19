import { Routes } from '@angular/router';
import { authGuard } from './interceptors/Guard/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./Feature/login-component/login-component').then((m) => m.LoginComponent),
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./Feature/shell-component/shell-component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'overview',
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/overview-component/overview-component').then(
            (m) => m.OverviewComponent
          ),
      },

      {
        path: 'users',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () => import('./Feature/users/users').then((m) => m.Users),
      },

      {
        path: 'tickets',
        canActivate: [authGuard],
        children: [
          {
            path: '',
            pathMatch: 'full',
            redirectTo: 'entry',
          },
          {
            path: 'entry',
            data: {
              mode: 'entry',
              roles: ['Admin', 'EntranceCashier'],
            },
            canActivate: [authGuard],
            loadComponent: () =>
              import('./Feature/ticket-component/ticket-component').then((m) => m.TicketComponent),
          },
          {
            path: 'exit',
            data: {
              mode: 'exit',
              roles: ['Admin', 'ExitCashier'],
            },
            canActivate: [authGuard],
            loadComponent: () =>
              import('./Feature/ticket-component/ticket-component').then((m) => m.TicketComponent),
          },
        ],
      },

      {
        path: 'subscription',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/subscription-component/subscription-component').then(
            (m) => m.SubscriptionComponent
          ),
      },
      {
        path: 'parking-guidance-diagram',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import(
            './Feature/parking-guidance-diagram-component/parking-guidance-diagram-component'
          ).then((m) => m.ParkingGuidanceDiagramComponent),
      },
      {
        path: 'configuration',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/configuration-component/configuration-component').then(
            (m) => m.ConfigurationComponent
          ),
      },
      {
        path: 'registration',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/Registration-component/registration-component').then(
            (m) => m.RegistrationComponent
          ),
      },
      {
        path: 'exitgate',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/exitgate-component/exitgate-component').then(
            (m) => m.ExitgateComponent
          ),
      },
      {
        path: 'visitor',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/visitor-component/visitor-component').then((m) => m.VisitorComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
