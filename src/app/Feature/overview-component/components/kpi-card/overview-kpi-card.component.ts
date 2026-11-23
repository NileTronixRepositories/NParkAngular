import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type KpiTone = 'navy' | 'green' | 'blue' | 'amber' | 'red';

@Component({
  selector: 'app-overview-kpi-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article
      class="kpi-surface"
      [class.kpi-surface--clickable]="clickable"
      [attr.role]="clickable ? 'button' : null"
      [attr.tabindex]="clickable ? 0 : null"
      (click)="onCardClick()"
      (keydown.enter)="onCardClick()"
      (keydown.space)="onCardKeySpace($event)"
    >
      <div class="kpi-head">
        <span class="kpi-label">{{ label }}</span>
        <span class="kpi-icon" [ngClass]="'kpi-icon--' + tone" aria-hidden="true">
          <i [class]="icon"></i>
        </span>
      </div>

      <div class="kpi-metric-row">
        <span class="kpi-value" dir="ltr">{{ value }}</span>
        <span class="kpi-unit" *ngIf="unit">{{ unit }}</span>
      </div>

      <div class="kpi-meta">
        <ng-content></ng-content>
      </div>
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-width: 0;
      }

      .kpi-surface {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 6px;
        padding: 10px 14px;
        background: transparent;
        transition: background-color 160ms ease;
      }

      .kpi-surface--clickable {
        cursor: pointer;
      }

      .kpi-surface--clickable:hover {
        background: #f8fafd;
      }

      .kpi-surface--clickable:focus-visible {
        outline: 2px solid #d20a24;
        outline-offset: -2px;
      }

      .kpi-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
      }

      .kpi-label {
        font-size: 12.5px;
        font-weight: 700;
        color: #64748b;
        line-height: 1.25;
      }

      .kpi-icon {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        flex-shrink: 0;
      }

      .kpi-icon--navy {
        background: #eef2f7;
        color: #10243b;
      }

      .kpi-icon--blue {
        background: #eff6ff;
        color: #1d4ed8;
      }

      .kpi-icon--green {
        background: #ecfdf5;
        color: #0d9488;
      }

      .kpi-icon--amber {
        background: #fffbeb;
        color: #d97706;
      }

      .kpi-icon--red {
        background: #fef2f2;
        color: #d20a24;
      }

      .kpi-metric-row {
        display: flex;
        align-items: baseline;
        gap: 5px;
        flex-wrap: wrap;
      }

      .kpi-value {
        font-size: clamp(20px, 1.6vw, 24px);
        font-weight: 800;
        line-height: 1.1;
        color: #142238;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
      }

      .kpi-unit {
        font-size: 12px;
        font-weight: 700;
        color: #64748b;
      }

      .kpi-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        padding-top: 6px;
        border-top: 1px solid #f1f5f9;
        font-size: 11.5px;
        color: #64748b;
      }

      @media (max-width: 575.98px) {
        .kpi-surface {
          padding: 10px 12px;
          gap: 5px;
        }

        .kpi-icon {
          width: 26px;
          height: 26px;
          font-size: 0.8rem;
        }

        .kpi-value {
          font-size: 20px;
        }
      }
    `,
  ],
})
export class OverviewKpiCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() unit = '';
  @Input() icon = 'bi bi-bar-chart';
  @Input() tone: KpiTone = 'navy';
  @Input() clickable = false;
  @Output() cardClick = new EventEmitter<void>();

  onCardClick(): void {
    if (this.clickable) {
      this.cardClick.emit();
    }
  }

  onCardKeySpace(event: Event): void {
    if (this.clickable) {
      event.preventDefault();
      this.cardClick.emit();
    }
  }
}
