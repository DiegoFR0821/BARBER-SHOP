import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, 
  IonLabel, IonMenuToggle, IonRouterOutlet, IonNote 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
// 👇 1. Importa el icono megaphoneOutline aquí
import { 
  gridOutline, calendarOutline, peopleOutline, cubeOutline, 
  logOutOutline, megaphoneOutline 
} from 'ionicons/icons'; 
import { Auth } from '@angular/fire/auth';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.page.html',
  styleUrls: ['./admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, IonSplitPane, IonMenu, 
    IonContent, IonList, IonItem, IonIcon, IonLabel, IonMenuToggle, 
    IonRouterOutlet, IonNote
  ]
})
export class AdminPage implements OnInit {
  nombreAdmin: string = 'Administrador';

  // 👇 2. Agrega la ruta de anuncios con su icono
  public appPages = [
    { title: 'Resumen', url: '/admin/resumen-admin', icon: 'grid' },
    { title: 'Citas', url: '/admin/citas', icon: 'calendar' },
    { title: 'Clientes', url: '/admin/clientes', icon: 'people' },
    { title: 'Inventario', url: '/admin/inventario', icon: 'cube' },
    { title: 'Modales Pop-up', url: '/admin/anuncios-admin', icon: 'megaphone' } // ¡Aquí está la nueva opción!
  ];

  constructor(private auth: Auth, private router: Router) {
    // 👇 3. Registra el icono en el constructor
    addIcons({ 
      gridOutline, calendarOutline, peopleOutline, cubeOutline, 
      logOutOutline, megaphoneOutline 
    });
  }

  ngOnInit() {
    this.obtenerUsuario();
  }

  obtenerUsuario() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        this.nombreAdmin = user.displayName || user.email || 'Administrador';
      }
    });
  }

  async cerrarSesion() {
    try {
      await this.auth.signOut();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    }
  }
}