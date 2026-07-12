import { Component, OnInit, OnDestroy, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonFooter, IonItem, IonInput, IonAvatar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, peopleOutline } from 'ionicons/icons';
import { io, Socket } from 'socket.io-client';
import { UsuarioService } from '../../services/usuario';

interface Mensaje {
  usuario: string;
  texto: string;
  hora: string;
  esMio?: boolean;
}

@Component({
  selector: 'app-comunidad',
  templateUrl: './comunidad.page.html',
  styleUrls: ['./comunidad.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonFooter, IonItem, IonInput, IonAvatar]
})
export class ComunidadPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  private usuarioService = inject(UsuarioService);
  
  // ⚠️ Asegúrate de que esta URL coincida con el puerto de tu servidor Node.js
  private URL_SERVIDOR = 'http://localhost:3000'; 
  private socket!: Socket;

  nombreUsuario: string = 'Usuario Anónimo';
  mensajeTexto: string = '';
  mensajes: Mensaje[] = [];

  constructor() {
    addIcons({ send, peopleOutline });
  }

  ngOnInit() {
    this.obtenerUsuario();
    this.conectarSocket();
  }

  ngOnDestroy() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  obtenerUsuario() {
    const datosMemoria = this.usuarioService.getUsuario();
    if (datosMemoria && datosMemoria.nombre) {
      this.nombreUsuario = datosMemoria.nombre.split(' ')[0];
    }
  }

  conectarSocket() {
    this.socket = io(this.URL_SERVIDOR);

    // Escuchar mensajes entrantes desde el servidor
    this.socket.on('recibir_mensaje', (data: Mensaje) => {
      // Determinamos si el mensaje lo envié yo u otra persona basándonos en el nombre (en un proyecto real se usa el ID)
      const esMio = data.usuario === this.nombreUsuario;
      this.mensajes.push({ ...data, esMio });
      this.hacerScrollAbajo();
    });
  }

  enviarMensaje() {
    if (!this.mensajeTexto.trim()) return;

    const ahora = new Date();
    const horaFormateada = ahora.getHours() + ':' + (ahora.getMinutes() < 10 ? '0' : '') + ahora.getMinutes();

    const nuevoMensaje: Mensaje = {
      usuario: this.nombreUsuario,
      texto: this.mensajeTexto,
      hora: horaFormateada
    };

    // Emitimos el mensaje al servidor Node.js
    this.socket.emit('nuevo_mensaje', nuevoMensaje);
    
    // Limpiamos el input
    this.mensajeTexto = '';
  }

  // Utilidad para que el chat siempre baje automáticamente cuando llega un mensaje
  hacerScrollAbajo() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }
}