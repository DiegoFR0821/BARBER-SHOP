import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonFooter, IonItem, IonInput, IonMenuButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, shieldCheckmarkOutline } from 'ionicons/icons';
import { io, Socket } from 'socket.io-client';
import { Auth } from '@angular/fire/auth'; // Usamos Auth para el admin

interface Mensaje {
  usuario: string;
  texto: string;
  hora: string;
  esMio?: boolean;
}

@Component({
  selector: 'app-comunidad-admin',
  templateUrl: './comunidad-admin.page.html',
  styleUrls: ['./comunidad-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonButton, IonIcon, IonFooter, IonItem, IonInput, IonMenuButton
  ]
})
export class ComunidadAdminPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  private auth = inject(Auth);
  
  // ⚠️ Debe ser el MISMO puerto que usa el cliente
  private URL_SERVIDOR = 'http://localhost:3000'; 
  private socket!: Socket;

  nombreAdmin: string = '👑 Administrador'; // Identificador especial
  mensajeTexto: string = '';
  mensajes: Mensaje[] = [];

  constructor() {
    addIcons({ send, 'shield-checkmark-outline': shieldCheckmarkOutline });
  }

  ngOnInit() {
    this.obtenerDatosAdmin();
    this.conectarSocket();
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  obtenerDatosAdmin() {
    this.auth.onAuthStateChanged((user) => {
      if (user) {
        // Le añadimos la corona para que destaque en el chat
        const nombreBase = user.displayName || user.email?.split('@')[0] || 'Admin';
        this.nombreAdmin = `👑 ${nombreBase} (Staff)`;
      }
    });
  }

  conectarSocket() {
    this.socket = io(this.URL_SERVIDOR);

    this.socket.on('recibir_mensaje', (data: Mensaje) => {
      const esMio = data.usuario === this.nombreAdmin;
      this.mensajes.push({ ...data, esMio });
      this.hacerScrollAbajo();
    });
  }

  enviarMensaje() {
    if (!this.mensajeTexto.trim()) return;

    const ahora = new Date();
    const horaFormateada = ahora.getHours() + ':' + (ahora.getMinutes() < 10 ? '0' : '') + ahora.getMinutes();

    const nuevoMensaje: Mensaje = {
      usuario: this.nombreAdmin,
      texto: this.mensajeTexto,
      hora: horaFormateada
    };

    this.socket.emit('nuevo_mensaje', nuevoMensaje);
    this.mensajeTexto = '';
  }

  hacerScrollAbajo() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }
}