import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
  add, cartOutline, personAddOutline, refreshOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';

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
export class ResumenAdminPage implements OnInit, OnDestroy {

  private router = inject(Router);
  private supabaseService = inject(SupabaseService);

  totalCitas: number = 0;
  totalClientes: number = 0;
  totalProductos: number = 0;
  totalServicios: number = 0;
  citasPendientes: number = 0;
  ingresosEstimados: number = 0;
  actividadReciente: any[] = [];
  cargando: boolean = false;

  private syncSub?: Subscription;
  private realtimeChannel: any;

  constructor() {
    addIcons({ 
      cubeOutline, peopleOutline, calendarOutline, cutOutline, 
      menuOutline, trendingUpOutline, sparklesOutline, arrowForwardOutline, 
      add, cartOutline, personAddOutline, refreshOutline
    });
  }

  ngOnInit() {
    this.cargarDashboardReal();
    this.syncSub = this.supabaseService.datosActualizados$.subscribe(() => {
      this.cargarDashboardReal();
    });
    this.realtimeChannel = this.supabaseService.suscribirCambiosAdmin(() => {
      this.cargarDashboardReal();
    });
  }

  ionViewWillEnter() {
    this.cargarDashboardReal();
  }

  ngOnDestroy() {
    this.syncSub?.unsubscribe();
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  async cargarDashboardReal() {
    try {
      this.cargando = true;
      const metricas = await this.supabaseService.getMetricasDashboardAdmin();
      this.totalCitas = metricas.totalCitasHoy;
      this.totalClientes = metricas.totalClientes;
      this.totalProductos = metricas.bajoStock;
      this.totalServicios = metricas.totalServicios;
      this.citasPendientes = metricas.citasPendientes;
      this.ingresosEstimados = metricas.ingresosEstimados;
      this.actividadReciente = metricas.actividadReciente || [];
    } catch (error) {
      console.error('❌ Error cargando métricas de Supabase:', error);
    } finally {
      this.cargando = false;
    }
  }
}
