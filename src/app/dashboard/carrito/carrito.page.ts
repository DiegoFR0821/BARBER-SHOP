import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonButton, IonIcon, IonList, IonItem, IonThumbnail, 
  IonInput, IonRadioGroup, IonRow, IonCol
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBackOutline, trashOutline, addOutline, removeOutline, 
  cardOutline, qrCodeOutline, checkmarkCircleOutline, bagHandleOutline 
} from 'ionicons/icons';
import { SupabaseService } from '../../core/services/supabase.service';
import { UsuarioService } from '../../services/usuario';

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.page.html',
  styleUrls: ['./carrito.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, 
    IonTitle, IonButtons, IonButton, IonIcon, IonList, IonItem, 
    IonThumbnail, IonInput, IonRadioGroup, IonRow, IonCol
  ]
})
export class CarritoPage implements OnInit {
  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private usuarioService = inject(UsuarioService);

  vistaActiva: string = 'mi-carrito';
  itemsCarrito: any[] = [];
  totalPagar: number = 0;
  totalPagadoComprobante: number = 0;
  codigoOrden: string = '';

  metodoPago: string = 'yape';
  datosPago = { numeroTarjeta: '', fechaExp: '', cvv: '', celularYape: '' };
  guardando: boolean = false;

  constructor() {
    addIcons({ 
      arrowBackOutline, trashOutline, addOutline, removeOutline, 
      cardOutline, qrCodeOutline, checkmarkCircleOutline, bagHandleOutline 
    });
  }

  ngOnInit() {
    this.cargarCarritoLocal();
  }

  ionViewWillEnter() {
    this.vistaActiva = 'mi-carrito';
    this.cargarCarritoLocal();
  }

  cargarCarritoLocal() {
    try {
      const data = localStorage.getItem('barber_cart') || localStorage.getItem('barber_shop_carrito');
      if (data) {
        this.itemsCarrito = JSON.parse(data);
        this.calcularTotal();
      } else {
        this.itemsCarrito = [];
        this.totalPagar = 0;
      }
    } catch {
      this.itemsCarrito = [];
      this.totalPagar = 0;
    }
  }

  calcularTotal() {
    this.totalPagar = this.itemsCarrito.reduce(
      (sum, item) => sum + (Number(item.precio) * Number(item.cantidad || 1)),
      0
    );
  }

  incrementarCantidad(item: any) {
    if (item.cantidad < item.stock) {
      item.cantidad++;
      this.actualizarMemoria();
    } else {
      alert(`Solo quedan ${item.stock} unidades disponibles en nuestro almacén.`);
    }
  }

  decrementarCantidad(item: any) {
    if (item.cantidad > 1) {
      item.cantidad--;
      this.actualizarMemoria();
    } else {
      this.eliminarDelCarrito(item);
    }
  }

  eliminarDelCarrito(item: any) {
    this.itemsCarrito = this.itemsCarrito.filter(p => p.id !== item.id);
    this.actualizarMemoria();
  }

  actualizarMemoria() {
    const json = JSON.stringify(this.itemsCarrito);
    localStorage.setItem('barber_cart', json);
    localStorage.setItem('barber_shop_carrito', json);
    this.calcularTotal();
  }

  cambiarVista(nuevaVista: string) {
    this.vistaActiva = nuevaVista;
  }

  volverATienda() {
    this.router.navigate(['/dashboard/tienda']);
  }

  /**
   * Procesa el pago e invoca la función RPC transaccional procesar_compra_carrito
   * en PostgreSQL para descontar el stock en tiempo real.
   */
  async finalizarCompraPasarela() {
    if (this.metodoPago === 'tarjeta' && (!this.datosPago.numeroTarjeta || !this.datosPago.cvv)) {
      alert('Por favor, completa los datos de tu tarjeta.');
      return;
    }
    if (this.metodoPago === 'yape' && !this.datosPago.celularYape) {
      alert('Por favor, ingresa el número de celular afiliado a Yape.');
      return;
    }

    this.guardando = true;

    try {
      const usuario = this.usuarioService.getUsuario();
      const clienteId = usuario?.id || usuario?.uid || this.supabaseService.currentUserValue?.id;

      await this.supabaseService.procesarCompraCarrito(
        this.itemsCarrito.map(i => ({ id: i.id, nombre: i.nombre, cantidad: Number(i.cantidad || 1), stock: i.stock })),
        clienteId
      );

      this.totalPagadoComprobante = this.totalPagar;
      this.codigoOrden = 'BS-' + Math.floor(100000 + Math.random() * 900000);

      // Limpiamos el carrito local tras descontar el stock en Supabase
      localStorage.removeItem('barber_cart');
      localStorage.removeItem('barber_shop_carrito');
      this.itemsCarrito = [];
      this.totalPagar = 0;

      this.guardando = false;
      this.cambiarVista('exito');
    } catch (error: any) {
      console.error('❌ Error procesando la compra en Supabase:', error);
      alert(error?.message || 'Hubo un problema al procesar tu compra. Verifica el stock disponible.');
      this.guardando = false;
    }
  }
}
