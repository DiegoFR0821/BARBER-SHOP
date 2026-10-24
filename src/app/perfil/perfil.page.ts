import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonButton, IonIcon, IonList, IonItem, 
  IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, saveOutline, cutOutline, checkmarkCircleOutline, personOutline } from 'ionicons/icons';
import { UsuarioService, UsuarioPerfil, PreferenciasCliente } from '../services/usuario'; 
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, 
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
    IonBackButton, IonButton, IonIcon, IonList, IonItem, 
    IonLabel, IonInput, IonTextarea, IonSelect, IonSelectOption
  ]
})
export class PerfilPage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  guardando: boolean = false;
  avatarError: boolean = false;
  readonly AVATAR_MASULINO_DEFECTO = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80';

  preferencias: PreferenciasCliente = {
    estilo: 'Fade Clásico',
    tipo_cabello: 'Lacio',
    barba: 'Perfilada con Navaja',
    frecuencia: 'Quincenal',
    notas: ''
  };

  usuarioPerfil: UsuarioPerfil = {
    id: '',
    uid: '',
    nombre: '',
    correo: '',
    telefono: '',
    rol: 'cliente',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    imagen: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
    historial_notas: '',
    descripcion: ''
  };

  constructor(
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService,
    private toastCtrl: ToastController
  ) {
    addIcons({ cameraOutline, saveOutline, cutOutline, checkmarkCircleOutline, personOutline });
  }

  async ngOnInit() {
    await this.cargarDatosPerfil();
  }

  async ionViewWillEnter() {
    await this.cargarDatosPerfil();
  }

  /**
   * Recupera los datos del usuario desde memoria local y los sincroniza con
   * la tabla 'public.usuarios' y 'auth.users' en Supabase (incluyendo teléfono de registro).
   */
  async cargarDatosPerfil(): Promise<void> {
    const datosGuardados = this.usuarioService.getUsuario();
    const authUser = this.supabaseService.currentUserValue;
    const metaTelefono = authUser?.user_metadata?.['telefono'] || '';

    if (datosGuardados) {
      const avatarValido = this.validarUrlAvatar(datosGuardados.avatar_url || datosGuardados.imagen);
      this.usuarioPerfil = {
        ...this.usuarioPerfil,
        ...datosGuardados,
        telefono: datosGuardados.telefono || metaTelefono || '',
        avatar_url: avatarValido,
        imagen: avatarValido,
        historial_notas: datosGuardados.historial_notas || datosGuardados.descripcion || ''
      };

      if (datosGuardados.preferencias_corte) {
        this.preferencias = {
          ...this.preferencias,
          ...datosGuardados.preferencias_corte
        };
      }
    }

    const userId = this.usuarioPerfil.id || this.usuarioPerfil.uid || authUser?.id;
    if (userId) {
      try {
        const perfilRemoto = await this.supabaseService.obtenerPerfil(userId);
        if (perfilRemoto) {
          const avatarValido = this.validarUrlAvatar(perfilRemoto.avatar_url || perfilRemoto.imagen || this.usuarioPerfil.avatar_url);
          const telefonoRecuperado = perfilRemoto.telefono || this.usuarioPerfil.telefono || metaTelefono || '';

          this.usuarioPerfil = {
            ...this.usuarioPerfil,
            ...perfilRemoto,
            telefono: telefonoRecuperado,
            avatar_url: avatarValido,
            imagen: avatarValido,
            historial_notas: perfilRemoto.historial_notas || this.usuarioPerfil.historial_notas || ''
          };

          if (perfilRemoto.preferencias_corte) {
            this.preferencias = {
              ...this.preferencias,
              ...perfilRemoto.preferencias_corte
            };
            if (!this.usuarioPerfil.historial_notas && perfilRemoto.preferencias_corte.notas) {
              this.usuarioPerfil.historial_notas = perfilRemoto.preferencias_corte.notas;
            }
          }

          this.avatarError = false;
          this.usuarioService.setUsuario(this.usuarioPerfil);
        }
      } catch (e) {
        console.warn('No se pudo refrescar el perfil desde Supabase:', e);
      }
    }
  }

  private validarUrlAvatar(url?: string): string {
    if (!url || url.trim() === '' || url.includes('ionicframework.com/docs/img/demos/avatar.svg')) {
      return this.AVATAR_MASULINO_DEFECTO;
    }
    return url;
  }

  onAvatarError(): void {
    this.avatarError = true;
    this.usuarioPerfil.avatar_url = this.AVATAR_MASULINO_DEFECTO;
    this.usuarioPerfil.imagen = this.AVATAR_MASULINO_DEFECTO;
  }

  abrirSelectorArchivo(): void {
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
      this.fileInput.nativeElement.click();
    }
  }

  /**
   * Comprime y recorta automáticamente la imagen seleccionada a un cuadrado de máx. 300x300px
   * mediante HTML5 <canvas>, actualiza la vista previa de inmediato y sincroniza avatar_url en Supabase.
   */
  archivoSeleccionado(event: any): void {
    const archivo = event.target?.files?.[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = (e: any) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 300;
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Recorte centrado cuadrado 1:1
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, MAX_SIZE, MAX_SIZE);

          const base64Comprimida = canvas.toDataURL('image/jpeg', 0.82);
          this.avatarError = false;
          this.usuarioPerfil.avatar_url = base64Comprimida;
          this.usuarioPerfil.imagen = base64Comprimida;
          this.usuarioService.setUsuario(this.usuarioPerfil);

          // Persistir inmediatamente la foto en Supabase si el usuario tiene sesión activa
          const userId = this.usuarioPerfil.id || this.usuarioPerfil.uid || this.supabaseService.currentUserValue?.id;
          if (userId) {
            try {
              await this.supabaseService.actualizarPerfil(userId, {
                avatar_url: base64Comprimida
              });
              await this.mostrarToast('📸 Foto de perfil actualizada correctamente.', 'success');
            } catch (err) {
              console.warn('La foto se guardó localmente y se enviará al guardar preferencias:', err);
              await this.mostrarToast('📸 Foto cargada. Presiona "Guardar Preferencias" para confirmar.', 'warning');
            }
          }
        }
      };
      img.src = e.target.result;
    };
    lector.readAsDataURL(archivo);
  }

  /**
   * Guarda todos los cambios del perfil (nombre, teléfono, foto, preferencias_corte e historial_notas)
   * en la tabla public.usuarios de Supabase en una sola llamada.
   */
  async guardarCambiosPerfil(): Promise<void> {
    if (!this.usuarioPerfil.nombre || !this.usuarioPerfil.nombre.trim()) {
      await this.mostrarToast('Por favor, ingresa tu nombre completo.', 'warning');
      return;
    }

    this.guardando = true;
    this.preferencias.notas = this.usuarioPerfil.historial_notas || '';
    this.usuarioPerfil.preferencias_corte = { ...this.preferencias };
    this.usuarioPerfil.descripcion = this.usuarioPerfil.historial_notas;

    const userId = this.usuarioPerfil.id || this.usuarioPerfil.uid || this.supabaseService.currentUserValue?.id;

    try {
      if (userId) {
        const actualizado = await this.supabaseService.actualizarPerfil(userId, {
          nombre: this.usuarioPerfil.nombre.trim(),
          correo: this.usuarioPerfil.correo,
          telefono: (this.usuarioPerfil.telefono || '').trim(),
          avatar_url: this.usuarioPerfil.avatar_url,
          preferencias_corte: this.usuarioPerfil.preferencias_corte,
          historial_notas: this.usuarioPerfil.historial_notas || ''
        });

        if (actualizado) {
          this.usuarioPerfil = {
            ...this.usuarioPerfil,
            ...actualizado
          };
        }
      }

      this.usuarioService.setUsuario(this.usuarioPerfil);
      this.guardando = false;
      await this.mostrarToast('✅ Perfil y ficha técnica de corte guardados en Barber Shop.', 'success');
    } catch (error) {
      this.guardando = false;
      console.error('Error al actualizar perfil en Supabase:', error);
      this.usuarioService.setUsuario(this.usuarioPerfil);
      await this.mostrarToast('Tus preferencias se guardaron en tu sesión.', 'warning');
    }
  }

  private async mostrarToast(mensaje: string, color: 'success' | 'warning' | 'danger' = 'success') {
    const toast = await this.toastCtrl.create({
      message: mensaje,
      duration: 2800,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
