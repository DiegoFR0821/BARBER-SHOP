import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonGrid, IonRow, IonCol, IonBadge, IonSearchbar
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
    IonSearchbar
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
    this.cargarProductos();
    this.actualizarCantidadCarrito();
  }

  ionViewWillEnter() {
    this.cargarProductos();
    this.actualizarCantidadCarrito();
  }

  cargarProductos() {
    // Catálogo con fotografías 100% masculinas
    this.productos = [
      {
        id: 'p1',
        nombre: 'Cera Mate Fijación Fuerte (100g)',
        categoria: 'Fijación Capilar',
        precio: 45.00,
        stock: 35,
        imagen: 'https://images.unsplash.com/photo-1597854711516-17b5f8507851?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Efecto mate natural sin brillo ni residuos. Ideal para peinados texturizados y pompadours.'
      },
      {
        id: 'p2',
        nombre: 'Aceite Premium para Barba (30ml)',
        categoria: 'Cuidado de Barba',
        precio: 40.00,
        stock: 25,
        imagen: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Formulado con aceite de argán, jojoba y aroma a cedro para hidratar y dar brillo saludable.'
      },
      {
        id: 'p3',
        nombre: 'Pomada Base Agua Brillo Medio (120g)',
        categoria: 'Fijación Capilar',
        precio: 42.00,
        stock: 20,
        imagen: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Fijación flexible de larga duración. Se retira fácilmente con agua en un solo lavado.'
      },
      {
        id: 'p4',
        nombre: 'Shampoo Fortalecedor & Menta (250ml)',
        categoria: 'Cuidado Capilar',
        precio: 48.00,
        stock: 15,
        imagen: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Estimula el folículo piloso, controla el exceso de grasa y proporciona frescura mentolada.'
      },
      {
        id: 'p5',
        nombre: 'Bálsamo After-Shave Calmante (100ml)',
        categoria: 'Cuidado de Barba',
        precio: 35.00,
        stock: 40,
        imagen: 'https://images.unsplash.com/photo-1608248597359-524f2b963351?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Alivia la irritación del afeitado, cierra poros y previene vellos encarnados.'
      }
    ];

    this.filtrarProductos();
  }

  filtrarProductos() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.productosFiltrados = [...this.productos];
    } else {
      this.productosFiltrados = this.productos.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.categoria.toLowerCase().includes(term) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(term))
      );
    }
  }

  actualizarCantidadCarrito() {
    try {
      const guardado = localStorage.getItem('barber_shop_carrito');
      if (guardado) {
        const items = JSON.parse(guardado);
        this.cantidadCarrito = items.reduce((acc: number, item: any) => acc + (item.cantidad || 1), 0);
      } else {
        this.cantidadCarrito = 0;
      }
    } catch {
      this.cantidadCarrito = 0;
    }
  }

  agregarAlCarrito(producto: any) {
    try {
      const guardado = localStorage.getItem('barber_shop_carrito');
      let items = guardado ? JSON.parse(guardado) : [];
      
      const index = items.findIndex((i: any) => i.id === producto.id);
      if (index >= 0) {
        items[index].cantidad = (items[index].cantidad || 1) + 1;
      } else {
        items.push({ ...producto, cantidad: 1 });
      }

      localStorage.setItem('barber_shop_carrito', JSON.stringify(items));
      this.actualizarCantidadCarrito();
      alert(`¡${producto.nombre} agregado al carrito!`);
    } catch (e) {
      console.error('Error agregando al carrito:', e);
    }
  }

  irACarrito() {
    this.router.navigate(['/dashboard/carrito']);
  }
}
