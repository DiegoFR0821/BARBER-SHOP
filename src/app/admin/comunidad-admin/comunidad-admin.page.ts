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
  private canalRealtime?: RealtimeChannel;

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
    this.hacerScrollAbajo();
  }

  private mapearMensajeVista(m: MensajeComunidad): MensajeAdminVista {
    const fechaObj = m.created_at ? new Date(m.created_at) : new Date();
    const horaFormateada = fechaObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const esMio = Boolean(
      m.autor_rol === 'admin' ||
      (this.usuarioId && m.usuario_id === this.usuarioId) ||
      (m.autor_nombre && m.autor_nombre.includes('Staff'))
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
        autor_rol: 'admin',
        mensaje: texto
      });

      if (!this.mensajes.some(x => x.id === creado.id)) {
        this.mensajes.push(this.mapearMensajeVista(creado));
      }
      this.hacerScrollAbajo();
    } catch (e) {
      console.warn('Mensaje admin registrado localmente:', e);
      const horaActual = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      this.mensajes.push({
        id: 'local-' + Date.now(),
        usuario: this.nombreActual,
        rol: 'admin',
        texto,
        hora: horaActual,
        esMio: true
      });
      this.hacerScrollAbajo();
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
