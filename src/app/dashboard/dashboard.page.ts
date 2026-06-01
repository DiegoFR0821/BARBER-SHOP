// Importamos la directiva Component desde las librerías fundamentales de Angular.
import { Component } from '@angular/core';
// Importamos las cinco herramientas visuales de Ionic requeridas para compilar el HTML de pestañas.
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
// Importamos la función nativa que inyecta los gráficos en el diccionario del framework.
import { addIcons } from 'ionicons';
// Importamos las figuras específicas desde la librería oficial de iconos vectoriales de Ionic.
import { home, calendar, bag, chatbubbleEllipses } from 'ionicons/icons';

@Component({
  // Identificador único de la etiqueta HTML personalizada para renderizar esta vista.
  selector: 'app-dashboard',
  // Apunta de forma directa a la plantilla de diseño de los botones inferiores.
  templateUrl: './dashboard.page.html',
  // Apunta al archivo donde definiremos los toques de color de nuestra marca Étnica.
  styleUrls: ['./dashboard.page.scss'],
  // Activamos el comportamiento standalone para prescindir de archivos modulares externos.
  standalone: true,
  // CAJÓN DE HERRAMIENTAS: habilitamos las etiquetas de Ionic para que el compilador las reconozca.
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
})
export class DashboardPage {
  // El método constructor se ejecuta automáticamente cuando se instancia la página en memoria.
  constructor() {
    // Vinculamos los nombres con las imágenes vectoriales importadas para usarlas en el HTML.
    addIcons({ home, calendar, bag, chatbubbleEllipses });
  }
}