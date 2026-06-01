import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonButton, IonIcon, IonBadge, IonSearchbar, IonSegment, 
  IonSegmentButton, IonLabel, IonGrid, IonRow, IonCol, IonCard
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cartOutline, addCircleOutline, searchOutline, heartOutline } from 'ionicons/icons';

// Definimos la estructura profesional del producto
interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  imagen: string;
}

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonButton, IonIcon, IonBadge, 
    IonSearchbar, IonSegment, IonSegmentButton, IonLabel, 
    IonGrid, IonRow, IonCol, IonCard
  ]
})
export class TiendaPage implements OnInit {

  // Productos simulados que luego creará el Administrador
  productosBackend: Producto[] = [
    { id: 'p1', nombre: 'Champú Reparador Oro', descripcion: 'Con extracto de argán y keratina.', precio: 45.00, categoria: 'cabello', imagen: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=500&auto=format&fit=crop' },
    { id: 'p2', nombre: 'Sérum Iluminador', descripcion: 'Vitamina C y Colágeno para el rostro.', precio: 68.00, categoria: 'cuidado', imagen: 'https://images.unsplash.com/photo-1608248593801-52b57b605151?q=80&w=500&auto=format&fit=crop' },
    { id: 'p3', nombre: 'Mascarilla Hidratante', descripcion: 'Restauración profunda 24 hrs.', precio: 55.00, categoria: 'cabello', imagen: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=500&auto=format&fit=crop' },
    { id: 'p4', nombre: 'Kit Esmaltes Gel', descripcion: 'Tonos neutros y dorados.', precio: 30.00, categoria: 'unas', imagen: 'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=500&auto=format&fit=crop' }
  ];

  // Variables para la vista
  productosMostrados: Producto[] = [];
  categoriaSeleccionada: string = 'todos';
  cantidadCarrito: number = 0;
  textoBusqueda: string = '';

  constructor(private router: Router) {
    addIcons({
      'cart-outline': cartOutline,
      'add-circle-outline': addCircleOutline,
      'search-outline': searchOutline,
      'heart-outline': heartOutline
    });
  }

  ngOnInit() {
    // Inicialmente mostramos todos los productos
    this.productosMostrados = [...this.productosBackend];
  }

  // Lógica para filtrar al tocar los botones superiores
  filtrarCategoria(event: any) {
    this.categoriaSeleccionada = event.detail.value;
    this.aplicarFiltros();
  }

  // Lógica para la barra de búsqueda
  buscarProducto(event: any) {
    this.textoBusqueda = event.target.value.toLowerCase();
    this.aplicarFiltros();
  }

  // Función maestra de filtrado (Categoría + Búsqueda)
  aplicarFiltros() {
    let filtrados = this.productosBackend;

    if (this.categoriaSeleccionada !== 'todos') {
      filtrados = filtrados.filter(p => p.categoria === this.categoriaSeleccionada);
    }

    if (this.textoBusqueda.trim() !== '') {
      filtrados = filtrados.filter(p => p.nombre.toLowerCase().includes(this.textoBusqueda));
    }

    this.productosMostrados = filtrados;
  }

  // Simulación de agregar al carrito
  agregarAlCarrito(producto: Producto) {
    this.cantidadCarrito++;
    console.log('Agregado:', producto.nombre);
    // Aquí luego integraremos un Servicio Global de Angular para guardar el estado del carrito
  }

  irAlCarrito() {
    this.router.navigate(['/carrito']); // 👈 Le quitamos el /dashboard/
  }
}