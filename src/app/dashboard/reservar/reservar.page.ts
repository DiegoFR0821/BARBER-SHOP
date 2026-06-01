import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, 
  IonButton, IonIcon, IonDatetime, IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline, cutOutline, checkmarkCircleOutline, personOutline } from 'ionicons/icons';

@Component({
  selector: 'app-reservar',
  templateUrl: './reservar.page.html',
  styleUrls: ['./reservar.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButton, IonIcon, IonDatetime, IonGrid, IonRow, IonCol
  ]
})
export class ReservarPage implements OnInit {
  
  servicioSeleccionado: string = '';
  estilistaSeleccionado: string = '';
  
  // FIX DEL CALENDARIO: Fecha mínima estática (hoy) para evitar bloqueos
  fechaMinima: string = new Date().toISOString(); 
  fechaSeleccionada: string = new Date().toISOString();
  
  horaSeleccionada: string = '';

  servicios = [
    { id: 'corte', nombre: 'Corte', precio: 'S/ 35.00' },
    { id: 'balayage', nombre: 'Balayage', precio: 'S/ 120.00' },
    { id: 'manicura', nombre: 'Manicura', precio: 'S/ 25.00' },
    { id: 'tinte', nombre: 'Tinte', precio: 'S/ 80.00' }
  ];

  estilistas = [
    { id: 'ana', nombre: 'Ana', especialidad: 'Colorista' },
    { id: 'carlos', nombre: 'Carlos', especialidad: 'Cortes' },
    { id: 'luisa', nombre: 'Luisa', especialidad: 'Estilista' }
  ];

  horasDisponibles = ['10:00 AM', '11:00 AM', '12:00 PM', '03:00 PM', '04:00 PM'];

  constructor() {
    addIcons({ 
      'calendar-outline': calendarOutline, 
      'time-outline': timeOutline,
      'cut-outline': cutOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'person-outline': personOutline
    });
  }

  ngOnInit() {}

  seleccionarServicio(id: string) {
    this.servicioSeleccionado = id;
    this.estilistaSeleccionado = '';
    this.horaSeleccionada = '';
  }

  seleccionarEstilista(id: string) {
    this.estilistaSeleccionado = id;
    this.horaSeleccionada = '';
  }

  seleccionarHora(hora: string) {
    this.horaSeleccionada = hora;
  }

  confirmarReserva() {
    if(this.servicioSeleccionado && this.estilistaSeleccionado && this.horaSeleccionada) {
      console.log('Reserva confirmada:', this.servicioSeleccionado, this.estilistaSeleccionado, this.fechaSeleccionada, this.horaSeleccionada);
    }
  }
}