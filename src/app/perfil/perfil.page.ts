import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonButton, IonList, IonItem, IonLabel, 
  IonInput, IonTextarea, IonModal, IonIcon, IonSelect, IonSelectOption 
} from '@ionic/angular/standalone';

import { ImageCropperComponent } from 'ngx-image-cropper';
import { addIcons } from 'ionicons';
import { pencilOutline, cameraOutline } from 'ionicons/icons';
import { UsuarioService, UsuarioPerfil, PreferenciasCliente } from '../services/usuario'; 
import { SupabaseService } from '../core/services/supabase.service';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonBackButton, IonButton, IonList, 
    IonItem, IonLabel, IonInput, IonTextarea, IonModal, IonIcon, 
    IonSelect, IonSelectOption, ImageCropperComponent
  ]
})
export class PerfilPage implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef;

  usuarioPerfil: UsuarioPerfil = {
    id: '',
    nombre: '',
    correo: '',
    telefono: '',
    rol: 'cliente',
    avatar_url: 'https://ionicframework.com/docs/img/demos/avatar.svg',
    historial_notas: ''
  };

  preferencias: PreferenciasCliente = {
    estilo: 'Fade Clásico',
    tipo_cabello: 'Lacio',
    barba: 'Perfilada con Navaja',
    frecuencia: 'Quincenal',
    notas: ''
  };

  abrirRecortador: boolean = false;
  imagenOriginalBase64: string = '';
  imagenTemporalRecortada: string = '';
  guardando: boolean = false; 

  constructor(
    private router: Router,
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService
  ) {
    addIcons({
      'pencil-outline': pencilOutline,
      'camera-outline': cameraOutline
    });
  }

  async ngOnInit(): Promise<void> {
    // 1. Cargar inicialmente desde el servicio en memoria local
    const datosMemoria = this.usuarioService.getUsuario();
    if (datosMemoria) {
      this.cargarDatosEnFormulario(datosMemoria);
    }

    // 2. Sincronizar en tiempo real desde la tabla 'usuarios' de Supabase
    const idUsuario = datosMemoria?.id || datosMemoria?.uid || this.supabaseService.currentUserValue?.id;
    if (idUsuario) {
      try {
        const perfilNube = await this.supabaseService.getPerfil(idUsuario);
        if (perfilNube) {
          this.cargarDatosEnFormulario(perfilNube);
          this.usuarioService.setUsuario(perfilNube);
        }
      } catch (err) {
        console.warn('No se pudo sincronizar perfil desde Supabase:', err);
      }
    }
  }

  private cargarDatosEnFormulario(perfil: UsuarioPerfil): void {
    this.usuarioPerfil = {
      ...this.usuarioPerfil,
      ...perfil,
      id: perfil.id || perfil.uid || this.usuarioPerfil.id,
      avatar_url: perfil.avatar_url || perfil.imagen || this.usuarioPerfil.avatar_url
    };

    if (perfil.preferencias_corte) {
      this.preferencias = {
        estilo: perfil.preferencias_corte.estilo || 'Fade Clásico',
        tipo_cabello: perfil.preferencias_corte.tipo_cabello || 'Lacio',
        barba: perfil.preferencias_corte.barba || 'Perfilada con Navaja',
        frecuencia: perfil.preferencias_corte.frecuencia || 'Quincenal',
        notas: perfil.preferencias_corte.notas || ''
      };
    }

    if (perfil.historial_notas) {
      this.usuarioPerfil.historial_notas = perfil.historial_notas;
    }
  }

  // ==============================================================
  // GESTIÓN DE AVATAR (RECORTE CIRCULAR)
  // ==============================================================
  abrirSelectorArchivo(): void {
    this.fileInput.nativeElement.click(); 
  }

  archivoSeleccionado(event: any): void {
    const archivo = event.target.files[0];
    if (archivo) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenOriginalBase64 = e.target.result;
        this.abrirRecortador = true;
      };
      reader.readAsDataURL(archivo);
    }
    event.target.value = ''; 
  }

  fotoRecortadaEfectuada(event: any): void {
    if (event.base64) {
      this.imagenTemporalRecortada = event.base64;
    } else if (event.blob) {
      const reader = new FileReader();
      reader.readAsDataURL(event.blob);
      reader.onloadend = () => {
        this.imagenTemporalRecortada = reader.result as string;
      };
    }
  }

  aplicarRecorteCircular(): void {
    if (!this.imagenTemporalRecortada) {
      this.imagenTemporalRecortada = this.imagenOriginalBase64;
    }
    
    this.usuarioPerfil.avatar_url = this.imagenTemporalRecortada;
    this.usuarioPerfil.imagen = this.imagenTemporalRecortada;
    this.abrirRecortador = false;
  }

  cancelarRecorte(): void {
    this.abrirRecortador = false;
    this.imagenOriginalBase64 = '';
    this.imagenTemporalRecortada = '';
  }

  // ==============================================================
  // ACTUALIZACIÓN DE PERFIL Y PREFERENCIAS EN SUPABASE
  // ==============================================================
  async guardarCambiosPerfil(): Promise<void> {
    const idUsuario = this.usuarioPerfil.id || this.usuarioPerfil.uid || this.supabaseService.currentUserValue?.id;
    if (!idUsuario) {
      alert('Error: No se encontró una sesión activa de usuario.');
      return;
    }

    this.guardando = true;

    try {
      const datosActualizar: Partial<UsuarioPerfil> = {
        nombre: this.usuarioPerfil.nombre.trim(),
        telefono: (this.usuarioPerfil.telefono || '').trim(),
        avatar_url: this.usuarioPerfil.avatar_url,
        preferencias_corte: this.preferencias,
        historial_notas: (this.usuarioPerfil.historial_notas || '').trim()
      };

      // 1. Guardar en Supabase PostgreSQL (tabla 'usuarios')
      const actualizado = await this.supabaseService.actualizarPerfil(idUsuario, datosActualizar);

      // 2. Actualizar estado reactivo en memoria local
      if (actualizado) {
        this.usuarioService.setUsuario(actualizado);
      } else {
        this.usuarioService.actualizarDatos(datosActualizar);
      }

      this.guardando = false;
      alert('¡Tus preferencias de corte y datos de perfil se guardaron exitosamente!');
      this.router.navigate(['/dashboard/resumen']);

    } catch (error: any) {
      console.error('Error al actualizar perfil en Supabase:', error);
      alert('Surgió un inconveniente al guardar los datos en Supabase.');
      this.guardando = false;
    }
  }
}
