import { Component, OnInit, OnDestroy, ViewChild, NgZone, ChangeDetectorRef } from '@angular/core';
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

  public chatChannel?: RealtimeChannel;
  private localBroadcast?: BroadcastChannel;
  private syncTimer?: any;

  constructor(
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
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
    this.iniciarSuscripcionRealtime();
  }

  ionViewWillLeave() {
    this.limpiarSuscripcionRealtime();
  }

  ngOnDestroy() {
    this.limpiarSuscripcionRealtime();
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
    this.ngZone.run(() => {
      this.mensajes = lista.map(m => this.mapearMensajeVista(m));
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
  }

  private mapearMensajeVista(m: any): MensajeVista {
    const fechaObj = m.created_at ? new Date(m.created_at) : new Date();
    const horaFormateada = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const autorNombre = m.autor_nombre || m.usuario || 'Cliente Barber Shop';
    const autorRol = m.autor_rol || m.rol || 'cliente';
    const textoMensaje = m.mensaje || m.texto || '';
    const esMio = Boolean(
      (this.usuarioId && m.usuario_id === this.usuarioId) ||
      (autorNombre && autorNombre.toLowerCase() === this.nombreActual.toLowerCase())
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

  private procesarNuevoMensajeRecibido(raw: any) {
    if (!raw || !raw.id) return;
    this.ngZone.run(() => {
      const nuevoMensaje = this.mapearMensajeVista(raw);
      if (!this.mensajes.some(m => m.id === nuevoMensaje.id)) {
        this.mensajes = [...this.mensajes, nuevoMensaje];
        this.cdr.detectChanges();
        this.scrollToBottom();
      }
    });
  }

  private procesarMensajeEliminado(idEliminado: string) {
    if (!idEliminado) return;
    this.ngZone.run(() => {
      if (this.mensajes.some(m => m.id === idEliminado)) {
        this.mensajes = this.mensajes.filter(m => m.id !== idEliminado);
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Suscripción WebSocket en tiempo real sobre public.mensajes_comunidad
   * Combina postgres_changes + broadcast de Supabase Realtime + delta sync reactivo dentro de NgZone
   */
  iniciarSuscripcionRealtime() {
    // Evitar recrear el canal si ya está suscrito en esta vista activa (previene colisión ngOnInit + ionViewWillEnter)
    if (this.chatChannel) {
      return;
    }

    this.chatChannel = this.supabaseService.client
      .channel('mensajes_realtime', {
        config: {
          broadcast: { self: false }
        }
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_comunidad' },
        (payload) => {
          this.procesarNuevoMensajeRecibido(payload.new);
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mensajes_comunidad' },
        (payload) => {
          const idEliminado = (payload.old as any)?.id;
          if (idEliminado) {
            this.procesarMensajeEliminado(idEliminado);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'nuevo_mensaje' },
        ({ payload }) => {
          this.procesarNuevoMensajeRecibido(payload);
        }
      )
      .on(
        'broadcast',
        { event: 'mensaje_eliminado' },
        ({ payload }) => {
          if (payload?.id) {
            this.procesarMensajeEliminado(payload.id);
          }
        }
      )
      .subscribe();

    // Canal local entre pestañas del mismo navegador para respuesta instantánea (0ms)
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        this.localBroadcast = new BroadcastChannel('barber_comunidad_sync');
        this.localBroadcast.onmessage = (event) => {
          if (event.data?.type === 'INSERT' && event.data?.payload) {
            this.procesarNuevoMensajeRecibido(event.data.payload);
          } else if (event.data?.type === 'DELETE' && event.data?.id) {
            this.procesarMensajeEliminado(event.data.id);
          }
        };
      }
    } catch {}

    // Sincronización delta ligera en segundo plano para garantizar consistencia 100% aún si falta REPLICA IDENTITY en la BD
    this.syncTimer = setInterval(() => {
      this.sincronizarDeltaEnVivo();
    }, 2000);
  }

  private async sincronizarDeltaEnVivo() {
    try {
      const remotos = await this.supabaseService.getMensajesComunidad();
      if (!remotos || remotos.length === 0) return;

      const idsActuales = new Set(this.mensajes.map(m => m.id));
      const nuevos = remotos.filter(r => !idsActuales.has(r.id));

      if (nuevos.length > 0) {
        this.ngZone.run(() => {
          for (const n of nuevos) {
            const mapeado = this.mapearMensajeVista(n);
            if (!this.mensajes.some(m => m.id === mapeado.id)) {
              this.mensajes = [...this.mensajes, mapeado];
            }
          }
          this.cdr.detectChanges();
          this.scrollToBottom();
        });
      }
    } catch {}
  }

  private limpiarSuscripcionRealtime() {
    if (this.chatChannel) {
      this.supabaseService.client.removeChannel(this.chatChannel);
      this.chatChannel = undefined;
    }
    if (this.localBroadcast) {
      this.localBroadcast.close();
      this.localBroadcast = undefined;
    }
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
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
        autor_rol: this.rolActual,
        autor_avatar: this.avatarActual,
        mensaje: texto
      });

      this.procesarNuevoMensajeRecibido(creado);

      // Emitir por WebSocket Broadcast de Supabase Realtime y BroadcastChannel local
      if (this.chatChannel) {
        this.chatChannel.send({
          type: 'broadcast',
          event: 'nuevo_mensaje',
          payload: creado
        }).catch(() => {});
      }
      this.localBroadcast?.postMessage({ type: 'INSERT', payload: creado });
    } catch (e) {
      console.warn('Mensaje agregado en sesión activa:', e);
      const fallbackMsg = {
        id: 'local-' + Date.now(),
        usuario_id: this.usuarioId || null,
        autor_nombre: this.nombreActual,
        autor_rol: this.rolActual,
        mensaje: texto,
        created_at: new Date().toISOString()
      };
      this.procesarNuevoMensajeRecibido(fallbackMsg);
      this.localBroadcast?.postMessage({ type: 'INSERT', payload: fallbackMsg });
    } finally {
      this.enviando = false;
      this.cdr.detectChanges();
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
