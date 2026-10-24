import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonIcon, IonButton, IonGrid, IonRow, IonCol, 
  IonDatetime, IonSegment, IonSegmentButton, IonLabel, IonBadge, 
  IonItem, IonTextarea 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  calendar, cutOutline, personOutline, timeOutline, 
  closeCircleOutline, checkmarkCircleOutline, sparklesOutline, 
  alertCircleOutline, chatbubbleEllipsesOutline, refreshOutline 
} from 'ionicons/icons';
import { SupabaseService, Barbero, ServicioBarberia, Cita } from '../../core/services/supabase.service';
import { UsuarioService, UsuarioPerfil } from '../../services/usuario';

@Component({
  selector: 'app-reservar',
  templateUrl: './reservar.page.html',
  styleUrls: ['./reservar.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonMenuButton, IonIcon, IonButton, 
    IonGrid, IonRow, IonCol, IonDatetime, IonSegment, IonSegmentButton, 
    IonLabel, IonBadge, IonItem, IonTextarea
  ]
})
export class ReservarPage implements OnInit {

  // Control de pestañas: 'agendar' (Flujo 3 pasos) | 'mis-citas'
  vistaActiva: 'agendar' | 'mis-citas' = 'agendar';

  // Catálogos cargados desde Supabase
  servicios: ServicioBarberia[] = [];
  barberos: Barbero[] = [];
  misCitas: Cita[] = [];

