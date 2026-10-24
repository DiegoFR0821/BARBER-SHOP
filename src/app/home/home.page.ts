import { Component } from '@angular/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButton, 
  IonButtons, IonCard, IonCardContent, IonGrid, IonRow, IonCol, 
  IonIcon, IonItem, IonLabel, IonList
} from '@ionic/angular/standalone';
import { RouterLink } from '@angular/router';
import { addIcons } from 'ionicons';
import { locationOutline, callOutline, logoWhatsapp, star, personOutline, home } from 'ionicons/icons';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, 
    IonButton, IonButtons, RouterLink,
    IonCard, IonCardContent,
    IonGrid, IonRow, IonCol,
    IonIcon, IonItem, IonLabel, IonList
  ],
})
export class HomePage {
  constructor() {
    addIcons({ star, locationOutline, callOutline, logoWhatsapp, home, personOutline });
  }
}
