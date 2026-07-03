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
import { Firestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from '@angular/fire/firestore';

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

  private firestore = inject(Firestore);
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
    try {
      const colRef = collection(this.firestore, 'usuarios');
      const snapshot = await getDocs(colRef);
      this.usuarios = snapshot.docs.map(docSnap => ({
        uid: docSnap.id,
        ...docSnap.data()
      }));
      this.filtrarUsuarios();
    } catch (error) {
      console.error('❌ Error leyendo usuarios de Firestore:', error);
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

    try {
      if (this.modoEdicion) {
        // OPERACIÓN: ACTUALIZAR (UPDATE)
        const docRef = doc(this.firestore, `usuarios/${this.usuarioActual.uid}`);
        await updateDoc(docRef, {
          nombre: this.usuarioActual.nombre,
          correo: this.usuarioActual.correo,
          telefono: this.usuarioActual.telefono,
          descripcion: this.usuarioActual.descripcion,
          rol: this.usuarioActual.rol
        });
      } else {
        // OPERACIÓN: CREAR MANUAL (CREATE)
        const colRef = collection(this.firestore, 'usuarios');
        await addDoc(colRef, {
          nombre: this.usuarioActual.nombre,
          correo: this.usuarioActual.correo,
          telefono: this.usuarioActual.telefono,
          descripcion: this.usuarioActual.descripcion,
          rol: this.usuarioActual.rol,
          fechaRegistro: new Date()
        });
      }
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
      try {
        await deleteDoc(doc(this.firestore, `usuarios/${uid}`));
        this.cargarUsuarios();
      } catch (error) {
        console.error('Error al intentar remover el documento:', error);
      }
    }
  }

  async cambiarRolDirecto(user: any) {
    const nuevoRol = user.rol === 'admin' ? 'cliente' : 'admin';
    try {
      const docRef = doc(this.firestore, `usuarios/${user.uid}`);
      await updateDoc(docRef, { rol: nuevoRol });
      this.cargarUsuarios();
    } catch (error) {
      console.error(error);
    }
  }
}