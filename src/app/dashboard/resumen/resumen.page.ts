import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular/standalone';
import { UsuarioService } from '../../services/usuario';
import { SupabaseService } from '../../core/services/supabase.service';
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
  flameOutline, personOutline, logOutOutline, menuOutline
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
  nombreCliente: string = 'Invitado'; 
  fotoCliente: string = '';
  tieneNotificaciones: boolean = true; 

  // Sistema de Cola de Promociones
  anunciosActivos: any[] = [];
  anuncioActual: any = null;
  indiceAnuncio: number = 0;
  isPromoOpen: boolean = false;    

  numeroWhatsApp: string = '51929727435';

  galeriaTrabajos = [
    { titulo: 'Corte Fade Clásico', categoria: 'CORTES', url: 'assets/img/cortes.jpg' },
    { titulo: 'Diseño y Perfilado de Barba', categoria: 'BARBA', url: 'assets/img/tintes.jpg' },
    { titulo: 'Tratamiento Capilar Masculino', categoria: 'TRATAMIENTOS', url: 'assets/img/uñas.jpg' },
    { titulo: 'Peinado Pompadour con Cera', categoria: 'PEINADOS', url: 'assets/img/peinados.jpg' }
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
      flameOutline, personOutline, logOutOutline, menuOutline
    });
  }

  ngOnInit() {
    this.obtenerDatosDeMemoria();
    this.cargarPromocionesCola();
  }

  ionViewWillEnter() {
    this.obtenerDatosDeMemoria();
  }

  obtenerDatosDeMemoria() {
    const datosUsuario = this.usuarioService.getUsuario();
    if (datosUsuario) {
      if (datosUsuario.nombre) {
        this.nombreCliente = datosUsuario.nombre.split(' ')[0];
      }
      if (datosUsuario.imagen) {
        this.fotoCliente = datosUsuario.imagen;
      } else {
        this.fotoCliente = '';
      }
    }
  }

  // ==============================
  // LÓGICA DE POP-UPS PROMOCIONALES
  // ==============================
  async cargarPromocionesCola() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('anuncios').select('*').eq('activo', true))
    try {
      this.anunciosActivos = [];
    } catch (error) {
      console.error('Error cargando anuncios:', error);
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
      }, 6000); 
    }
  }

  contactarWhatsAppPromocion() {
    if (!this.anuncioActual) return;
    const textoMensaje = `¡Hola Barber Shop! 👋 Me interesa mucho la promoción de: *${this.anuncioActual.titulo}*. ¿Me podrían dar más detalles?`;
    const waUrl = `https://wa.me/${this.numeroWhatsApp}?text=${encodeURIComponent(textoMensaje)}`;
    window.open(waUrl, '_blank');
    this.cerrarYContinuarSecuencia();
  }

  // ==============================
  // NAVEGACIÓN Y MENÚ
  // ==============================
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
