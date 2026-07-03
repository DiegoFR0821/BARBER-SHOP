import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonIcon, IonGrid, IonRow, IonCol, 
  IonBadge, IonAvatar, IonButton, IonFab, IonFabButton, IonFabList
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cubeOutline, peopleOutline, calendarOutline, cutOutline, 
  menuOutline, trendingUpOutline, sparklesOutline, arrowForwardOutline, 
  add, cartOutline, personAddOutline
} from 'ionicons/icons';
import { Firestore, collection, getDocs, query, where } from '@angular/fire/firestore';

@Component({
  selector: 'app-resumen-admin',
  templateUrl: './resumen-admin.page.html',
  styleUrls: ['./resumen-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, IonContent, IonHeader, 
    IonTitle, IonToolbar, IonButtons, IonMenuButton, IonIcon, IonGrid, 
    IonRow, IonCol, IonBadge, IonAvatar, IonButton, IonFab, IonFabButton, IonFabList
  ]
})
export class ResumenAdminPage implements OnInit {

  private firestore = inject(Firestore);
  private router = inject(Router);

  totalCitas: number = 0;
  totalClientes: number = 0;
  totalProductos: number = 0;
  totalServicios: number = 0;
  actividadReciente: any[] = [];

  constructor() {
    addIcons({ 
      cubeOutline, peopleOutline, calendarOutline, cutOutline, 
      menuOutline, trendingUpOutline, sparklesOutline, arrowForwardOutline, 
      add, cartOutline, personAddOutline
    });
  }

  ngOnInit() {
    this.cargarDashboardReal();
  }

  ionViewWillEnter() {
    this.cargarDashboardReal();
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  async cargarDashboardReal() {
    try {
      const citasSnap = await getDocs(collection(this.firestore, 'citas'));
      this.totalCitas = citasSnap.size;

      const qClientes = query(collection(this.firestore, 'usuarios'), where('rol', '==', 'cliente'));
      const cliSnap = await getDocs(qClientes);
      this.totalClientes = cliSnap.size;

      const prodSnap = await getDocs(collection(this.firestore, 'productos'));
      this.totalProductos = prodSnap.size;
      
      const servSnap = await getDocs(collection(this.firestore, 'servicios'));
      this.totalServicios = servSnap.size;
      
      // Mapeo simple para la actividad reciente
      const ultimasCitasList = citasSnap.docs.slice(-3).map(d => ({
        titulo: 'Cita Agendada',
        detalle: `${d.data()['nombreCliente']} - ${d.data()['nombreServicio']}`,
        icono: 'calendar-outline',
        color: '#aa8529'
      }));
      this.actividadReciente = [...ultimasCitasList].reverse();

    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
    }
  }
}