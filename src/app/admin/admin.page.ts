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
import { SupabaseService } from '../core/services/supabase.service';
import { UsuarioService } from '../services/usuario';

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
  nombreAdmin: string = 'Administrador Barber Shop';

  public appPages = [
    { title: 'Resumen', url: '/admin/resumen-admin', icon: 'grid' },
    { title: 'Citas & Barberos', url: '/admin/citas', icon: 'calendar' },
    { title: 'Clientes', url: '/admin/clientes', icon: 'people' },
    { title: 'Inventario', url: '/admin/inventario', icon: 'cube' },
    { title: 'Banners y Pop-ups', url: '/admin/anuncios-admin', icon: 'megaphone' },
    { title: 'Sala Chat Soporte', url: '/admin/comunidad-admin', icon: 'chatbubbles' }
  ];

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private usuarioService: UsuarioService
  ) {
    addIcons({ 
      gridOutline, calendarOutline, peopleOutline, cubeOutline, 
      logOutOutline, megaphoneOutline, chatbubblesOutline
    });
  }

  ngOnInit() {
    this.obtenerUsuario();
  }

  async obtenerUsuario(): Promise<void> {
    // 1. Lectura inmediata de sesión en memoria
    const usuarioActual = this.usuarioService.getUsuario();
    if (usuarioActual && usuarioActual.nombre) {
      this.nombreAdmin = usuarioActual.nombre;
      return;
    }

    // 2. Consulta a Supabase si no está en memoria
    const authUser = this.supabaseService.currentUserValue;
    if (authUser) {
      const perfil = await this.supabaseService.getPerfil(authUser.id);
      if (perfil?.nombre) {
        this.nombreAdmin = perfil.nombre;
        this.usuarioService.setUsuario(perfil);
      } else {
        this.nombreAdmin = authUser.email?.split('@')[0] || 'Administrador';
      }
    }
  }

  async cerrarSesion(): Promise<void> {
    try {
      await this.supabaseService.signOut();
      this.usuarioService.limpiarUsuario();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error al cerrar sesión de administrador:', error);
      this.router.navigate(['/login']);
    }
  }
}
