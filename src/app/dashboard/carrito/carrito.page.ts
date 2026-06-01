import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonButton, IonIcon, IonList, IonItem, 
  IonLabel, IonRadioGroup, IonRadio, IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline, addOutline, removeOutline, cardOutline, phonePortraitOutline, checkmarkCircle } from 'ionicons/icons';

interface ProductoCarrito {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagen: string;
}

@Component({
  selector: 'app-carrito',
  templateUrl: './carrito.page.html',
  styleUrls: ['./carrito.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonBackButton, IonButton, IonIcon, 
    IonList, IonItem, IonLabel, IonRadioGroup, IonRadio, IonFooter,
    RouterModule // 👈 ¡Añade esto aquí para que reconozca el botón!
  ]
})
export class CarritoPage implements OnInit {

  // Simulamos productos que el cliente seleccionó en la vista anterior
  itemsCarrito: ProductoCarrito[] = [
    { id: 'p1', nombre: 'Champú Reparador Oro', precio: 45.00, cantidad: 1, imagen: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=500&auto=format&fit=crop' },
    { id: 'p2', nombre: 'Mascarilla Hidratante', precio: 55.00, cantidad: 2, imagen: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?q=80&w=500&auto=format&fit=crop' }
  ];

  metodoPagoSeleccionado: string = 'tarjeta';

  constructor(private router: Router) {
    addIcons({
      'trash-outline': trashOutline,
      'add-outline': addOutline,
      'remove-outline': removeOutline,
      'card-outline': cardOutline,
      'phone-portrait-outline': phonePortraitOutline,
      'checkmark-circle': checkmarkCircle
    });
  }

  ngOnInit() {}

  aumentarCantidad(item: ProductoCarrito) {
    item.cantidad++;
  }

  disminuirCantidad(item: ProductoCarrito) {
    if (item.cantidad > 1) {
      item.cantidad--;
    }
  }

  eliminarItem(id: string) {
    this.itemsCarrito = this.itemsCarrito.filter(item => item.id !== id);
  }

  // Cálculos matemáticos del carrito
  get subtotal() {
    return this.itemsCarrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  }

  get impuestos() {
    return this.subtotal * 0.18; // Calculando 18% de IGV
  }

  get total() {
    return this.subtotal + this.impuestos;
  }

  procesarPago() {
    console.log('Procesando pago en base de datos...');
    console.log('Método:', this.metodoPagoSeleccionado);
    console.log('Total a cobrar:', this.total);
    // Aquí a futuro implementaremos la conexión real con la pasarela y actualizaremos Firestore
    alert('¡Pago simulado con éxito! Tu pedido está confirmado.');
    this.router.navigate(['/dashboard/resumen']);
  }
}