import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, 
  IonModal, IonInput, IonItem, IonLabel, IonBadge, IonSelect, 
  IonSelectOption, IonSegment, IonSegmentButton, IonAvatar,
  IonList, IonFab, IonFabButton, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  createOutline, trashOutline, closeOutline, saveOutline, 
  calendarOutline, timeOutline, cameraOutline, imageOutline, 
  personOutline, cutOutline, gridOutline, peopleOutline, cubeOutline, 
  add, checkmarkCircleOutline, refreshOutline 
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
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
export class CitasPage implements OnInit, OnDestroy {

  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private toastCtrl = inject(ToastController);

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

  private syncSub?: Subscription;
  private realtimeChannel: any;

  constructor() {
    addIcons({ 
      createOutline, trashOutline, closeOutline, saveOutline, 
      calendarOutline, timeOutline, cameraOutline, imageOutline, 
      personOutline, cutOutline, gridOutline, peopleOutline, cubeOutline, 
      add, checkmarkCircleOutline, refreshOutline 
    });
  }

  ngOnInit() {
    this.cargarTodo();
    this.syncSub = this.supabaseService.datosActualizados$.subscribe(() => {
      this.cargarTodo();
    });
    this.realtimeChannel = this.supabaseService.suscribirCambiosAdmin(() => {
      this.cargarTodo();
    });
  }

  ionViewWillEnter() {
    this.cargarTodo();
  }

  ngOnDestroy() {
    this.syncSub?.unsubscribe();
  }

  ejecutarAccionFab() {
    if (this.seccionActiva === 'reservas') {
      this.abrirModalReserva();
    } else if (this.seccionActiva === 'servicios') {
      this.abrirModalServicio();
    } else if (this.seccionActiva === 'barberos') {
      this.abrirModalBarbero();
    }
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
      const t = await this.toastCtrl.create({
        message: '⚠️ Por favor completa todos los campos de la cita.',
        duration: 2200,
        color: 'warning',
        position: 'bottom'
      });
      await t.present();
      return;
    }

    try {
      const clienteObj = this.clientes.find(c => (c.id || c.uid) === this.reservaActual.clienteId);
      const srvObj = this.servicios.find(s => s.id === this.reservaActual.servicioId);
      const barbObj = this.barberos.find(b => b.id === this.reservaActual.barberoId);

      if (this.modoEdicion && this.reservaActual.id) {
        await this.supabaseService.actualizarEstadoCita(this.reservaActual.id, this.reservaActual.estado);
      } else {
        await this.supabaseService.crearCita({
          cliente_id: this.reservaActual.clienteId,
          barbero_id: this.reservaActual.barberoId,
          servicio_id: this.reservaActual.servicioId,
          fecha: this.reservaActual.fecha,
          hora: this.reservaActual.hora,
          notas_corte: this.reservaActual.notas_corte,
          nombreCliente: clienteObj?.nombre || 'Cliente Barber Shop',
          nombreServicio: srvObj?.nombre || 'Servicio Barber Shop',
          precioServicio: srvObj?.precio || 35,
          nombreBarbero: barbObj?.nombre || 'Barbero Principal'
        });
      }

      this.isModalReservaOpen = false;
      await this.cargarCitas();

      const t = await this.toastCtrl.create({
        message: '✅ Cita sincronizada correctamente en Supabase.',
        duration: 2200,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (e: any) {
      console.error('Error al guardar cita:', e);
      if (e?.message?.includes('CONCURRENCY_ERROR') || e?.code === '23505') {
        alert('⚠️ Conflicto de horario: Este barbero ya tiene una cita activa en ese mismo día y hora.');
      }
    }
  }

  async cambiarEstadoRapido(cita: Cita, nuevoEstado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada') {
    try {
      await this.supabaseService.actualizarEstadoCita(cita.id, nuevoEstado);
      cita.estado = nuevoEstado;
      const t = await this.toastCtrl.create({
        message: `Estado actualizado a ${nuevoEstado.toUpperCase()}`,
        duration: 1600,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
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

  async cargarImagenServicio(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      this.servicioActual.imagen = await this.supabaseService.comprimirImagenArchivo(file, 400, 400, 0.7);
      const t = await this.toastCtrl.create({
        message: '📸 Fotografía de servicio optimizada.',
        duration: 1500,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (err) {
      console.error('Error comprimiendo imagen de servicio:', err);
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
      const t = await this.toastCtrl.create({
        message: '✅ Servicio guardado en el catálogo.',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (e) {
      console.error('Error al guardar servicio:', e);
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
  // GESTIÓN DE BARBEROS
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

  async cargarImagenBarbero(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      this.barberoActual.imagen = await this.supabaseService.comprimirImagenArchivo(file, 400, 400, 0.7);
      const t = await this.toastCtrl.create({
        message: '📸 Fotografía del barbero optimizada.',
        duration: 1500,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (err) {
      console.error('Error comprimiendo imagen de barbero:', err);
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
      const t = await this.toastCtrl.create({
        message: '✅ Barbero sincronizado en el staff.',
        duration: 2000,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (e) {
      console.error('Error al guardar barbero:', e);
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
