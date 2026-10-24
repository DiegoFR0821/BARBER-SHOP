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
    // TODO: Migrar a Supabase en Fase 2 (consultas de conteo a Supabase: citas, usuarios, productos, servicios)
    try {
      this.totalCitas = 0;
      this.totalClientes = 0;
      this.totalProductos = 0;
      this.totalServicios = 0;
      this.actividadReciente = [];
    } catch (error) {
      console.error('❌ Error cargando métricas:', error);
    }
  }
}
