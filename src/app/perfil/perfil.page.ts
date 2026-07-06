import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonButton, IonList, IonItem, IonLabel, 
  IonInput, IonTextarea, IonModal, IonIcon
} from '@ionic/angular/standalone';

import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { addIcons } from 'ionicons';
import { pencilOutline, cameraOutline } from 'ionicons/icons';

// Importaciones para Firebase y nuestro Servicio de Memoria
import { Firestore, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { UsuarioService } from '../services/usuario'; // 👈 Ruta ajustada (sube dos niveles)

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

  // Variables para la interfaz y base de datos
  usuarioPerfil = {
    nombre: '',
    correo: '',
    telefono: '',
    bio: '',
    avatarUrl: 'https://ionicframework.com/docs/img/demos/avatar.svg' // Avatar por defecto
  };

  abrirRecortador: boolean = false;
  imagenOriginalBase64: string = '';
  imagenTemporalRecortada: string = '';
  guardando: boolean = false; // Bloquea el botón mientras guarda en Firebase

  constructor(
    private router: Router,
    private firestore: Firestore,
    private usuarioService: UsuarioService
  ) {
    addIcons({
      'pencil-outline': pencilOutline,
      'camera-outline': cameraOutline
    });
  }

  async ngOnInit() {
    // 1. Cargar datos básicos y rápidos desde el localStorage (vía UsuarioService)
    const datosMemoria = this.usuarioService.getUsuario();
    
    if (datosMemoria) {
      this.usuarioPerfil.nombre = datosMemoria.nombre || '';
      this.usuarioPerfil.correo = datosMemoria.correo || '';
      // Si el servicio ya guardaba una imagen en caché, la mostramos al instante
      if (datosMemoria.imagen) {
        this.usuarioPerfil.avatarUrl = datosMemoria.imagen;
      }

      // 2. Traer datos adicionales (teléfono, bio) directamente desde Firebase
      try {
        const referenciaDocumento = doc(this.firestore, `usuarios/${datosMemoria.uid}`);
        const documentoConsumido = await getDoc(referenciaDocumento);

        if (documentoConsumido.exists()) {
          const datosCompletos = documentoConsumido.data();
          
          if (datosCompletos['telefono']) {
            this.usuarioPerfil.telefono = datosCompletos['telefono'];
          }
          if (datosCompletos['bio']) {
            this.usuarioPerfil.bio = datosCompletos['bio'];
          }
          // Si Firebase tiene una imagen más actual que la memoria, la usamos
          if (datosCompletos['imagen']) {
            this.usuarioPerfil.avatarUrl = datosCompletos['imagen'];
          }
        }
      } catch (error) {
        console.error('Error al descargar datos extra del perfil desde Firestore:', error);
      }
    }
  }

  // ==========================================
  // LÓGICA DE CAPACITOR CAMERA + NGX-CROPPER
  // ==========================================
  async obtenerImagen() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false, // Usamos el cropper personalizado en su lugar
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt, 
        promptLabelHeader: 'Cambiar foto de perfil',
        promptLabelPhoto: 'Seleccionar desde Galería',
        promptLabelPicture: 'Tomar una Foto'
      });

      if (image && image.base64String) {
        this.imagenOriginalBase64 = `data:image/jpeg;base64,${image.base64String}`;
        this.abrirRecortador = true;
      }
    } catch (error) {
      console.log('El usuario canceló la selección de imagen o hubo un error.', error);
    }
  }

  fotoRecortadaEfectuada(event: ImageCroppedEvent) {
    // Cuando el usuario mueve el cuadro de recorte, guardamos el resultado
    if (event && event.base64) {
      this.imagenTemporalRecortada = event.base64;
    }
  }

  aplicarRecorteCircular() {
    if (this.imagenTemporalRecortada) {
      this.usuarioPerfil.avatarUrl = this.imagenTemporalRecortada;
      this.abrirRecortador = false;
      console.log('Imagen recortada exitosamente. Lista para guardar.');
    }
  }

  cancelarRecorte() {
    this.abrirRecortador = false;
    this.imagenOriginalBase64 = '';
    this.imagenTemporalRecortada = '';
  }

  // ==========================================
  // LÓGICA DE GUARDADO (FIREBASE + LOCALSTORAGE)
  // ==========================================
  async guardarCambiosPerfil() {
    const datosMemoria = this.usuarioService.getUsuario();
    if (!datosMemoria) {
      alert('Error: No se encontró una sesión activa.');
      return;
    }

    this.guardando = true;

    try {
      // 1. Apuntamos al documento en Firebase
      const referenciaDocumento = doc(this.firestore, `usuarios/${datosMemoria.uid}`);
      
      // 2. Construimos el paquete de actualización
      const datosActualizar: any = {
        nombre: this.usuarioPerfil.nombre,
        telefono: this.usuarioPerfil.telefono,
        bio: this.usuarioPerfil.bio
      };

      // Si la URL del avatar cambió (es decir, ya no es el SVG por defecto), la enviamos a Firebase
      if (this.usuarioPerfil.avatarUrl && !this.usuarioPerfil.avatarUrl.includes('avatar.svg')) {
        datosActualizar.imagen = this.usuarioPerfil.avatarUrl;
      }

      // 3. Enviamos a Firebase
      await updateDoc(referenciaDocumento, datosActualizar);

      // 4. Sincronizamos la memoria local (UsuarioService) para que el Dashboard vea los cambios
      datosMemoria.nombre = this.usuarioPerfil.nombre;
      if (datosActualizar.imagen) {
        datosMemoria.imagen = datosActualizar.imagen;
      }
      this.usuarioService.setUsuario(datosMemoria);

      this.guardando = false;
      
      // 5. Regresamos al dashboard para que el usuario vea su nueva foto y nombre
      this.router.navigate(['/dashboard/resumen']);

    } catch (error) {
      console.error('Error al actualizar el perfil en Firestore:', error);
      alert('Hubo un error al guardar los cambios de tu perfil.');
      this.guardando = false;
    }
  }
}