  // Horarios de atención fijos en Barber Shop Lima Norte
  horariosFijos: string[] = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM'
  ];

  // Estado del flujo de agendamiento
  reserva = {
    servicioId: '',
    barberoId: '',
    fecha: '',
    hora: '',
    notas: ''
  };

  servicioSeleccionado: ServicioBarberia | null = null;
  barberoSeleccionado: Barbero | null = null;
  citasOcupadas: string[] = [];
  cargandoHorarios: boolean = false;
  guardandoCita: boolean = false;

  // Ficha técnica del cliente
  usuarioActual: UsuarioPerfil | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private usuarioService: UsuarioService
  ) {
    addIcons({ 
      calendar, cutOutline, personOutline, timeOutline, 
      closeCircleOutline, checkmarkCircleOutline, sparklesOutline, 
      alertCircleOutline, chatbubbleEllipsesOutline, refreshOutline 
    });
  }

  ngOnInit() {
    this.usuarioActual = this.usuarioService.getUsuario();
    this.cargarDatos();
  }

  ionViewWillEnter() {
    this.usuarioActual = this.usuarioService.getUsuario();
    this.cargarDatos();
    if (this.vistaActiva === 'mis-citas') {
      this.cargarMisCitas();
    }
  }

  /**
   * Carga dinámica de Barberos y Servicios masculinos desde Supabase
   */
  async cargarDatos() {
    try {
      const [barberosRes, serviciosRes] = await Promise.all([
        this.supabaseService.getBarberosActivos(),
        this.supabaseService.getServiciosActivos()
      ]);
      this.barberos = barberosRes;
      this.servicios = serviciosRes;
      await this.cargarMisCitas();
    } catch (e) {
      console.warn('Error cargando catálogos de reserva:', e);
    }
  }

  async cargarMisCitas() {
    const clienteId = this.usuarioActual?.id || this.usuarioActual?.uid || this.supabaseService.currentUserValue?.id;
    if (clienteId) {
      this.misCitas = await this.supabaseService.getCitasCliente(clienteId);
    }
  }

  // =========================================================================
  // PASO 1: SELECCIÓN DE SERVICIO Y BARBERO
  // =========================================================================

  seleccionarServicio(serv: ServicioBarberia) {
    if (this.reserva.servicioId === serv.id) {
      this.reserva.servicioId = '';
      this.servicioSeleccionado = null;
    } else {
      this.reserva.servicioId = serv.id;
      this.servicioSeleccionado = serv;
    }
  }

  seleccionarBarbero(barb: Barbero) {
    if (this.reserva.barberoId === barb.id) {
      this.reserva.barberoId = '';
      this.barberoSeleccionado = null;
      this.reserva.hora = '';
      this.citasOcupadas = [];
    } else {
      this.reserva.barberoId = barb.id;
      this.barberoSeleccionado = barb;
      this.verificarDisponibilidad();
    }
  }

  // =========================================================================
  // PASO 2: SELECCIÓN DE FECHA Y VERIFICACIÓN REACTIVA DE HORARIOS (< 2.0s)
  // =========================================================================

  async verificarDisponibilidad() {
    if (!this.reserva.fecha || !this.reserva.barberoId) {
      this.citasOcupadas = [];
      return;
    }

    // Normalizar formato de fecha YYYY-MM-DD
    const fechaLimpia = this.reserva.fecha.split('T')[0];
    
    // Regla de negocio: El local no atiende domingos
    const diaSemana = new Date(fechaLimpia + 'T00:00:00').getDay();
    if (diaSemana === 0) {
      alert('❌ Barber Shop Lima Norte no atiende los domingos. Por favor selecciona una fecha de Lunes a Sábado.');
      this.reserva.fecha = '';
      this.citasOcupadas = [];
      return;
    }

    this.cargandoHorarios = true;

    try {
      // Consulta optimizada con índices B-Tree en Supabase
      this.citasOcupadas = await this.supabaseService.getHorariosOcupados(
        this.reserva.barberoId,
        fechaLimpia
      );

      // Si la hora previamente seleccionada ahora está ocupada, se desmarca
      if (this.reserva.hora && this.citasOcupadas.includes(this.reserva.hora)) {
        this.reserva.hora = '';
      }
    } catch (e) {
      console.warn('Error al verificar horarios ocupados:', e);
      this.citasOcupadas = [];
    } finally {
      this.cargandoHorarios = false;
    }
  }

  seleccionarHora(hora: string) {
    if (this.citasOcupadas.includes(hora)) return;
    this.reserva.hora = hora;
  }

  // =========================================================================
  // PASO 3: CONFIRMACIÓN Y PREVENCIÓN DE CONCURRENCIA (Captura error 23505)
  // =========================================================================

  async confirmarCita() {
    if (!this.reserva.servicioId || !this.reserva.barberoId || !this.reserva.fecha || !this.reserva.hora) {
      alert('Por favor, completa los 3 pasos: selecciona Servicio, Barbero, Fecha y Hora.');
      return;
    }

    const clienteId = this.usuarioActual?.id || this.usuarioActual?.uid || this.supabaseService.currentUserValue?.id;
    if (!clienteId) {
      alert('Debes iniciar sesión para agendar una cita.');
      return;
    }

    this.guardandoCita = true;
    const fechaLimpia = this.reserva.fecha.split('T')[0];

    // Construir nota con las preferencias de corte del cliente
    const pref = this.usuarioActual?.preferencias_corte;
    let notaCompleta = this.reserva.notas.trim();
    if (pref?.estilo) {
      notaCompleta = `[Ficha: ${pref.estilo} | Barba: ${pref.barba || 'Perfilada'}] ${notaCompleta}`;
    }

    try {
      // Inserción atómica en Supabase protegida por el índice idx_citas_concurrencia_activa
      await this.supabaseService.crearCita({
        cliente_id: clienteId,
        barbero_id: this.reserva.barberoId,
        servicio_id: this.reserva.servicioId,
        fecha: fechaLimpia,
        hora: this.reserva.hora,
        notas_corte: notaCompleta
      });

      alert(`💈 ¡Cita confirmada con éxito en Barber Shop! Te esperamos el ${fechaLimpia} a las ${this.reserva.hora}.`);
      
      // Reiniciar formulario
      this.reserva = { servicioId: '', barberoId: '', fecha: '', hora: '', notas: '' };
      this.servicioSeleccionado = null;
      this.barberoSeleccionado = null;
      this.citasOcupadas = [];
      this.guardandoCita = false;

      // Recargar listado y cambiar a la vista de mis citas
      await this.cargarMisCitas();
      this.vistaActiva = 'mis-citas';

    } catch (error: any) {
      this.guardandoCita = false;
      console.error('Error al agendar cita en Supabase:', error);

      // CAPTURA ESPECÍFICA DE CONCURRENCIA (PostgreSQL 23505)
      if (error?.message?.includes('CONCURRENCY_ERROR') || error?.code === '23505') {
        alert('⚠️ ¡Atención! Otro cliente acaba de reservar este mismo horario con el barbero seleccionado. Por favor, elige otra hora disponible.');
        // Refrescamos disponibilidad inmediatamente
        await this.verificarDisponibilidad();
      } else {
        alert(error?.message || 'Surgió un inconveniente al registrar la cita.');
      }
    }
  }

  // =========================================================================
  // CANCELACIÓN DE CITAS DEL CLIENTE
  // =========================================================================

  async cancelarCita(cita: Cita) {
    const confirmar = confirm(`¿Estás seguro de cancelar tu cita de ${cita.nombreServicio} para el ${cita.fecha} a las ${cita.hora}?`);
    if (confirmar) {
      try {
        await this.supabaseService.actualizarEstadoCita(cita.id, 'cancelada');
        alert('Tu cita ha sido cancelada.');
        await this.cargarMisCitas();
      } catch (e) {
        console.error('Error al cancelar cita:', e);
        alert('No se pudo cancelar la cita.');
      }
    }
  }
}
