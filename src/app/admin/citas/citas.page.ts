import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, 
  IonModal, IonInput, IonItem, IonLabel, IonBadge, IonSelect, 
  IonSelectOption, IonSegment, IonSegmentButton, IonAvatar,
  IonList, IonFab, IonFabButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  createOutline, trashOutline, closeOutline, saveOutline, 
  calendarOutline, timeOutline, cameraOutline, imageOutline, 
  personOutline, cutOutline, gridOutline, peopleOutline, cubeOutline, 
  add, checkmarkCircleOutline, refreshOutline 
} from 'ionicons/icons';
import { SupabaseService, Cita, Barbero, ServicioBarberia } from '../../core/services/supabase.service';
import { UsuarioPerfil } from '../../services/usuario';

@Component({
  selector: 'app-citas',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonMenuButton, IonSearchbar, IonIcon, 
    IonButton, IonModal, IonInput, IonItem, IonLabel, 
    IonBadge, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonAvatar,
    IonList, IonFab, IonFabButton
  ]
})
export class CitasPage implements OnInit {

  seccionActiva: string = 'reservas';
  searchTerm: string = '';
  citasFiltradas: Cita[] = []; 

  citas: Cita[] = [];
  servicios: ServicioBarberia[] = [];
  barberos: Barbero[] = [];
  clientes: UsuarioPerfil[] = [];

  especialidadesBarberia: string[] = [
    'Master Barber & Fade Urbano',
    'Especialista en Barba & Navaja',
    'Cortes Clásicos & Pompadour',
    'Tratamientos Capilares & Faciales',
    'Colorimetría & Decoloración Masculina'
  ];

