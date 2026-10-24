import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService, UsuarioPerfil } from '../../services/usuario';
import { SupabaseService, Cita, Anuncio } from '../../core/services/supabase.service';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonBadge, IonModal, IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  notificationsOutline, star, calendar, chevronForwardOutline, 
  timeOutline, alertCircleOutline, closeOutline, logoWhatsapp, 
  sparklesOutline, cartOutline, chatbubblesOutline, peopleOutline, 
  flameOutline, personOutline, logOutOutline, calendarOutline, 
  cutOutline, checkmarkCircleOutline, personCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.page.html',
  styleUrls: ['./resumen.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonButton, IonIcon, IonBadge, IonModal, IonGrid, IonRow, IonCol
  ]
})
export class ResumenPage implements OnInit {

  // Datos del cliente
  usuarioActual: UsuarioPerfil | null = null;
  nombreCliente: string = 'Cliente'; 
  fotoCliente: string = '';
  tieneNotificaciones: boolean = false; 

  // Próxima cita agendada
  proximaCita: Cita | null = null;

  // Cola de Promociones / Anuncios desde Supabase
  anunciosActivos: Anuncio[] = [];
  anuncioActual: Anuncio | null = null;
  indiceAnuncio: number = 0;
  isPromoOpen: boolean = false;    

  numeroWhatsApp: string = '51929727435';

  // Galería de estilos 100% masculinos (The Barber Company style)
  galeriaTrabajos = [
    { 
      titulo: 'Corte Fade Clásico', 
      categoria: 'DEGRADADOS', 
      url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80' 
    },
    { 
      titulo: 'Perfilado de Barba a Navaja', 
      categoria: 'BARBA', 
      url: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80' 
    },
    { 
      titulo: 'Tratamiento Capilar Purificante', 
      categoria: 'TRATAMIENTOS', 
      url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80' 
    },
    { 
      titulo: 'Pompadour con Cera Mate', 
      categoria: 'PEINADOS', 
      url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80' 
    }
  ];

  constructor(
    private router: Router, 
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService
  ){
    addIcons({ 
      notificationsOutline, star, calendar, chevronForwardOutline, 
      timeOutline, alertCircleOutline, closeOutline, logoWhatsapp, 
      sparklesOutline, cartOutline, chatbubblesOutline, peopleOutline, 
      flameOutline, personOutline, logOutOutline, calendarOutline, 
      cutOutline, checkmarkCircleOutline, personCircleOutline
    });
  }

  ngOnInit() {
    this.obtenerDatosDeMemoria();
    this.cargarDatosSupabase();
  }

  ionViewWillEnter() {
    this.obtenerDatosDeMemoria();
    this.cargarDatosSupabase();
  }

  obtenerDatosDeMemoria() {
    this.usuarioActual = this.usuarioService.getUsuario();
    if (this.usuarioActual) {
      if (this.usuarioActual.nombre) {
        this.nombreCliente = this.usuarioActual.nombre.split(' ')[0];
      }
      this.fotoCliente = this.usuarioActual.avatar_url || this.usuarioActual.imagen || '';
    }
  }

  async cargarDatosSupabase() {
    await Promise.all([
      this.cargarProximaCita(),
      this.cargarPromocionesCola()
    ]);
  }

  /**
   * Consulta la próxima cita real del cliente en Supabase
   */
  async cargarProximaCita() {
    const clienteId = this.usuarioActual?.id || this.usuarioActual?.uid || this.supabaseService.currentUserValue?.id;
    if (!clienteId) return;

    try {
      const citas = await this.supabaseService.getCitasCliente(clienteId);
      const hoy = new Date().toISOString().split('T')[0];
      
      // Buscar primera cita activa (pendiente o confirmada)
      const proximas = citas.filter(c => c.estado !== 'cancelada' && c.fecha >= hoy);
      this.proximaCita = proximas.length > 0 ? proximas[0] : null;
    } catch (e) {
      console.warn('Error al consultar próxima cita:', e);
      this.proximaCita = null;
    }
  }

  /**
   * Carga los anuncios activos desde Supabase
   */
  async cargarPromocionesCola() {
    try {
      this.anunciosActivos = await this.supabaseService.getAnunciosActivos();
      if (this.anunciosActivos.length > 0) {
        this.indiceAnuncio = 0;
        this.dispararAnuncioModal();
      }
    } catch (error) {
      console.error('Error cargando anuncios desde Supabase:', error);
    }
  }

  dispararAnuncioModal() {
    this.anuncioActual = this.anunciosActivos[this.indiceAnuncio];
    this.isPromoOpen = true;
  }

  cerrarYContinuarSecuencia() {
    this.isPromoOpen = false;
    this.indiceAnuncio++;

    if (this.indiceAnuncio < this.anunciosActivos.length) {
      setTimeout(() => {
        this.dispararAnuncioModal();
      }, 7000); 
    }
  }

  contactarWhatsAppPromocion() {
    if (!this.anuncioActual) return;
    const textoMensaje = `¡Hola Barber Shop Lima Norte! 👋 Me interesa mucho la promoción de: *${this.anuncioActual.titulo}*. ¿Tienen disponibilidad hoy?`;
    const waUrl = `https://wa.me/${this.numeroWhatsApp}?text=${encodeURIComponent(textoMensaje)}`;
    window.open(waUrl, '_blank');
    this.cerrarYContinuarSecuencia();
  }

  irAPerfil() {
    this.router.navigate(['/perfil']); 
  }

  async cerrarSesion() {
    const confirmar = confirm('¿Deseas cerrar tu sesión de Barber Shop?');
    if (confirmar) {
      try {
        await this.supabaseService.signOut();
        this.usuarioService.limpiarUsuario();
        this.router.navigate(['/login']);
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    }
  }

  irA(ruta: string) {
    this.router.navigate([`/dashboard/${ruta}`]);
  }
}
