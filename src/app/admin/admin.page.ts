import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonSplitPane, IonMenu, IonContent, IonList, IonItem, IonIcon, 
  IonLabel, IonMenuToggle, IonRouterOutlet, IonNote 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  gridOutline, calendarOutline, peopleOutline, cubeOutline, 
  logOutOutline, megaphoneOutline, chatbubblesOutline
} from 'ionicons/icons'; 

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

  public appPages = [
    { title: 'Resumen', url: '/admin/resumen-admin', icon: 'grid' },
    { title: 'Citas', url: '/admin/citas', icon: 'calendar' },
    { title: 'Clientes', url: '/admin/clientes', icon: 'people' },
    { title: 'Inventario', url: '/admin/inventario', icon: 'cube' },
    { title: 'Modales Pop-up', url: '/admin/anuncios-admin', icon: 'megaphone' },
    { title: 'Sala Chat', url: '/admin/comunidad-admin', icon: 'chatbubbles' }
  ];

  constructor(private router: Router) {
    addIcons({ 
      gridOutline, calendarOutline, peopleOutline, cubeOutline, 
      logOutOutline, megaphoneOutline, chatbubblesOutline
    });
  }

  ngOnInit() {
    this.obtenerUsuario();
  }

  obtenerUsuario() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.auth.getUser() o auth state change)
    this.nombreAdmin = 'Administrador';
  }

  async cerrarSesion() {
    // TODO: Migrar a Supabase en Fase 2 (await supabase.auth.signOut())
    try {
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión', error);
    }
  }
}
