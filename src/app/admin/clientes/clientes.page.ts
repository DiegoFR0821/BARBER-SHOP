import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, 
  IonLabel, IonAvatar, IonBadge, IonModal, IonInput, IonItem,
  IonFab, IonFabButton, IonSelect, IonSelectOption, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  shieldOutline, peopleOutline, menuOutline, createOutline, 
  trashOutline, closeOutline, saveOutline, add, callOutline, mailOutline, refreshOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../../core/services/supabase.service';
import { UsuarioPerfil, PreferenciasCliente } from '../../services/usuario';

@Component({
  selector: 'app-clientes',
  templateUrl: './clientes.page.html',
  styleUrls: ['./clientes.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonMenuButton, IonSearchbar, IonIcon, 
    IonButton, IonLabel, IonAvatar, IonBadge, IonModal, IonInput, 
    IonItem, IonFab, IonFabButton, IonSelect, IonSelectOption
  ]
})
export class ClientesPage implements OnInit, OnDestroy {

  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private toastCtrl = inject(ToastController);

  usuarios: UsuarioPerfil[] = [];
  usuariosFiltrados: UsuarioPerfil[] = [];
  searchTerm: string = '';

  isModalOpen: boolean = false;
  modoEdicion: boolean = false;
  
  usuarioActual: UsuarioPerfil = {
    id: '',
    nombre: '',
    correo: '',
    telefono: '',
    rol: 'cliente',
    historial_notas: ''
  };

  preferenciasEdicion: PreferenciasCliente = {
    estilo: 'Fade Clásico',
    tipo_cabello: 'Lacio',
    barba: 'Perfilada con Navaja',
    frecuencia: 'Quincenal',
    notas: ''
  };

  private syncSub?: Subscription;
  private realtimeChannel: any;

  constructor() {
    addIcons({ 
      shieldOutline, peopleOutline, menuOutline, createOutline, 
      trashOutline, closeOutline, saveOutline, add, callOutline, mailOutline, refreshOutline
    });
  }

  ngOnInit() {
    this.cargarUsuarios();
    this.syncSub = this.supabaseService.datosActualizados$.subscribe(() => {
      this.cargarUsuarios();
    });
    this.realtimeChannel = this.supabaseService.suscribirCambiosAdmin(() => {
      this.cargarUsuarios();
    });
  }

  ionViewWillEnter() {
    this.cargarUsuarios();
  }

  ngOnDestroy() {
    this.syncSub?.unsubscribe();
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  async cargarUsuarios(): Promise<void> {
    try {
      this.usuarios = await this.supabaseService.obtenerUsuarios();
      this.filtrarUsuarios();
    } catch (error) {
      console.error('❌ Error leyendo usuarios desde Supabase:', error);
    }
  }

  filtrarUsuarios(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.usuariosFiltrados = [...this.usuarios];
    } else {
      this.usuariosFiltrados = this.usuarios.filter(u => 
        (u.nombre && u.nombre.toLowerCase().includes(term)) ||
        (u.correo && u.correo.toLowerCase().includes(term)) ||
        (u.preferencias_corte?.estilo && u.preferencias_corte.estilo.toLowerCase().includes(term)) ||
        (u.preferencias_corte?.barba && u.preferencias_corte.barba.toLowerCase().includes(term))
      );
    }
  }

  abrirModalCrear(): void {
    this.modoEdicion = false;
    this.usuarioActual = {
      id: '',
      nombre: '',
      correo: '',
      telefono: '',
      rol: 'cliente',
      historial_notas: ''
    };
    this.preferenciasEdicion = {
      estilo: 'Fade Clásico',
      tipo_cabello: 'Lacio',
      barba: 'Perfilada con Navaja',
      frecuencia: 'Quincenal',
      notas: ''
    };
    this.isModalOpen = true;
  }

  abrirModalEditar(user: UsuarioPerfil): void {
    this.modoEdicion = true;
    this.usuarioActual = { ...user, id: user.id || user.uid || '' };
    if (!this.usuarioActual.telefono) this.usuarioActual.telefono = '';
    if (!this.usuarioActual.historial_notas) this.usuarioActual.historial_notas = user.descripcion || '';
    if (!this.usuarioActual.rol) this.usuarioActual.rol = 'cliente';

    if (user.preferencias_corte) {
      this.preferenciasEdicion = { ...user.preferencias_corte };
    } else {
      this.preferenciasEdicion = {
        estilo: 'Fade Clásico',
        tipo_cabello: 'Lacio',
        barba: 'Perfilada con Navaja',
        frecuencia: 'Quincenal',
        notas: ''
      };
    }

    this.isModalOpen = true;
  }

  cerrarModal(): void {
    this.isModalOpen = false;
  }

  async guardarUsuario(): Promise<void> {
    if (!this.usuarioActual.nombre || !this.usuarioActual.correo) {
      const t = await this.toastCtrl.create({
        message: '⚠️ El nombre y el correo electrónico son obligatorios.',
        duration: 2200,
        color: 'warning',
        position: 'bottom'
      });
      await t.present();
      return;
    }

    try {
      const payload: Partial<UsuarioPerfil> = {
        nombre: this.usuarioActual.nombre.trim(),
        correo: this.usuarioActual.correo.trim(),
        telefono: (this.usuarioActual.telefono || '').trim(),
        rol: this.usuarioActual.rol || 'cliente',
        preferencias_corte: this.preferenciasEdicion,
        historial_notas: (this.usuarioActual.historial_notas || '').trim()
      };

      if (this.modoEdicion && this.usuarioActual.id) {
        await this.supabaseService.actualizarPerfil(this.usuarioActual.id, payload);
      } else {
        await this.supabaseService.crearUsuarioAdmin(payload);
      }

      this.cerrarModal();
      await this.cargarUsuarios();

      const t = await this.toastCtrl.create({
        message: '✅ Ficha de cliente sincronizada en Supabase.',
        duration: 2200,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (error) {
      console.error('Error al intentar guardar el usuario en Supabase:', error);
    }
  }

  async eliminarUsuario(id?: string): Promise<void> {
    if (!id) return;
    const confirmar = confirm('¿Estás seguro de eliminar a este cliente permanentemente de Barber Shop?');
    if (confirmar) {
      try {
        await this.supabaseService.eliminarUsuario(id);
        await this.cargarUsuarios();
      } catch (error) {
        console.error('Error al intentar eliminar usuario de Supabase:', error);
      }
    }
  }

  async cambiarRolDirecto(user: UsuarioPerfil): Promise<void> {
    const id = user.id || user.uid;
    if (!id) return;

    const nuevoRol = user.rol === 'admin' ? 'cliente' : 'admin';
    try {
      await this.supabaseService.cambiarRolUsuario(id, nuevoRol);
      user.rol = nuevoRol;
      await this.cargarUsuarios();
      const t = await this.toastCtrl.create({
        message: `Rol actualizado a ${nuevoRol.toUpperCase()}`,
        duration: 1800,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (error) {
      console.error('Error al alternar rol en Supabase:', error);
    }
  }
}
