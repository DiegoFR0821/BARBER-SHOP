import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonItem, IonLabel, IonList, IonThumbnail, IonCard, IonCardContent, 
  IonInput, IonRadio, IonRadioGroup, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  trashOutline, addOutline, removeOutline, cashOutline, arrowBackOutline, 
  checkmarkCircleOutline, cardOutline, qrCodeOutline, bagHandleOutline
} from 'ionicons/icons';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.page.html',
  styleUrls: ['./carrito.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonButton, IonIcon, IonItem, IonLabel, IonList, IonThumbnail, 
    IonCard, IonCardContent, IonInput, IonRadio, IonRadioGroup, IonRow, IonCol
  ]
})
export class CarritoPage implements OnInit {
  private firestore = inject(Firestore);
  private router = inject(Router);

  // Estados: 'mi-carrito' | 'pasarela' | 'exito'
  vistaActiva: string = 'mi-carrito'; 
  metodoPago: string = 'yape';      
  
  datosPago = { celularYape: '', numeroTarjeta: '', nombreTarjeta: '', fechaExp: '', cvv: '' };

  itemsCarrito: any[] = [];
  totalPagar: number = 0;
  guardando: boolean = false;

  constructor() {
    addIcons({ trashOutline, addOutline, removeOutline, cashOutline, arrowBackOutline, checkmarkCircleOutline, cardOutline, qrCodeOutline, bagHandleOutline });
  }

  ngOnInit() { this.recuperarCarritoDeMemoria(); }
  ionViewWillEnter() { this.recuperarCarritoDeMemoria(); this.vistaActiva = 'mi-carrito'; }

  recuperarCarritoDeMemoria() {
    const cached = localStorage.getItem('etnica_cart');
    if (cached) {
      this.itemsCarrito = JSON.parse(cached);
      this.calcularTotal();
    }
  }

  guardarCarritoEnMemoria() {
    localStorage.setItem('etnica_cart', JSON.stringify(this.itemsCarrito));
    this.calcularTotal();
  }

  incrementarCantidad(item: any) {
    if (item.cantidad >= item.stockMaximo) {
      alert(`Límite alcanzado. Solo hay ${item.stockMaximo} unidades disponibles.`);
      return;
    }
    item.cantidad++;
    this.guardarCarritoEnMemoria();
  }

  decrementarCantidad(item: any) {
    if (item.cantidad > 1) {
      item.cantidad--;
    } else {
      this.eliminarDelCarrito(item);
      return;
    }
    this.guardarCarritoEnMemoria();
  }

  eliminarDelCarrito(item: any) {
    this.itemsCarrito = this.itemsCarrito.filter(i => i.id !== item.id);
    this.guardarCarritoEnMemoria();
  }

  calcularTotal() {
    this.totalPagar = this.itemsCarrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  }

  cambiarVista(nuevaVista: string) {
    this.vistaActiva = nuevaVista;
  }

  // ⚡ RF-10: TRANSACCIÓN EN FIREBASE SIN ALERTS DE ÉXITO
  async finalizarCompraPasarela() {
    if (this.metodoPago === 'yape' && !this.datosPago.celularYape) return;
    if (this.metodoPago === 'tarjeta' && (!this.datosPago.numeroTarjeta || !this.datosPago.cvv)) return;

    this.guardando = true;

    try {
      // 1. Restamos las cantidades de Firestore
      for (const item of this.itemsCarrito) {
        const nuevoStock = Math.max(0, item.stockMaximo - item.cantidad);
        const docRef = doc(this.firestore, `productos/${item.id}`);
        await updateDoc(docRef, { stock: nuevoStock });
      }

      // 2. Limpiamos carrito
      this.itemsCarrito = [];
      localStorage.removeItem('etnica_cart');
      
      this.guardando = false;
      // 3. 🎯 Activamos pantalla nativa de éxito en vez de usar "alert()"
      this.cambiarVista('exito');

    } catch (error) {
      console.error('Error procesando compra:', error);
      this.guardando = false;
      alert('Surgió un inconveniente en la pasarela.'); // Única alerta solo en caso de error crítico
    }
  }

  volverATienda() {
    this.datosPago = { celularYape: '', numeroTarjeta: '', nombreTarjeta: '', fechaExp: '', cvv: '' };
    this.router.navigate(['/dashboard/tienda']);
  }
}