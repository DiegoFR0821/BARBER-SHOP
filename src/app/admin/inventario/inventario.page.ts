import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
  saveOutline, add, cameraOutline, imageOutline, refreshOutline 
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
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
export class InventarioPage implements OnInit, OnDestroy {

  private supabaseService = inject(SupabaseService);
  private toastCtrl = inject(ToastController);
  private subDatos?: Subscription;
  private canalRealtime?: RealtimeChannel;

  readonly FOTO_RESPALDO = 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80';

  productos: ProductoBarberia[] = [];
  productosFiltrados: ProductoBarberia[] = [];
  searchTerm: string = '';

  isModalOpen: boolean = false;
  modoEdicion: boolean = false;
  guardando: boolean = false;
  productoActual: any = { 
    id: '', 
    nombre: '', 
    categoria: 'Fijación Capilar', 
    descripcion: '', 
    precio: 40, 
    stock: 20, 
    imagen: '' 
  };

  constructor() {
    addIcons({ 
      cubeOutline, createOutline, trashOutline, closeOutline, 
      saveOutline, add, cameraOutline, imageOutline, refreshOutline 
    });
  }

  async ngOnInit() {
    await this.cargarProductos();
    this.subDatos = this.supabaseService.datosActualizados$.subscribe((tabla) => {
      if (tabla === 'productos') {
        this.cargarProductos();
      }
    });
    this.canalRealtime = this.supabaseService.suscribirCambiosAdmin(() => {
      this.cargarProductos();
    });
  }

  async ionViewWillEnter() {
    await this.cargarProductos();
  }

  ngOnDestroy() {
    this.subDatos?.unsubscribe();
    if (this.canalRealtime) {
      this.supabaseService.client.removeChannel(this.canalRealtime);
    }
  }

  async cargarProductos() {
    try {
      this.productos = await this.supabaseService.getTodosLosProductosAdmin();
      this.filtrarProductos();
    } catch (error) {
      console.error('❌ Error leyendo inventario en Supabase:', error);
    }
  }

  onImagenError(prod: ProductoBarberia) {
    prod.imagen = this.FOTO_RESPALDO;
    prod.imagen_url = this.FOTO_RESPALDO;
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
      precio: 45, 
      stock: 20, 
      imagen: '' 
    };
    this.isModalOpen = true;
  }

  abrirModalEditar(prod: ProductoBarberia) {
    this.modoEdicion = true;
    this.productoActual = { 
      id: prod.id,
      nombre: prod.nombre,
      categoria: prod.categoria || 'Fijación Capilar',
      descripcion: prod.descripcion || '',
      precio: Number(prod.precio || 0),
      stock: Number(prod.stock ?? 0),
      imagen: prod.imagen || prod.imagen_url || this.FOTO_RESPALDO
    };
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  abrirSelectorArchivo() {
    const input = document.getElementById('file-upload-producto') as HTMLInputElement | null;
    if (input) {
      input.value = '';
      input.click();
    }
  }

  async cargarImagenProducto(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    try {
      const base64Comprimida = await this.supabaseService.comprimirImagenArchivo(file, 400, 400, 0.7);
      this.productoActual.imagen = base64Comprimida;
      const t = await this.toastCtrl.create({
        message: '📸 Fotografía cargada y optimizada.',
        duration: 1500,
        color: 'success',
        position: 'top'
      });
      await t.present();
    } catch (e) {
      console.warn('Error comprimiendo imagen:', e);
    }
  }

  async guardarProducto() {
    if (!this.productoActual.nombre || !this.productoActual.nombre.trim()) {
      alert('Por favor, ingresa el nombre del producto.');
      return;
    }

    this.guardando = true;
    try {
      const payload: Partial<ProductoBarberia> = {
        nombre: this.productoActual.nombre.trim(),
        categoria: this.productoActual.categoria || 'Fijación Capilar',
        descripcion: (this.productoActual.descripcion || '').trim(),
        precio: Number(this.productoActual.precio || 0),
        stock: Math.max(0, Math.round(Number(this.productoActual.stock ?? 0))),
        imagen_url: this.productoActual.imagen || this.FOTO_RESPALDO,
        activo: true
      };

      if (this.modoEdicion && this.productoActual.id) {
        await this.supabaseService.actualizarProducto(this.productoActual.id, payload);
      } else {
        await this.supabaseService.crearProducto(payload);
      }

      this.guardando = false;
      this.cerrarModal();
      await this.cargarProductos();

      const t = await this.toastCtrl.create({
        message: '✅ Producto y foto guardados en el inventario.',
        duration: 2200,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (error) {
      this.guardando = false;
      console.error('Error al guardar producto:', error);
      await this.cargarProductos();
      this.cerrarModal();
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
