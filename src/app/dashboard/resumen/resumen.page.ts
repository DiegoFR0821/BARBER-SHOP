import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular/standalone';
import { UsuarioService } from '../../services/usuario';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, 
  IonCardContent, IonItem, IonLabel, IonAvatar, IonBadge,
  IonMenu, IonMenuToggle, IonList, IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  notificationsOutline, star, calendar, chevronForwardOutline, 
  timeOutline, alertCircleOutline 
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
    IonMenu, IonMenuToggle, IonList, IonModal
  ]
})
export class ResumenPage implements OnInit {
  
  // Datos del cliente
  nombreCliente: string = 'Invitado'; // 👈 Cambiado por defecto
  puntosAcumulados: number = 250;
  tieneNotificaciones: boolean = true; 

  // Variables del Modal de Promoción (Idea de tu compañero)
  isPromoOpen: boolean = false;    
  promocionActiva = {
    titulo: '20% Off en Coloración',
    descripcion: 'Renueva tu estilo esta temporada con nuestros especialistas.',
    textoValidez: 'Válido esta semana'
  };

  // 👈 Inyectamos el usuarioService en el constructor
  constructor(
    private router: Router, 
    private menuCtrl: MenuController,
    private usuarioService: UsuarioService
  ){
    addIcons({ 
      'notifications-outline': notificationsOutline, 
      'star': star, 
      'calendar': calendar,
      'chevron-forward-outline': chevronForwardOutline,
      'time-outline': timeOutline,
      'alert-circle-outline': alertCircleOutline
    });
  }

  ngOnInit() {
    // 👈 1. LECTURA DEL SERVICIO DE MEMORIA
    const datosUsuario = this.usuarioService.getUsuario();
    if (datosUsuario && datosUsuario.nombre) {
      // Extraemos el primer nombre (Ej: "Diego Jaime" -> "Diego")
      this.nombreCliente = datosUsuario.nombre.split(' ')[0];
    }

    // 2. LÓGICA DE LA PROMOCIÓN
    // Obtenemos la fecha de hoy en formato texto (Ejemplo: "31/5/2026")
    const fechaDeHoy = new Date().toLocaleDateString();
    
    // Buscamos en la memoria permanente qué día fue la última vez que se mostró
    const ultimoDiaMostrado = localStorage.getItem('promoMostradaDia');

    // Si el último día que se mostró no es hoy (o si nunca se ha mostrado)
    if (ultimoDiaMostrado !== fechaDeHoy) {
      setTimeout(() => {
        this.isPromoOpen = true;
        // Guardamos la fecha de hoy para que no vuelva a saltar hasta mañana
        localStorage.setItem('promoMostradaDia', fechaDeHoy);
      }, 1000);
    }
  }

  // Nueva función para navegar al perfil
  irAPerfil() {
    this.menuCtrl.close(); // Cierra el menú lateral suavemente
    this.router.navigate(['/perfil']); // Viaja a la página de perfil independiente
  }

  cerrarPromo() {
    this.isPromoOpen = false;
  }

  irA(ruta: string) {
    // Redirige usando el enrutador de Angular
    this.router.navigate([`/dashboard/${ruta}`]);
  }

  irACarrito() {
    this.menuCtrl.close(); // Cierra el menú lateral suavemente
    this.router.navigate(['/carrito']); // Viaja a la pantalla completa del carrito
  }
}