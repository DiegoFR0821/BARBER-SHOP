import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonIcon, IonButton, IonGrid, IonRow, IonCol, IonDatetime 
} from '@ionic/angular/standalone';
import { Firestore, collection, getDocs, addDoc, query, where } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-reservar',
  templateUrl: './reservar.page.html',
  styleUrls: ['./reservar.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonMenuButton, IonIcon, IonButton, IonGrid, IonRow, IonCol, IonDatetime]
})
export class ReservarPage implements OnInit {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  servicios: any[] = [];
  estilistas: any[] = [];
  horariosFijos: string[] = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'];
  
  reserva: any = { servicioId: '', estilistaId: '', fecha: '', hora: '' };
  citasOcupadas: string[] = [];

  ngOnInit() { this.cargarDatos(); }

  async cargarDatos() {
    const sSnap = await getDocs(collection(this.firestore, 'servicios'));
    this.servicios = sSnap.docs.map(d => ({ ...d.data(), id: d.id }));

    const eSnap = await getDocs(collection(this.firestore, 'estilistas'));
    this.estilistas = eSnap.docs.map(d => ({ ...d.data(), id: d.id }));
  }

  async verificarDisponibilidad() {
    if (!this.reserva.fecha) return;
    const limpFecha = this.reserva.fecha.split('T')[0];
    const q = query(collection(this.firestore, 'citas'), where('fecha', '==', limpFecha));
    const snap = await getDocs(q);
    this.citasOcupadas = snap.docs.map(d => d.data()['hora']);
  }

  seleccionarServicio(serv: any) {
    // Lógica para desmarcar si se toca el mismo que ya está activo
    this.reserva.servicioId = (this.reserva.servicioId === serv.id) ? '' : serv.id;
  }

  seleccionarEstilista(est: any) {
    // Lógica para desmarcar. Reiniciamos la hora al cambiar de estilista.
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
      const user = this.auth.currentUser;
      const serv = this.servicios.find(s => s.id === this.reserva.servicioId);
      const est = this.estilistas.find(e => e.id === this.reserva.estilistaId);

      await addDoc(collection(this.firestore, 'citas'), {
        clienteId: user?.uid || 'manual-id',
        nombreCliente: user?.displayName || user?.email || 'Cliente Regular',
        servicioId: this.reserva.servicioId,
        nombreServicio: serv ? serv.nombre : 'Servicio',
        estilistaId: this.reserva.estilistaId,
        nombreEstilista: est ? est.nombre : 'Estilista',
        fecha: this.reserva.fecha.split('T')[0],
        hora: this.reserva.hora,
        estado: 'pendiente'
      });
      alert('¡Cita reservada de forma exitosa!');
      // Limpiar formulario tras reservar
      this.reserva = { servicioId: '', estilistaId: '', fecha: '', hora: '' };
      this.citasOcupadas = [];
    } catch (e) { 
      alert('Error al intentar registrar la cita.'); 
    }
  }
}