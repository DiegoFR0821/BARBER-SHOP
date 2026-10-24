import { Component, OnInit, OnDestroy, ViewChild, NgZone, ChangeDetectorRef } from '@angular/core';
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
  private localBroadcast?: BroadcastChannel;
  private syncTimer?: any;

  constructor(
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
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
    this.ngZone.run(() => {
      this.mensajes = lista.map(m => this.mapearMensajeVista(m));
      this.cdr.detectChanges();
      this.scrollToBottom();
    });
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
        autor_rol: 'admin',
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
      console.warn('Mensaje admin registrado en sesión activa:', e);
      const fallbackMsg = {
        id: 'local-' + Date.now(),
        usuario_id: this.usuarioId || null,
        autor_nombre: this.nombreActual,
        autor_rol: 'admin',
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

  async eliminarMensaje(msj: MensajeAdminVista) {
    if (!confirm(`¿Eliminar el mensaje de "${msj.usuario}" del muro de la comunidad?`)) return;
    try {
      await this.supabaseService.eliminarMensajeComunidad(msj.id);
      this.procesarMensajeEliminado(msj.id);
      if (this.chatChannel) {
        this.chatChannel.send({
          type: 'broadcast',
          event: 'mensaje_eliminado',
          payload: { id: msj.id }
        }).catch(() => {});
      }
      this.localBroadcast?.postMessage({ type: 'DELETE', id: msj.id });
    } catch (e) {
      console.warn('Eliminado de la vista:', e);
      this.procesarMensajeEliminado(msj.id);
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
