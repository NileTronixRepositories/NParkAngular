import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { loadRuntimeEnvironment } from './app/Shared/environment/environment';

loadRuntimeEnvironment()
  .then(() => bootstrapApplication(App, appConfig))
  .catch((err) => console.error(err));