  horariosFijos: string[] = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'
  ];

  isModalReservaOpen: boolean = false;
  isModalServicioOpen: boolean = false;
  isModalBarberoOpen: boolean = false;
  isModalFichaClienteOpen: boolean = false;
  modoEdicion: boolean = false;

  citaSeleccionadaParaFicha: Cita | null = null;

  reservaActual: any = { 
    id: '', 
    clienteId: '', 
    servicioId: '', 
    barberoId: '', 
    fecha: '', 
    hora: '', 
    estado: 'pendiente',
    notas_corte: ''
  };

  servicioActual: any = { id: '', nombre: '', categoria: 'Corte', precio: 35, duracion_min: 35, imagen: '' };
  barberoActual: any = { id: '', nombre: '', imagen: '', especialidad: 'Master Barber & Fade Urbano', experiencia: '5 años' };

  ejecutarAccionFab() {
    if (this.seccionActiva === 'reservas') {
      this.abrirModalReserva();
    } else if (this.seccionActiva === 'servicios') {
      this.abrirModalServicio();
    } else if (this.seccionActiva === 'barberos') {
      this.abrirModalBarbero();
    }
  }

  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    addIcons({ 
      createOutline, trashOutline, closeOutline, saveOutline, 
      calendarOutline, timeOutline, cameraOutline, imageOutline, 
      personOutline, cutOutline, gridOutline, peopleOutline, cubeOutline, 
      add, checkmarkCircleOutline, refreshOutline 
    });
  }

  ngOnInit() {
    this.cargarTodo();
  }

  ionViewWillEnter() {
    this.cargarTodo();
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  async cargarTodo() {
    await Promise.all([
      this.cargarCitas(),
      this.cargarServicios(),
      this.cargarBarberos(),
      this.cargarClientes()
    ]);
  }

  async cargarCitas() {
    try {
      this.citas = await this.supabaseService.getTodasLasCitasAdmin();
      this.filtrarCitas();
    } catch (e) {
      console.error('Error al cargar citas de Supabase:', e);
    }
  }

  filtrarCitas() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.citasFiltradas = [...this.citas];
    } else {
      this.citasFiltradas = this.citas.filter(c => 
        (c.nombreCliente && c.nombreCliente.toLowerCase().includes(term)) ||
        (c.nombreBarbero && c.nombreBarbero.toLowerCase().includes(term)) ||
        (c.nombreServicio && c.nombreServicio.toLowerCase().includes(term))
      );
    }
  }

  async cargarServicios() {
    this.servicios = await this.supabaseService.getServiciosActivos();
  }

  async cargarBarberos() {
    this.barberos = await this.supabaseService.getBarberosActivos();
  }

  async cargarClientes() {
    this.clientes = await this.supabaseService.obtenerUsuarios();
  }

  // ==========================================
  // GESTIÓN DE RESERVAS
  // ==========================================
  abrirModalReserva(cita?: Cita) {
    if (cita) {
      this.modoEdicion = true;
      this.reservaActual = { 
        id: cita.id, 
        clienteId: cita.cliente_id, 
        servicioId: cita.servicio_id, 
        barberoId: cita.barbero_id, 
        fecha: cita.fecha, 
        hora: cita.hora, 
        estado: cita.estado,
        notas_corte: cita.notas_corte || ''
      };
    } else {
      this.modoEdicion = false;
      this.reservaActual = { 
        id: '', 
        clienteId: this.clientes.length > 0 ? (this.clientes[0].id || this.clientes[0].uid) : '', 
        servicioId: this.servicios.length > 0 ? this.servicios[0].id : '', 
        barberoId: this.barberos.length > 0 ? this.barberos[0].id : '', 
        fecha: new Date().toISOString().split('T')[0], 
        hora: '10:00 AM', 
        estado: 'pendiente',
        notas_corte: ''
      };
    }
    this.isModalReservaOpen = true;
  }

  async guardarReserva() {
    if (!this.reservaActual.clienteId || !this.reservaActual.servicioId || !this.reservaActual.barberoId || !this.reservaActual.fecha || !this.reservaActual.hora) {
      alert('Por favor completa todos los campos de la cita.');
      return;
    }

    try {
      if (this.modoEdicion && this.reservaActual.id) {
        await this.supabaseService.actualizarEstadoCita(this.reservaActual.id, this.reservaActual.estado);
      } else {
        await this.supabaseService.crearCita({
          cliente_id: this.reservaActual.clienteId,
          barbero_id: this.reservaActual.barberoId,
          servicio_id: this.reservaActual.servicioId,
          fecha: this.reservaActual.fecha,
          hora: this.reservaActual.hora,
          notas_corte: this.reservaActual.notas_corte
        });
      }

      this.isModalReservaOpen = false;
      await this.cargarCitas();
      alert('¡Cita registrada correctamente en Supabase!');
    } catch (e: any) {
      console.error('Error al guardar cita:', e);
      if (e?.message?.includes('CONCURRENCY_ERROR') || e?.code === '23505') {
        alert('⚠️ Conflicto de horario: Este barbero ya tiene una cita activa en ese mismo día y hora.');
      } else {
        alert('Surgió un error al guardar la cita.');
      }
    }
  }

  async cambiarEstadoRapido(cita: Cita, nuevoEstado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada') {
    try {
      await this.supabaseService.actualizarEstadoCita(cita.id, nuevoEstado);
      cita.estado = nuevoEstado;
    } catch (e) {
      console.error('Error cambiando estado:', e);
    }
  }

  async eliminarReserva(id: string) {
    if (confirm('¿Eliminar esta cita del sistema?')) {
      try {
        await this.supabaseService.eliminarCita(id);
        await this.cargarCitas();
      } catch (e) {
        console.error('Error al eliminar cita:', e);
      }
    }
  }

  verFichaTecnicaCliente(cita: Cita) {
    this.citaSeleccionadaParaFicha = cita;
    this.isModalFichaClienteOpen = true;
  }

  // ==========================================
  // GESTIÓN DE SERVICIOS
  // ==========================================
  abrirModalServicio(servicio?: ServicioBarberia) {
    if (servicio) {
      this.modoEdicion = true;
      this.servicioActual = { ...servicio, imagen: servicio.imagen_url || servicio.imagen || '' };
    } else {
      this.modoEdicion = false;
      this.servicioActual = { id: '', nombre: '', categoria: 'Corte', precio: 35, duracion_min: 35, imagen: '' };
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
    if (!this.servicioActual.nombre) { 
      alert('Ingresa el nombre del servicio.'); 
      return; 
    }

    try {
      if (this.modoEdicion && this.servicioActual.id) {
        await this.supabaseService.actualizarServicio(this.servicioActual.id, this.servicioActual);
      } else {
        await this.supabaseService.crearServicio(this.servicioActual);
      }
      this.isModalServicioOpen = false;
      await this.cargarServicios();
    } catch (e) {
      console.error('Error al guardar servicio:', e);
      alert('Error al guardar el servicio en Supabase.');
    }
  }

  async eliminarServicio(id: string) {
    if (confirm('¿Eliminar este servicio del catálogo de Barber Shop?')) {
      try {
        await this.supabaseService.eliminarServicio(id);
        await this.cargarServicios();
      } catch (e) {
        console.error('Error al eliminar servicio:', e);
      }
    }
  }

  // ==========================================
  // GESTIÓN DE BARBEROS (Reemplaza Estilistas)
  // ==========================================
  abrirModalBarbero(barbero?: Barbero) {
    if (barbero) {
      this.modoEdicion = true;
      this.barberoActual = { ...barbero, imagen: barbero.foto_url || barbero.imagen || '' };
    } else {
      this.modoEdicion = false;
      this.barberoActual = { 
        id: '', 
        nombre: '', 
        imagen: '', 
        especialidad: 'Master Barber & Fade Urbano',
        experiencia: '5 años de experiencia'
      };
    }
    this.isModalBarberoOpen = true;
  }

  abrirSelectorBarbero() {
    document.getElementById('file-upload-barbero')?.click();
  }

  cargarImagenBarbero(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => { this.barberoActual.imagen = reader.result as string; };
    }
  }

  async guardarBarbero() {
    if (!this.barberoActual.nombre) { 
      alert('Ingresa el nombre del barbero.'); 
      return; 
    }

    try {
      if (this.modoEdicion && this.barberoActual.id) {
        await this.supabaseService.actualizarBarbero(this.barberoActual.id, this.barberoActual);
      } else {
        await this.supabaseService.crearBarbero(this.barberoActual);
      }
      this.isModalBarberoOpen = false;
      await this.cargarBarberos();
    } catch (e) {
      console.error('Error al guardar barbero:', e);
      alert('Error al registrar el barbero en Supabase.');
    }
  }

  async eliminarBarbero(id: string) {
    if (confirm('¿Dar de baja a este barbero del staff?')) {
      try {
        await this.supabaseService.eliminarBarbero(id);
        await this.cargarBarberos();
      } catch (e) {
        console.error('Error al dar de baja al barbero:', e);
      }
    }
  }
}
