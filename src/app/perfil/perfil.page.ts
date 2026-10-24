import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonButton, IonList, IonItem, IonLabel, 
  IonInput, IonTextarea, IonModal, IonIcon
} from '@ionic/angular/standalone';

import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { addIcons } from 'ionicons';
import { pencilOutline, cameraOutline } from 'ionicons/icons';
import { UsuarioService } from '../services/usuario'; 

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonBackButton, IonButton, IonList, 
    IonItem, IonLabel, IonInput, IonTextarea, IonModal, IonIcon, 
    ImageCropperComponent
  ]
})
export class PerfilPage implements OnInit {

  @ViewChild('fileInput') fileInput!: ElementRef;

  usuarioPerfil = {
    nombre: '',
    correo: '',
    telefono: '',
    bio: '',
    avatarUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg' 
  };

  abrirRecortador: boolean = false;
  imagenOriginalBase64: string = '';
  imagenTemporalRecortada: string = '';
  guardando: boolean = false; 

  constructor(
    private router: Router,
    private usuarioService: UsuarioService
  ) {
    addIcons({
      'pencil-outline': pencilOutline,
      'camera-outline': cameraOutline
    });
  }

  async ngOnInit() {
    const datosMemoria = this.usuarioService.getUsuario();
    
    if (datosMemoria) {
      this.usuarioPerfil.nombre = datosMemoria.nombre || '';
      this.usuarioPerfil.correo = datosMemoria.correo || '';
      
      if (datosMemoria.imagen) {
        this.usuarioPerfil.avatarUrl = datosMemoria.imagen;
      }

      // TODO: Migrar a Supabase en Fase 2 (supabase.from('usuarios').select('*').eq('id', datosMemoria.uid))
    }
  }

  // ==============================================================
  // LÓGICA DE SELECCIÓN DE IMAGEN (PC Y MÓVIL) + NGX-CROPPER
  // ==============================================================
  
  abrirSelectorArchivo() {
    this.fileInput.nativeElement.click(); 
  }

  archivoSeleccionado(event: any) {
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

  fotoRecortadaEfectuada(event: any) {
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

  aplicarRecorteCircular() {
    if (!this.imagenTemporalRecortada) {
      this.imagenTemporalRecortada = this.imagenOriginalBase64;
    }
    
    this.usuarioPerfil.avatarUrl = this.imagenTemporalRecortada;
    this.abrirRecortador = false;
    console.log('¡Foto aplicada correctamente!');
  }

  cancelarRecorte() {
    this.abrirRecortador = false;
    this.imagenOriginalBase64 = '';
    this.imagenTemporalRecortada = '';
  }

  // ==========================================
  // LÓGICA DE GUARDADO
  // ==========================================
  async guardarCambiosPerfil() {
    const datosMemoria = this.usuarioService.getUsuario();
    if (!datosMemoria) {
      alert('Error: No se encontró una sesión activa.');
      return;
    }

    this.guardando = true;

    try {
      // TODO: Migrar a Supabase en Fase 2:
      // Actualizar tabla 'usuarios' con supabase.from('usuarios').update(...)
      // Subir imagen a Supabase Storage bucket 'avatars'

      datosMemoria.nombre = this.usuarioPerfil.nombre;
      if (this.usuarioPerfil.avatarUrl && !this.usuarioPerfil.avatarUrl.includes('avatar.svg')) {
        datosMemoria.imagen = this.usuarioPerfil.avatarUrl;
      }
      this.usuarioService.setUsuario(datosMemoria);

      this.guardando = false;
      this.router.navigate(['/dashboard/resumen']);

    } catch (error) {
      console.error('Error al actualizar el perfil:', error);
      alert('Hubo un error al guardar los cambios de tu perfil.');
      this.guardando = false;
    }
  }
}
