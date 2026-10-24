import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, 
  IonMenuButton, IonButton, IonIcon, IonFooter, IonItem, IonInput, IonAvatar 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { send, peopleOutline, shieldCheckmarkOutline, trashOutline } from 'ionicons/icons';
import { RealtimeChannel } from '@supabase/supabase-js';
import { UsuarioService } from '../../services/usuario';
import { SupabaseService, MensajeComunidad } from '../../core/services/supabase.service';

interface MensajeAdminVista {
  id: string;
  usuario: string;
  rol: string;
  texto: string;
  hora: string;
  esMio: boolean;
}

@Component({
  selector: 'app-comunidad-admin',
  templateUrl: './comunidad-admin.page.html',
  styleUrls: ['./comunidad-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonToolbar, IonTitle, 
    IonButtons, IonMenuButton, IonButton, IonIcon, IonFooter, IonItem, IonInput, IonAvatar
  ]
})
export class ComunidadAdminPage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;

  usuarioId: string = '';
  nombreActual: string = 'Staff Barber Shop'; 
  mensajeTexto: string = '';
  mensajes: MensajeAdminVista[] = [];
  enviando: boolean = false;
  public chatChannel?: RealtimeChannel;

  constructor(
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService
  ) {
    addIcons({ 
      send, 
      'people-outline': peopleOutline,
      'shield-checkmark-outline': shieldCheckmarkOutline,
      'trash-outline': trashOutline
    });
  }

  async ngOnInit() {
    this.obtenerIdentidadAdmin();
    await this.cargarHistorialComunidad();
    this.iniciarSuscripcionRealtime();
  }

  async ionViewWillEnter() {
    this.obtenerIdentidadAdmin();
    await this.cargarHistorialComunidad();
    this.iniciarSuscripcionRealtime();
  }

  ionViewWillLeave() {
    this.limpiarSuscripcionRealtime();
  }

  ngOnDestroy() {
    this.limpiarSuscripcionRealtime();
  }

  obtenerIdentidadAdmin() {
    const datosMemoria = this.usuarioService.getUsuario();
    const authUser = this.supabaseService.currentUserValue;
    this.usuarioId = datosMemoria?.id || datosMemoria?.uid || authUser?.id || '';
    if (datosMemoria && datosMemoria.nombre) {
      this.nombreActual = `${datosMemoria.nombre.split(' ')[0]} (Staff Barber)`;
    } else {
      this.nombreActual = 'Administrador (Staff Barber)';
    }
  }

  async cargarHistorialComunidad() {
    const lista = await this.supabaseService.getMensajesComunidad();
    this.mensajes = lista.map(m => this.mapearMensajeVista(m));
    this.scrollToBottom();
  }

  private mapearMensajeVista(m: any): MensajeAdminVista {
    const fechaObj = m.created_at ? new Date(m.created_at) : new Date();
    const horaFormateada = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const autorNombre = m.autor_nombre || m.usuario || 'Cliente Barber Shop';
    const autorRol = m.autor_rol || m.rol || 'cliente';
    const textoMensaje = m.mensaje || m.texto || '';
    const esMio = Boolean(
      autorRol === 'admin' ||
      (this.usuarioId && m.usuario_id === this.usuarioId) ||
      (autorNombre && autorNombre.includes('Staff'))
    );

    return {
      id: m.id,
      usuario: autorNombre,
      rol: autorRol,
      texto: textoMensaje,
      hora: horaFormateada,
      esMio
    };
  }

  /**
   * Suscripción WebSocket en tiempo real (Chat Grupal en Vivo) sobre public.mensajes_comunidad
   */
  iniciarSuscripcionRealtime() {
    if (this.chatChannel) {
      this.supabaseService.client.removeChannel(this.chatChannel);
    }

    this.chatChannel = this.supabaseService.client
      .channel('mensajes_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_comunidad' },
        (payload) => {
          const nuevoMensaje = this.mapearMensajeVista(payload.new);
          if (!this.mensajes.some(m => m.id === nuevoMensaje.id)) {
            this.mensajes.push(nuevoMensaje);
            this.scrollToBottom();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mensajes_comunidad' },
        (payload) => {
          const idEliminado = (payload.old as any)?.id;
          if (idEliminado) {
            this.mensajes = this.mensajes.filter(m => m.id !== idEliminado);
          }
        }
      )
      .subscribe();
  }

  private limpiarSuscripcionRealtime() {
    if (this.chatChannel) {
      this.supabaseService.client.removeChannel(this.chatChannel);
      this.chatChannel = undefined;
    }
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
        autor_rol: 'admin',
        mensaje: texto
      });

      const nuevoMensaje = this.mapearMensajeVista(creado);
      if (!this.mensajes.some(m => m.id === nuevoMensaje.id)) {
        this.mensajes.push(nuevoMensaje);
      }
      this.scrollToBottom();
    } catch (e) {
      console.warn('Mensaje admin registrado en sesión activa:', e);
      const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.mensajes.push({
        id: 'local-' + Date.now(),
        usuario: this.nombreActual,
        rol: 'admin',
        texto,
        hora: horaActual,
        esMio: true
      });
      this.scrollToBottom();
    } finally {
      this.enviando = false;
    }
  }

  async eliminarMensaje(msj: MensajeAdminVista) {
    if (!confirm(`¿Eliminar el mensaje de "${msj.usuario}" del muro de la comunidad?`)) return;
    try {
      await this.supabaseService.eliminarMensajeComunidad(msj.id);
      this.mensajes = this.mensajes.filter(x => x.id !== msj.id);
    } catch (e) {
      console.warn('Eliminado de la vista:', e);
      this.mensajes = this.mensajes.filter(x => x.id !== msj.id);
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
  }

  hacerScrollAbajo() {
    this.scrollToBottom();
  }
}
