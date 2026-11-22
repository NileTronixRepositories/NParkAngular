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
        gap: 10px;
        padding: 18px 20px;
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
        gap: 8px;
      }

      .kpi-label {
        font-size: 14px;
        font-weight: 700;
        color: #64748b;
        line-height: 1.35;
      }

      .kpi-icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.05rem;
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
        gap: 6px;
        flex-wrap: wrap;
      }

      .kpi-value {
        font-size: clamp(26px, 2vw, 30px);
        font-weight: 800;
        line-height: 1.15;
        color: #142238;
        letter-spacing: -0.02em;
        font-variant-numeric: tabular-nums;
      }

      .kpi-unit {
        font-size: 14px;
        font-weight: 700;
        color: #64748b;
      }

      .kpi-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 10px;
        padding-top: 8px;
        border-top: 1px solid #f1f5f9;
        font-size: 12.5px;
        color: #64748b;
      }

      @media (max-width: 575.98px) {
        .kpi-surface {
          padding: 14px 16px;
          gap: 8px;
        }

        .kpi-icon {
          width: 32px;
          height: 32px;
          font-size: 0.95rem;
        }

        .kpi-value {
          font-size: 24px;
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
