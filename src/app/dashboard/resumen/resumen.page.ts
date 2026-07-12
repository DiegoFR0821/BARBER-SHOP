import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular/standalone';
import { UsuarioService } from '../../services/usuario';
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
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';

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
  
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  // Datos del cliente
  nombreCliente: string = 'Invitado'; 
  fotoCliente: string = ''; // 👈 Variable para controlar la foto en el menú
  tieneNotificaciones: boolean = true; 

  // Sistema de Cola de Promociones (Firebase)
  anunciosActivos: any[] = [];
  anuncioActual: any = null;
  indiceAnuncio: number = 0;
  isPromoOpen: boolean = false;    

  numeroWhatsApp: string = '51929727435';

  // 👈 GALERÍA DE LOOKS ACTUALIZADA CON TUS RUTAS LOCALES
  galeriaTrabajos = [
    { titulo: 'Corte Bob Simétrico', categoria: 'CORTES', url: 'assets/img/cortes.jpg' },
    { titulo: 'Balayage Caramelo Oro', categoria: 'TINTES', url: 'assets/img/tintes.jpg' },
    { titulo: 'Manicure Rusa Imperial', categoria: 'UÑAS', url: 'assets/img/uñas.jpg' },
    { titulo: 'Peinado Ondas de Agua', categoria: 'PEINADOS', url: 'assets/img/peinados.jpg' }
  ];

  constructor(
    private router: Router, 
    private menuCtrl: MenuController,
    private usuarioService: UsuarioService
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

  // 🌟 MAGIA: Se ejecuta cada vez que regresas a la pestaña Resumen
  ionViewWillEnter() {
    this.obtenerDatosDeMemoria();
  }

  // Centralizamos la lógica de lectura
  obtenerDatosDeMemoria() {
    const datosUsuario = this.usuarioService.getUsuario();
    if (datosUsuario) {
      if (datosUsuario.nombre) {
        this.nombreCliente = datosUsuario.nombre.split(' ')[0];
      }
      // Actualizamos la foto dinámicamente si existe
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
    try {
      const q = query(collection(this.firestore, 'anuncios'), where('activo', '==', true));
      const snap = await getDocs(q);
      this.anunciosActivos = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (this.anunciosActivos.length > 0) {
        this.indiceAnuncio = 0;
        this.dispararAnuncioModal();
      }
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
    const textoMensaje = `¡Hola Étnica Salón! 👋 Me interesa mucho la promoción de: *${this.anuncioActual.titulo}*. ¿Me podrían dar más detalles?`;
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
        await this.auth.signOut();
        this.usuarioService.limpiarUsuario(); // Borramos memoria local por seguridad
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