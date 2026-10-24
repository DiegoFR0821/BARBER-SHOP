import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular/standalone';
import { UsuarioService, UsuarioPerfil } from '../../services/usuario';
import { SupabaseService, Cita, Anuncio } from '../../core/services/supabase.service';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, 
  IonCardContent, IonItem, IonLabel, IonAvatar, IonBadge,
  IonMenu, IonMenuToggle, IonList, IonModal, IonGrid, IonRow, IonCol,
  IonMenuButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  notificationsOutline, star, calendar, chevronForwardOutline, 
  timeOutline, alertCircleOutline, closeOutline, logoWhatsapp, 
  sparklesOutline, cartOutline, chatbubblesOutline, peopleOutline, 
  flameOutline, personOutline, logOutOutline, menuOutline, calendarOutline, 
  cutOutline, checkmarkCircleOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-resumen',
  templateUrl: './resumen.page.html',
  styleUrls: ['./resumen.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonButton, IonIcon, IonCard, IonCardHeader, IonCardSubtitle, 
    IonCardTitle, IonCardContent, IonItem, IonLabel, IonAvatar, IonBadge,
    IonMenu, IonMenuToggle, IonList, IonModal, IonGrid, IonRow, IonCol,
    IonMenuButton
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

  galeriaTrabajos = [
    { titulo: 'Corte Fade Clásico', categoria: 'DEGRADADOS', url: 'assets/img/cortes.jpg' },
    { titulo: 'Perfilado de Barba a Navaja', categoria: 'BARBA', url: 'assets/img/tintes.jpg' },
    { titulo: 'Tratamiento Capilar Purificante', categoria: 'TRATAMIENTOS', url: 'assets/img/uñas.jpg' },
    { titulo: 'Pompadour con Cera Mate', categoria: 'PEINADOS', url: 'assets/img/peinados.jpg' }
  ];

  constructor(
    private router: Router, 
    private menuCtrl: MenuController,
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService
  ){
    addIcons({ 
      notificationsOutline, star, calendar, chevronForwardOutline, 
      timeOutline, alertCircleOutline, closeOutline, logoWhatsapp, 
      sparklesOutline, cartOutline, chatbubblesOutline, peopleOutline, 
      flameOutline, personOutline, logOutOutline, menuOutline, calendarOutline, 
      cutOutline, checkmarkCircleOutline
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
    this.menuCtrl.close('perfil-menu'); 
    this.router.navigate(['/perfil']); 
  }

  async cerrarSesion() {
    this.menuCtrl.close('perfil-menu');
    const confirmar = confirm('¿Deseas cerrar tu sesión?');
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
