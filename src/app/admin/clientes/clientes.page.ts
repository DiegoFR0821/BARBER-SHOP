import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, 
  IonLabel, IonAvatar, IonBadge, IonModal, IonInput, IonItem,
  IonFab, IonFabButton, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  shieldOutline, peopleOutline, menuOutline, createOutline, 
  trashOutline, closeOutline, saveOutline, add, callOutline, mailOutline 
} from 'ionicons/icons';

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
export class ClientesPage implements OnInit {

  private router = inject(Router);

  usuarios: any[] = [];
  usuariosFiltrados: any[] = [];
  searchTerm: string = '';

  // Control del modal de formulario unificado (crear / editar)
  isModalOpen: boolean = false;
  modoEdicion: boolean = false;
  usuarioActual: any = { uid: '', nombre: '', correo: '', telefono: '', descripcion: '', rol: 'cliente' };

  constructor() {
    addIcons({ 
      shieldOutline, peopleOutline, menuOutline, createOutline, 
      trashOutline, closeOutline, saveOutline, add, callOutline, mailOutline 
    });
  }

  ngOnInit() {
    this.cargarUsuarios();
  }

  ionViewWillEnter() {
    this.cargarUsuarios();
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  async cargarUsuarios() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('usuarios').select('*'))
    try {
      this.usuarios = [];
      this.filtrarUsuarios();
    } catch (error) {
      console.error('❌ Error leyendo usuarios:', error);
    }
  }

  filtrarUsuarios() {
    if (!this.searchTerm.trim()) {
      this.usuariosFiltrados = [...this.usuarios];
    } else {
      this.usuariosFiltrados = this.usuarios.filter(u => 
        u.nombre && u.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  abrirModalCrear() {
    this.modoEdicion = false;
    this.usuarioActual = { uid: '', nombre: '', correo: '', telefono: '', descripcion: '', rol: 'cliente' };
    this.isModalOpen = true;
  }

  abrirModalEditar(user: any) {
    this.modoEdicion = true;
    this.usuarioActual = { ...user };
    if (!this.usuarioActual.telefono) this.usuarioActual.telefono = '';
    if (!this.usuarioActual.descripcion) this.usuarioActual.descripcion = '';
    if (!this.usuarioActual.rol) this.usuarioActual.rol = 'cliente';
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  async guardarUsuario() {
    if (!this.usuarioActual.nombre || !this.usuarioActual.correo) {
      alert('El nombre y el correo electrónico son campos obligatorios.');
      return;
    }

    // TODO: Migrar a Supabase en Fase 2 (update o insert en tabla 'usuarios')
    try {
      this.cerrarModal();
      this.cargarUsuarios();
    } catch (error) {
      console.error('Error al intentar guardar el usuario:', error);
      alert('Surgió un problema al guardar los datos del perfil.');
    }
  }

  async eliminarUsuario(uid: string) {
    const confirmar = confirm('¿Estás seguro de eliminar a este usuario permanentemente del sistema?');
    if (confirmar) {
      // TODO: Migrar a Supabase en Fase 2 (supabase.from('usuarios').delete().eq('id', uid))
      try {
        this.cargarUsuarios();
      } catch (error) {
        console.error('Error al intentar remover el documento:', error);
      }
    }
  }

  async cambiarRolDirecto(user: any) {
    const nuevoRol = user.rol === 'admin' ? 'cliente' : 'admin';
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('usuarios').update({ rol: nuevoRol }).eq('id', user.uid))
    try {
      user.rol = nuevoRol;
      this.cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  }
}
