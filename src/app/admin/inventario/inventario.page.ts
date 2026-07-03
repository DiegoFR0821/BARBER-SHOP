import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, 
  IonLabel, IonAvatar, IonBadge, IonModal, IonInput, IonItem,
  IonFab, IonFabButton, IonGrid, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cubeOutline, menuOutline, createOutline, trashOutline, 
  closeOutline, saveOutline, add, cashOutline, alertCircleOutline, cameraOutline, imageOutline 
} from 'ionicons/icons';
import { Firestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonMenuButton, IonSearchbar, IonIcon, 
    IonButton, IonLabel, IonAvatar, IonBadge, IonModal, IonInput, 
    IonItem, IonFab, IonFabButton, IonGrid, IonRow, IonCol
  ]
})
export class InventarioPage implements OnInit {

  private firestore = inject(Firestore);
  private router = inject(Router);

  productos: any[] = [];
  productosFiltrados: any[] = [];
  searchTerm: string = '';

  isModalOpen: boolean = false;
  modoEdicion: boolean = false;
  
  // 👈 Añadido el campo 'imagen' nuevamente
  productoActual: any = { id: '', nombre: '', precio: null, stock: null, descripcion: '', imagen: '' };

  constructor() {
    addIcons({ 
      cubeOutline, menuOutline, createOutline, trashOutline, 
      closeOutline, saveOutline, add, cashOutline, alertCircleOutline, cameraOutline, imageOutline 
    });
  }

  ngOnInit() {
    this.cargarProductos();
  }

  ionViewWillEnter() {
    this.cargarProductos();
  }

  async cargarProductos() {
    try {
      const colRef = collection(this.firestore, 'productos');
      const snapshot = await getDocs(colRef);
      this.productos = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      this.filtrarProductos();
    } catch (error) {
      console.error('❌ Error leyendo inventario:', error);
    }
  }

  filtrarProductos() {
    if (!this.searchTerm.trim()) {
      this.productosFiltrados = [...this.productos];
    } else {
      this.productosFiltrados = this.productos.filter(p => 
        p.nombre && p.nombre.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  // ==========================================
  // LÓGICA DE IMAGEN Y MODAL
  // ==========================================
  abrirModalCrear() {
    this.modoEdicion = false;
    this.productoActual = { id: '', nombre: '', precio: null, stock: null, descripcion: '', imagen: '' };
    this.isModalOpen = true;
  }

  abrirModalEditar(prod: any) {
    this.modoEdicion = true;
    this.productoActual = { ...prod };
    if (!this.productoActual.descripcion) this.productoActual.descripcion = '';
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  // 👈 Función para abrir el explorador de archivos
  abrirSelectorArchivo() {
    document.getElementById('file-upload-producto')?.click();
  }

  // 👈 Función para transformar la imagen seleccionada a Base64
  cargarImagenProducto(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.productoActual.imagen = reader.result as string;
      };
    }
  }

  async guardarProducto() {
    if (!this.productoActual.nombre || this.productoActual.precio === null || this.productoActual.stock === null) {
      alert('Por favor, completa los campos obligatorios (Nombre, Precio y Stock).');
      return;
    }

    const datosParaGuardar = {
      nombre: this.productoActual.nombre,
      precio: Number(this.productoActual.precio),
      stock: Number(this.productoActual.stock),
      descripcion: this.productoActual.descripcion,
      imagen: this.productoActual.imagen || '' // 👈 Guardamos la imagen en Firebase
    };

    try {
      if (this.modoEdicion) {
        await updateDoc(doc(this.firestore, `productos/${this.productoActual.id}`), datosParaGuardar);
      } else {
        await addDoc(collection(this.firestore, 'productos'), datosParaGuardar);
      }
      this.cerrarModal();
      this.cargarProductos();
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      alert('Error al guardar en el inventario.');
    }
  }

  async eliminarProducto(id: string) {
    if (confirm('¿Eliminar este producto del inventario?')) {
      await deleteDoc(doc(this.firestore, `productos/${id}`));
      this.cargarProductos();
    }
  }
}