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

  private router = inject(Router);

  productos: any[] = [];
  productosFiltrados: any[] = [];
  searchTerm: string = '';

  isModalOpen: boolean = false;
  modoEdicion: boolean = false;
  
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
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('productos').select('*'))
    try {
      this.productos = [];
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

  abrirSelectorArchivo() {
    document.getElementById('file-upload-producto')?.click();
  }

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

    // TODO: Migrar a Supabase en Fase 2 (insert o update en tabla 'productos' / Supabase Storage)
    try {
      this.cerrarModal();
      this.cargarProductos();
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      alert('Error al guardar en el inventario.');
    }
  }

  async eliminarProducto(id: string) {
    if (confirm('¿Eliminar este producto del inventario?')) {
      // TODO: Migrar a Supabase en Fase 2 (supabase.from('productos').delete().eq('id', id))
      try {
        this.cargarProductos();
      } catch (error) {
        console.error(error);
      }
    }
  }
}
