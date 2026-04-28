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
      // Overview
      {
        path: 'overview',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/overview-component/overview-component').then(
            (m) => m.OverviewComponent,
          ),
      },

      // Users
      {
        path: 'users',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () => import('./Feature/users/users').then((m) => m.Users),
      },

      // Tickets (Entry / Exit)
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
              roles: ['Admin', 'EntranceCashier', 'Supervisor'],
            },
            canActivate: [authGuard],
            loadComponent: () =>
              import('./Feature/Entry-Component/ticket-component').then((m) => m.TicketComponent),
          },
          {
            path: 'exit',
            data: {
              mode: 'exit',
              roles: ['Admin', 'ExitCashier', 'Supervisor'],
            },
            canActivate: [authGuard],
            loadComponent: () =>
              import('./Feature/exitgate-component/exitgate-component').then(
                (m) => m.ExitgateComponent,
              ),
          },
        ],
      },

      // Altaeriffa
      {
        path: 'Altaeriffa',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/Altaeriffa-component/Altaeriffa-component').then(
            (m) => m.AltaeriffaComponent,
          ),
      },

      // Parking Guidance Diagram
      // {
      //   path: 'parking-guidance-diagram',
      //   canActivate: [authGuard],
      //   data: { roles: ['Admin'] },
      //   loadComponent: () =>
      //     import(
      //       './Feature/parking-guidance-diagram-component/parking-guidance-diagram-component'
      //     ).then((m) => m.ParkingGuidanceDiagramComponent),
      // },

      // Configuration
      {
        path: 'configuration',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/configuration-component/configuration-component').then(
            (m) => m.ConfigurationComponent,
          ),
      },

      // Registration
      {
        path: 'registration',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/Registration-component/registration-component').then(
            (m) => m.RegistrationComponent,
          ),
      },

      // Visitor
      {
        path: 'visitor',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/visitor-component/visitor-component').then((m) => m.VisitorComponent),
      },

      // Sanction
      {
        path: 'sanction',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/sanction-component/sanction-component').then(
            (m) => m.SanctionComponent,
          ),
      },

      // Add the Gate Component route here
      {
        path: 'gate-selection',
        canActivate: [authGuard],
        data: { roles: ['EntranceCashier', 'ExitCashier', 'Supervisor'] },
        loadComponent: () =>
          import('./Feature/gate-component/gate-component').then((m) => m.GateComponent),
      },
      // Reports
      {
        path: 'reports',
        canActivate: [authGuard],
        data: { roles: ['Admin'] },
        loadComponent: () =>
          import('./Feature/reports-component/reports-component').then((m) => m.ReportsComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'login' },
];
