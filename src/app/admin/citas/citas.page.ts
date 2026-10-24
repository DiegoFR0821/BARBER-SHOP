import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, IonFooter,
  IonModal, IonInput, IonItem, IonLabel, IonBadge, IonSelect, 
  IonSelectOption, IonSegment, IonSegmentButton, IonAvatar,
  IonList, IonFab, IonFabButton, IonFabList 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, closeOutline, saveOutline, calendarOutline, timeOutline, cameraOutline, imageOutline, personOutline, cutOutline, gridOutline, peopleOutline, cubeOutline, add } from 'ionicons/icons';

@Component({
  selector: 'app-citas',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonMenuButton, IonSearchbar, IonIcon, 
    IonButton, IonFooter, IonModal, IonInput, IonItem, IonLabel, 
    IonBadge, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonAvatar,
    IonList, IonFab, IonFabButton, IonFabList
  ]
})
export class CitasPage implements OnInit {

  private router = inject(Router);

  seccionActiva: string = 'reservas';
  searchTerm: string = '';
  citasFiltradas: any[] = []; 

  citas: any[] = [];
  servicios: any[] = [];
  estilistas: any[] = [];
  clientes: any[] = [];

  profesionesSalones: string[] = [
    'Estilista Principal', 'Colorista Profesional', 'Manicurista / Pedicurista', 
    'Maquillador Profesional', 'Especialista Capilar', 'Especialista en Peinados', 
    'Barbero Profesional', 'Especialista en Extensiones'
  ];

  horariosFijos: string[] = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  isModalReservaOpen: boolean = false;
  isModalServicioOpen: boolean = false;
  isModalEstilistaOpen: boolean = false;
  modoEdicion: boolean = false;

  reservaActual: any = { id: '', clienteId: '', servicioId: '', estilistaId: '', fecha: '', hora: '', estado: 'pendiente' };
  servicioActual: any = { id: '', nombre: '', imagen: '' };
  estilistaActual: any = { id: '', nombre: '', imagen: '', profesion: '' };

  ejecutarAccionFab() {
    if (this.seccionActiva === 'reservas') {
      this.abrirModalReserva();
    } else if (this.seccionActiva === 'servicios') {
      this.abrirModalServicio();
    } else if (this.seccionActiva === 'estilistas') {
      this.abrirModalEstilista();
    }
  }

  constructor() {
    addIcons({ createOutline, trashOutline, closeOutline, saveOutline, calendarOutline, timeOutline, cameraOutline, imageOutline, personOutline, cutOutline, gridOutline, peopleOutline, cubeOutline, add });
  }

  ngOnInit() {
    this.cargarTodo();
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  async cargarTodo() {
    await Promise.all([
      this.cargarCitas(),
      this.cargarServicios(),
      this.cargarEstilistas(),
      this.cargarClientes()
    ]);
  }

  async cargarCitas() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('citas').select('*'))
    this.citas = [];
    this.filtrarCitas();
  }

  filtrarCitas() {
    if (!this.searchTerm.trim()) {
      this.citasFiltradas = [...this.citas];
    } else {
      this.citasFiltradas = this.citas.filter(c => 
        c.nombreCliente && c.nombreCliente.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  async cargarServicios() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('servicios').select('*'))
    this.servicios = [];
  }

  async cargarEstilistas() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('estilistas').select('*'))
    this.estilistas = [];
  }

  async cargarClientes() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('usuarios').select('*').eq('rol', 'cliente'))
    this.clientes = [];
  }

  abrirModalReserva(cita?: any) {
    if (cita) {
      this.modoEdicion = true;
      this.reservaActual = { ...cita };
    } else {
      this.modoEdicion = false;
      this.reservaActual = { id: '', clienteId: '', servicioId: '', estilistaId: '', fecha: '', hora: '', estado: 'pendiente' };
    }
    this.isModalReservaOpen = true;
  }

  async guardarReserva() {
    if (!this.reservaActual.clienteId || !this.reservaActual.servicioId || !this.reservaActual.estilistaId || !this.reservaActual.fecha || !this.reservaActual.hora) {
      alert('Completa todos los campos de la reserva.'); return;
    }

    const diaSemana = new Date(this.reservaActual.fecha + 'T00:00:00').getDay(); 
    if (diaSemana === 0) { 
      alert('❌ El local no atiende los domingos. Elige una fecha de Lunes a Sábado.'); return;
    }

    // TODO: Migrar a Supabase en Fase 2 (insert/update en tabla 'citas')
    this.isModalReservaOpen = false;
    this.cargarCitas();
  }

  async eliminarReserva(id: string) {
    if (confirm('¿Eliminar cita?')) {
      // TODO: Migrar a Supabase en Fase 2 (supabase.from('citas').delete().eq('id', id))
      this.cargarCitas();
    }
  }

  abrirModalServicio(servicio?: any) {
    if (servicio) {
      this.modoEdicion = true;
      this.servicioActual = { ...servicio };
    } else {
      this.modoEdicion = false;
      this.servicioActual = { id: '', nombre: '', imagen: '' };
    }
    this.isModalServicioOpen = true;
  }

  abrirSelectorArchivo() {
    document.getElementById('file-upload-servicio')?.click();
  }

  cargarImagenServicio(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => { this.servicioActual.imagen = reader.result as string; };
    }
  }

  async guardarServicio() {
    if (!this.servicioActual.nombre) { alert('Ingresa un nombre para el servicio.'); return; }
    
    // TODO: Migrar a Supabase en Fase 2 (insert/update en tabla 'servicios')
    this.isModalServicioOpen = false;
    this.cargarServicios();
  }

  async eliminarServicio(id: string) {
    if (confirm('¿Eliminar este servicio del catálogo?')) {
      // TODO: Migrar a Supabase en Fase 2 (supabase.from('servicios').delete().eq('id', id))
      this.cargarServicios();
    }
  }

  abrirModalEstilista(estilista?: any) {
    if (estilista) {
      this.modoEdicion = true;
      this.estilistaActual = { ...estilista };
    } else {
      this.modoEdicion = false;
      this.estilistaActual = { id: '', nombre: '', imagen: '', profesion: 'Estilista Principal' };
    }
    this.isModalEstilistaOpen = true;
  }

  abrirSelectorEstilista() {
    document.getElementById('file-upload-estilista')?.click();
  }

  cargarImagenEstilista(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => { this.estilistaActual.imagen = reader.result as string; };
    }
  }

  async guardarEstilista() {
    if (!this.estilistaActual.nombre) { alert('Ingresa el nombre del estilista.'); return; }

    // TODO: Migrar a Supabase en Fase 2 (insert/update en tabla 'estilistas')
    this.isModalEstilistaOpen = false;
    this.cargarEstilistas();
  }

  async eliminarEstilista(id: string) {
    if (confirm('¿Dar de baja a este estilista?')) {
      // TODO: Migrar a Supabase en Fase 2 (supabase.from('estilistas').delete().eq('id', id))
      this.cargarEstilistas();
    }
  }
}
