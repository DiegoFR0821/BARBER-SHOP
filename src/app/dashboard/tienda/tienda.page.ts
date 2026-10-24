import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonGrid, IonRow, IonCol, IonBadge, IonSearchbar, IonFooter, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cartOutline, imageOutline, addOutline, checkmarkCircleOutline, arrowForwardOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { SupabaseService, ProductoBarberia } from '../../core/services/supabase.service';

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonBadge, 
    IonSearchbar, IonFooter
  ]
})
export class TiendaPage implements OnInit, OnDestroy {
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private toastCtrl = inject(ToastController);
  private subDatos?: Subscription;

  readonly FOTO_MASCULINA_RESPALDO = 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80';

  productos: ProductoBarberia[] = [];
  productosFiltrados: ProductoBarberia[] = [];
  searchTerm: string = '';
  categoriaSeleccionada: string = 'Todos';
  categorias: string[] = ['Todos', 'Fijación Capilar', 'Cuidado de Barba', 'Cuidado Capilar'];
  cantidadCarrito: number = 0;
  subtotalCarrito: number = 0;

  constructor() {
    addIcons({ cartOutline, imageOutline, addOutline, checkmarkCircleOutline, arrowForwardOutline });
  }

  async ngOnInit() {
    await this.cargarProductos();
    this.actualizarCantidadCarrito();
    this.subDatos = this.supabaseService.datosActualizados$.subscribe((tabla) => {
      if (tabla === 'productos') {
        this.cargarProductos();
      }
    });
  }

  async ionViewWillEnter() {
    await this.cargarProductos();
    this.actualizarCantidadCarrito();
  }

  ngOnDestroy() {
    this.subDatos?.unsubscribe();
  }

  async cargarProductos() {
    try {
      this.productos = await this.supabaseService.getProductosActivos();
      this.filtrarProductos();
    } catch (error) {
      console.error('Error cargando productos desde Supabase:', error);
    }
  }

  onImagenError(prod: ProductoBarberia) {
    prod.imagen = this.FOTO_MASCULINA_RESPALDO;
    prod.imagen_url = this.FOTO_MASCULINA_RESPALDO;
  }

  seleccionarCategoria(cat: string) {
    this.categoriaSeleccionada = cat;
    this.filtrarProductos();
  }

  filtrarProductos() {
    const term = this.searchTerm.trim().toLowerCase();
    this.productosFiltrados = this.productos.filter(p => {
      const coincideCategoria = this.categoriaSeleccionada === 'Todos' || 
        (p.categoria && p.categoria.toLowerCase() === this.categoriaSeleccionada.toLowerCase());
      const coincideBusqueda = !term ||
        p.nombre.toLowerCase().includes(term) ||
        (p.categoria && p.categoria.toLowerCase().includes(term)) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(term));

      return coincideCategoria && coincideBusqueda;
    });
  }

  private obtenerItemsGuardados(): any[] {
    try {
      const raw = localStorage.getItem('barber_cart') || localStorage.getItem('barber_shop_carrito');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private guardarItemsEnStorage(items: any[]) {
    const json = JSON.stringify(items);
    localStorage.setItem('barber_cart', json);
    localStorage.setItem('barber_shop_carrito', json);
  }

  actualizarCantidadCarrito() {
    const items = this.obtenerItemsGuardados();
    this.cantidadCarrito = items.reduce((acc: number, item: any) => acc + (Number(item.cantidad) || 1), 0);
    this.subtotalCarrito = items.reduce((acc: number, item: any) => acc + (Number(item.precio || 0) * (Number(item.cantidad) || 1)), 0);
  }

  async agregarAlCarrito(producto: ProductoBarberia) {
    if (producto.stock <= 0) {
      const t = await this.toastCtrl.create({
        message: 'Este producto se encuentra temporalmente agotado.',
        duration: 2000,
        color: 'danger',
        position: 'bottom'
      });
      await t.present();
      return;
    }

    try {
      const items = this.obtenerItemsGuardados();
      const index = items.findIndex((i: any) => i.id === producto.id || i.nombre === producto.nombre);

      if (index >= 0) {
        const nuevaCantidad = (Number(items[index].cantidad) || 1) + 1;
        if (nuevaCantidad > producto.stock) {
          const t = await this.toastCtrl.create({
            message: `Solo quedan ${producto.stock} unidades disponibles en stock.`,
            duration: 2200,
            color: 'warning',
            position: 'bottom'
          });
          await t.present();
          return;
        }
        items[index].cantidad = nuevaCantidad;
        items[index].stock = producto.stock;
      } else {
        items.push({
          ...producto,
          imagen: producto.imagen || producto.imagen_url || this.FOTO_MASCULINA_RESPALDO,
          cantidad: 1
        });
      }

      this.guardarItemsEnStorage(items);
      this.actualizarCantidadCarrito();

      const toast = await this.toastCtrl.create({
        message: `🛒 ${producto.nombre} añadido al carrito.`,
        duration: 1600,
        color: 'success',
        position: 'top'
      });
      await toast.present();
    } catch (e) {
      console.error('Error agregando al carrito:', e);
    }
  }

  irACarrito() {
    this.router.navigate(['/dashboard/carrito']);
  }
}
