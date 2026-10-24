import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonIcon, IonFooter, IonItem, IonInput, IonMenuButton 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, shieldCheckmarkOutline } from 'ionicons/icons';
import { io, Socket } from 'socket.io-client';
import { SupabaseService } from '../../core/services/supabase.service';
import { UsuarioService } from '../../services/usuario';

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
  
  private URL_SERVIDOR = 'http://localhost:3000'; 
  private socket!: Socket;

  nombreAdmin: string = '👑 Administrador Barber';
  mensajeTexto: string = '';
  mensajes: Mensaje[] = [];

  constructor(
    private supabaseService: SupabaseService,
    private usuarioService: UsuarioService
  ) {
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

  async obtenerDatosAdmin(): Promise<void> {
    const memUser = this.usuarioService.getUsuario();
    if (memUser && memUser.nombre) {
      this.nombreAdmin = `👑 ${memUser.nombre} (Staff Barber)`;
      return;
    }

    const authUser = this.supabaseService.currentUserValue;
    if (authUser) {
      const perfil = await this.supabaseService.getPerfil(authUser.id);
      const nombreBase = perfil?.nombre || authUser.email?.split('@')[0] || 'Admin';
      this.nombreAdmin = `👑 ${nombreBase} (Staff Barber)`;
    }
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
