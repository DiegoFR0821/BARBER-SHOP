import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonIcon, IonButton, IonGrid, IonRow, IonCol, IonDatetime 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-reservar',
  templateUrl: './reservar.page.html',
  styleUrls: ['./reservar.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonIcon, IonButton, IonGrid, IonRow, IonCol, IonDatetime]
})
export class ReservarPage implements OnInit {
  servicios: any[] = [];
  estilistas: any[] = [];
  horariosFijos: string[] = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
  
  reserva: any = { servicioId: '', estilistaId: '', fecha: '', hora: '' };
  citasOcupadas: string[] = [];

  ngOnInit() { this.cargarDatos(); }

  async cargarDatos() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('servicios').select('*') y supabase.from('estilistas').select('*'))
    this.servicios = [];
    this.estilistas = [];
  }

  async verificarDisponibilidad() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('citas').select('hora').eq('fecha', limpFecha))
    if (!this.reserva.fecha) return;
    this.citasOcupadas = [];
  }

  seleccionarServicio(serv: any) {
    this.reserva.servicioId = (this.reserva.servicioId === serv.id) ? '' : serv.id;
  }

  seleccionarEstilista(est: any) {
    if (this.reserva.estilistaId === est.id) { 
      this.reserva.estilistaId = ''; 
      this.reserva.hora = ''; 
      this.citasOcupadas = []; 
    } else { 
      this.reserva.estilistaId = est.id; 
      this.verificarDisponibilidad(); 
    }
  }

  async guardarReserva() {
    if (!this.reserva.servicioId || !this.reserva.estilistaId || !this.reserva.fecha || !this.reserva.hora) { 
      alert('Por favor, selecciona todos los campos obligatorios.'); 
      return; 
    }

    try {
      // TODO: Migrar a Supabase en Fase 2 (supabase.from('citas').insert({...}))
      alert('¡Cita reservada de forma exitosa!');
      this.reserva = { servicioId: '', estilistaId: '', fecha: '', hora: '' };
      this.citasOcupadas = [];
    } catch (e) { 
      alert('Error al intentar registrar la cita.'); 
    }
  }
}
