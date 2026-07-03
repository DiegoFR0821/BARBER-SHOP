import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonApp, IonSplitPane, IonMenu, IonContent, IonList, IonListHeader, 
  IonNote, IonMenuToggle, IonItem, IonIcon, IonLabel, IonRouterOutlet,
  MenuController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  pieChartOutline, calendarOutline, peopleOutline, 
  cubeOutline, logOutOutline 
} from 'ionicons/icons';

// Inyectamos tu servicio para leer la RAM
import { UsuarioService } from '../services/usuario'; 

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, IonApp, IonSplitPane, IonMenu, 
    IonContent, IonList, IonListHeader, IonNote, IonMenuToggle, IonItem, 
    IonIcon, IonLabel, IonRouterOutlet
  ]
})
export class AdminPage implements OnInit {
  
  // Mapa de las rutas hijas del administrador
  public appPages = [
    { title: 'Resumen', url: '/admin/resumen-admin', icon: 'pie-chart' },
    { title: 'Citas', url: '/admin/citas', icon: 'calendar' },
    { title: 'Clientes', url: '/admin/clientes', icon: 'people' },
    { title: 'Inventario', url: '/admin/inventario', icon: 'cube' },
  ];

  nombreAdmin: string = 'Admin';

  constructor(
    private router: Router, 
    private menuCtrl: MenuController,
    private usuarioService: UsuarioService
  ) {
    // Registramos los íconos exactos que usaremos en el menú
    addIcons({ 
      'pie-chart-outline': pieChartOutline, 
      'calendar-outline': calendarOutline, 
      'people-outline': peopleOutline, 
      'cube-outline': cubeOutline,
      'log-out-outline': logOutOutline
    });
  }

  ngOnInit() {
    const datosUsuario = this.usuarioService.getUsuario();
    if (datosUsuario && datosUsuario.nombre) {
      this.nombreAdmin = datosUsuario.nombre.split(' ')[0];
    }
  }

  cerrarSesion() {
    this.usuarioService.limpiarUsuario(); // Borramos la RAM
    this.menuCtrl.close(); // Cerramos el menú
    this.router.navigate(['/login']); // Lo expulsamos al login
  }
}