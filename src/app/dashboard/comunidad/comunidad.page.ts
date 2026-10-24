import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButton, 
  IonIcon, IonFooter, IonItem, IonInput 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, peopleOutline } from 'ionicons/icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import { UsuarioService } from '../../services/usuario';
import { SupabaseService, MensajeComunidad } from '../../core/services/supabase.service';

interface MensajeVista {
  id: string;
  usuario: string;
  rol: string;
  texto: string;
  hora: string;
  esMio: boolean;
}

@Component({
  selector: 'app-comunidad',
  templateUrl: './comunidad.page.html',
  styleUrls: ['./comunidad.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButton, IonIcon, IonFooter, IonItem, IonInput
  ]
})
export class ComunidadPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  usuarioId: string = '';
  nombreActual: string = 'Cliente Barber Shop';
  rolActual: string = 'cliente';
  avatarActual: string = '';

  mensajeTexto: string = '';
  mensajes: MensajeVista[] = [];
  enviando: boolean = false;
  private canalRealtime?: RealtimeChannel;

  constructor(
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService
  ) {
    addIcons({ send, 'people-outline': peopleOutline });
  }

  async ngOnInit() {
    this.obtenerNombreUsuario();
    await this.cargarHistorialComunidad();
    this.iniciarSuscripcionRealtime();
  }

  async ionViewWillEnter() {
    this.obtenerNombreUsuario();
    await this.cargarHistorialComunidad();
  }

  obtenerNombreUsuario() {
    const datosMemoria = this.usuarioService.getUsuario();
    const authUser = this.supabaseService.currentUserValue;

    this.usuarioId = datosMemoria?.id || datosMemoria?.uid || authUser?.id || '';
    if (datosMemoria && datosMemoria.nombre) {
      this.nombreActual = datosMemoria.nombre;
      this.rolActual = datosMemoria.rol || 'cliente';
      this.avatarActual = datosMemoria.avatar_url || datosMemoria.imagen || '';
    } else if (authUser?.email) {
      this.nombreActual = authUser.user_metadata?.['nombre'] || authUser.email.split('@')[0];
    }
  }

  async cargarHistorialComunidad() {
    const lista = await this.supabaseService.getMensajesComunidad();
    this.mensajes = lista.map(m => this.mapearMensajeVista(m));
    this.hacerScrollAbajo();
  }

  private mapearMensajeVista(m: MensajeComunidad): MensajeVista {
    const fechaObj = m.created_at ? new Date(m.created_at) : new Date();
    const horaFormateada = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const esMio = Boolean(
      (this.usuarioId && m.usuario_id === this.usuarioId) ||
      (m.autor_nombre && m.autor_nombre.toLowerCase() === this.nombreActual.toLowerCase())
    );

    return {
      id: m.id,
      usuario: m.autor_nombre || 'Cliente Barber Shop',
      rol: m.autor_rol || 'cliente',
      texto: m.mensaje,
      hora: horaFormateada,
      esMio
    };
  }

  iniciarSuscripcionRealtime() {
    this.canalRealtime = this.supabaseService.suscribirMensajesComunidad(
      (nuevo) => {
        if (!this.mensajes.some(x => x.id === nuevo.id)) {
          this.mensajes.push(this.mapearMensajeVista(nuevo));
          this.hacerScrollAbajo();
        }
      },
      (idEliminado) => {
        this.mensajes = this.mensajes.filter(x => x.id !== idEliminado);
      }
    );
  }

  async enviarMensaje() {
    const texto = this.mensajeTexto.trim();
    if (!texto || this.enviando) return;

    this.enviando = true;
    this.mensajeTexto = '';

    try {
      const creado = await this.supabaseService.enviarMensajeComunidad({
        usuario_id: this.usuarioId || null,
        autor_nombre: this.nombreActual,
        autor_rol: this.rolActual,
        autor_avatar: this.avatarActual,
        mensaje: texto
      });

      if (!this.mensajes.some(x => x.id === creado.id)) {
        this.mensajes.push(this.mapearMensajeVista(creado));
      }
      this.hacerScrollAbajo();
    } catch (e) {
      console.warn('Mensaje agregado en memoria local:', e);
      const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.mensajes.push({
        id: 'local-' + Date.now(),
        usuario: this.nombreActual,
        rol: this.rolActual,
        texto,
        hora: horaActual,
        esMio: true
      });
      this.hacerScrollAbajo();
    } finally {
      this.enviando = false;
    }
  }

  hacerScrollAbajo() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  ngOnDestroy() {
    if (this.canalRealtime) {
      this.supabaseService.client.removeChannel(this.canalRealtime);
    }
  }
}
