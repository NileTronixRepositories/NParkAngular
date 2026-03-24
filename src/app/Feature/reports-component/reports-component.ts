import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipePipe } from '../../Services/i18n/translate-pipe-pipe';
import { LanguageService } from '../../Services/i18n/language-service';
import { I18N_DICT, I18nDict } from '../../Services/i18n/i18n.tokens';

export interface TicketReport {
  ticketId: number;
  startDate: string;
  endDate?: string;
  price: number;
  vehicleNumber?: string;
  exceedPrice: number;
  cashierCreatedBy?: string;
  cardNumber?: string;
  isSubscriber: boolean;
}

@Component({
  selector: 'app-reports-component',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipePipe],
  templateUrl: './reports-component.html',
  styleUrls: ['./reports-component.css'],
  providers: [
    {
      provide: I18N_DICT,
      useValue: <I18nDict>(<unknown>{
        ar: {
          reports: 'التقارير',
          ticketId: 'رقم التذكرة',
          startDate: 'تاريخ البدء',
          endDate: 'تاريخ الانتهاء',
          price: 'السعر',
          vehicleNumber: 'رقم المركبة',
          exceedPrice: 'سعر التجاوز',
          cashierCreatedBy: 'بواسطة الكاشير',
          cardNumber: 'رقم الكارت',
          isSubscriber: 'مشترك؟',
          filters: 'الفلاتر',
          dateFrom: 'من تاريخ',
          dateTo: 'إلى تاريخ',
          search: 'بحث',
          noReports: 'لا توجد تقارير حالياً',
          subscriber: 'مشترك',
          visitor: 'زائر',
          egp: 'ج.م'
        },
        en: {
          reports: 'Reports',
          ticketId: 'Ticket ID',
          startDate: 'Start Date',
          endDate: 'End Date',
          price: 'Price',
          vehicleNumber: 'Vehicle Number',
          exceedPrice: 'Exceed Price',
          cashierCreatedBy: 'Created By',
          cardNumber: 'Card Number',
          isSubscriber: 'Is Subscriber?',
          filters: 'Filters',
          dateFrom: 'Date From',
          dateTo: 'Date To',
          search: 'Search',
          noReports: 'No reports found',
          subscriber: 'Subscriber',
          visitor: 'Visitor',
          egp: 'EGP'
        }
      })
    }
  ]
})
export class ReportsComponent implements OnInit {
  reports = signal<TicketReport[]>([]);
  loading = signal<boolean>(false);

  // Filters
  dateFrom = '';
  dateTo = '';
  filterVehicleNumber = '';

  constructor(public readonly lang: LanguageService) {}

  ngOnInit(): void {
    this.loadMockData();
  }

  loadMockData(): void {
    // Basic mock data for initial view
    const mockData: TicketReport[] = [
      {
        ticketId: 1001,
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        price: 50,
        vehicleNumber: 'ABC-123',
        exceedPrice: 10,
        cashierCreatedBy: 'Admin',
        cardNumber: '987654321',
        isSubscriber: true
      },
      {
        ticketId: 1002,
        startDate: new Date().toISOString(),
        price: 30,
        vehicleNumber: 'XYZ-789',
        exceedPrice: 0,
        cashierCreatedBy: 'Cashier_1',
        isSubscriber: false
      }
    ];
    this.reports.set(mockData);
  }

  onSearch(): void {
    console.log('Searching with filters:', {
      from: this.dateFrom,
      to: this.dateTo,
      vehicle: this.filterVehicleNumber
    });
    // In a real app, this would call a service
  }
}
