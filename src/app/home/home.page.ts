import { Component } from '@angular/core';
// Importamos TODOS los componentes visuales que usaremos de Ionic
// 1. Importamos TODAS las nuevas herramientas visuales que usaremos
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, 
  IonButtons, IonCard, IonCardHeader, IonCardTitle, 
  IonCardContent, IonGrid, IonRow, IonCol, IonIcon, 
  IonItem, IonLabel, IonList
} from '@ionic/angular/standalone';
// IMPORTANTE: Importamos el RouterLink para que los enlaces funcionen
import { RouterLink } from '@angular/router';

// 2. Importamos la función para agregar íconos y los íconos específicos
import { addIcons } from 'ionicons';
import { locationOutline, callOutline, logoWhatsapp, star, menuOutline, personOutline, home } from 'ionicons/icons';

@Component({
  // Etiqueta que identifica este componente
  selector: 'app-home',
  // Ruta de nuestro diseño HTML
  templateUrl: 'home.page.html',
  // Ruta de nuestros estilos
  styleUrls: ['home.page.scss'],
  // Confirmamos que es una página independiente (sin módulos)
  standalone: true,
  // 3. EL CAJÓN DE HERRAMIENTAS: Registramos todo para que el HTML no dé error
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, 
    IonButton, IonButtons, RouterLink,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, // Para las tarjetas
    IonGrid, IonRow, IonCol,                              // Para columnas adaptables
    IonIcon, IonItem, IonLabel, IonList                   // Para la lista de contacto
  ],
})
export class HomePage {
  constructor() {
    // Registramos los íconos para que Ionic los pueda dibujar
    addIcons({menuOutline,star,locationOutline,callOutline,logoWhatsapp,home,personOutline});
  }
}