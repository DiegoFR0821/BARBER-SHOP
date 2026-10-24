import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, 
  IonAvatar, IonModal, IonInput, IonItem,
  IonFab, IonFabButton, IonGrid, IonRow, IonCol,
  IonSelect, IonSelectOption, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cubeOutline, createOutline, trashOutline, closeOutline, 
  saveOutline, add, cameraOutline, imageOutline 
} from 'ionicons/icons';
import { SupabaseService, ProductoBarberia } from '../../core/services/supabase.service';

@Component({
  selector: 'app-inventario',
  templateUrl: './inventario.page.html',
  styleUrls: ['./inventario.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonMenuButton, IonSearchbar, IonIcon, 
    IonButton, IonAvatar, IonModal, IonInput, 
    IonItem, IonFab, IonFabButton, IonGrid, IonRow, IonCol,
    IonSelect, IonSelectOption
  ]
})
export class InventarioPage implements OnInit {

  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private toastCtrl = inject(ToastController);

  productos: ProductoBarberia[] = [];
  productosFiltrados: ProductoBarberia[] = [];
  searchTerm: string = '';

  // Estados del modal de formulario
  isModalOpen: boolean = false;
  modoEdicion: boolean = false;
  guardando: boolean = false;
  productoActual: any = { 
    id: '', 
    nombre: '', 
    categoria: 'Fijación Capilar', 
    descripcion: '', 
    precio: null, 
    stock: null, 
    imagen: '' 
  };

  constructor() {
    addIcons({ 
      cubeOutline, createOutline, trashOutline, closeOutline, 
      saveOutline, add, cameraOutline, imageOutline 
    });
  }

  async ngOnInit() {
    await this.cargarProductos();
  }

  async ionViewWillEnter() {
    await this.cargarProductos();
  }

  async cargarProductos() {
    try {
      this.productos = await this.supabaseService.getTodosLosProductosAdmin();
      this.filtrarProductos();
    } catch (error) {
      console.error('❌ Error leyendo inventario en Supabase:', error);
    }
  }

  filtrarProductos() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.productosFiltrados = [...this.productos];
    } else {
      this.productosFiltrados = this.productos.filter(p => 
        (p.nombre && p.nombre.toLowerCase().includes(term)) ||
        (p.categoria && p.categoria.toLowerCase().includes(term)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(term))
      );
    }
  }

  abrirModalCrear() {
    this.modoEdicion = false;
    this.productoActual = { 
      id: '', 
      nombre: '', 
      categoria: 'Fijación Capilar', 
      descripcion: '', 
      precio: null, 
      stock: null, 
      imagen: '' 
    };
    this.isModalOpen = true;
  }

  abrirModalEditar(prod: ProductoBarberia) {
    this.modoEdicion = true;
    this.productoActual = { 
      ...prod,
      imagen: prod.imagen || prod.imagen_url || ''
    };
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  abrirSelectorArchivo() {
    document.getElementById('file-upload-producto')?.click();
  }

  cargarImagenProducto(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 400;
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, MAX_SIZE, MAX_SIZE);
          this.productoActual.imagen = canvas.toDataURL('image/jpeg', 0.82);
        } else {
          this.productoActual.imagen = e.target.result;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  async guardarProducto() {
    if (!this.productoActual.nombre || this.productoActual.precio === null || this.productoActual.stock === null) {
      alert('Por favor, completa nombre, precio y stock.');
      return;
    }

    this.guardando = true;
    try {
      const payload: Partial<ProductoBarberia> = {
        nombre: this.productoActual.nombre.trim(),
        categoria: this.productoActual.categoria || 'Fijación Capilar',
        descripcion: (this.productoActual.descripcion || '').trim(),
        precio: Number(this.productoActual.precio),
        stock: Number(this.productoActual.stock),
        imagen_url: this.productoActual.imagen || 'https://images.unsplash.com/photo-1597854711516-17b5f8507851?auto=format&fit=crop&w=600&q=80',
        activo: true
      };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (this.modoEdicion && this.productoActual.id && uuidRegex.test(this.productoActual.id)) {
        await this.supabaseService.actualizarProducto(this.productoActual.id, payload);
      } else {
        await this.supabaseService.crearProducto(payload);
      }

      this.guardando = false;
      this.cerrarModal();
      await this.cargarProductos();

      const t = await this.toastCtrl.create({
        message: '✅ Inventario sincronizado en Supabase.',
        duration: 2200,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (error) {
      this.guardando = false;
      console.error('Error al guardar producto en Supabase:', error);
      alert('Surgió un error al guardar el producto en Supabase.');
    }
  }

  async eliminarProducto(id: string) {
    if (confirm('¿Estás seguro de eliminar permanentemente este artículo del inventario?')) {
      try {
        await this.supabaseService.eliminarProducto(id);
        await this.cargarProductos();
        const t = await this.toastCtrl.create({
          message: '🗑️ Producto eliminado del inventario.',
          duration: 2000,
          color: 'warning',
          position: 'bottom'
        });
        await t.present();
      } catch (error) {
        console.error('Error eliminando producto:', error);
        this.productos = this.productos.filter(p => p.id !== id);
        this.filtrarProductos();
      }
    }
  }
}
