import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToasterHostComponent } from "./Feature/toaster-host-component/toaster-host-component";
import { GateSessionLifecycleService } from './Services/Auth/gate-session-lifecycle.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToasterHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('NPark');

  constructor(gateSessionLifecycle: GateSessionLifecycleService) {
    gateSessionLifecycle.init();
  }
}
