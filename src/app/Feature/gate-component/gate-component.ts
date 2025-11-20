import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-gate-component',
  imports: [FormsModule, CommonModule, ReactiveFormsModule],
  templateUrl: './gate-component.html',
  styleUrl: './gate-component.css',
})
export class GateComponent {
  gates: any[] = []; // مصفوفة لتخزين بيانات البوابات
  selectedGate: string = ''; // لحفظ البوابة المختارة

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.getGates();
  }

  getGates(): void {
    this.http.get<any[]>('http://192.168.1.6/api/Gate/GetAll').subscribe(
      (data) => {
        this.gates = data; // تعيين البيانات إلى مصفوفة `gates`
      },
      (error) => {
        console.error('Error fetching gates:', error);
      }
    );
  }
}
