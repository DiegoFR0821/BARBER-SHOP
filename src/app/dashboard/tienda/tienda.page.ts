import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonGrid, IonRow, IonCol, IonBadge, IonSearchbar, IonMenuButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cartOutline, imageOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonButton, IonIcon, IonGrid, IonRow, IonCol, IonBadge, 
    IonSearchbar, IonMenuButton
  ]
})
export class TiendaPage implements OnInit {
  private router = inject(Router);

  productos: any[] = [];
  productosFiltrados: any[] = [];
  searchTerm: string = '';
  cantidadCarrito: number = 0;

  constructor() {
    addIcons({ cartOutline, imageOutline });
  }

  ngOnInit() {
    this.cargarProductosInventario();
  }

  ionViewWillEnter() {
    this.cargarProductosInventario();
    this.actualizarBadgeCarrito();
  }

  async cargarProductosInventario() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('productos').select('*'))
    try {
      this.productos = [];
      this.filtrarProductos();
    } catch (error) {
      console.error('Error cargando catálogo:', error);
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

  agregarAlCarrito(prod: any) {
    if (prod.stock <= 0) return;

    let itemsCarrito = [];
    const cached = localStorage.getItem('barber_cart');
    if (cached) itemsCarrito = JSON.parse(cached);

    const itemExistente = itemsCarrito.find((item: any) => item.id === prod.id);

    if (itemExistente) {
      if (itemExistente.cantidad >= prod.stock) {
        alert(`Límite de stock alcanzado. Quedan ${prod.stock} unidades.`);
        return;
      }
      itemExistente.cantidad++;
    } else {
      itemsCarrito.push({
        id: prod.id,
        nombre: prod.nombre,
        precio: prod.precio,
        imagen: prod.imagen,
        cantidad: 1,
        stockMaximo: prod.stock
      });
    }

    localStorage.setItem('barber_cart', JSON.stringify(itemsCarrito));
    this.actualizarBadgeCarrito();
  }

  actualizarBadgeCarrito() {
    const cached = localStorage.getItem('barber_cart');
    if (cached) {
      const items = JSON.parse(cached);
      this.cantidadCarrito = items.reduce((acc: number, item: any) => acc + item.cantidad, 0);
    } else {
      this.cantidadCarrito = 0;
    }
  }

  irACarrito() {
    this.router.navigate(['/carrito']);
  }
}
