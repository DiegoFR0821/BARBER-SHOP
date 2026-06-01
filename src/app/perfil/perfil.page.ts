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

// 👈 1. NUEVAS IMPORTACIONES: Firebase y nuestro Servicio de Memoria
import { Firestore, doc, updateDoc, getDoc } from '@angular/fire/firestore';
import { UsuarioService } from '../services/usuario'; // Verifica que la ruta coincida con tu proyecto

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

  // Iniciamos las variables vacías para que se llenen dinámicamente con la base de datos
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
  guardando: boolean = false; // 👈 2. Variable para bloquear el botón mientras carga

  // 👈 3. Inyectamos Firestore y el UsuarioService en el constructor
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
    // 1. Primero cargamos lo básico de la RAM (es instantáneo)
    const datosMemoria = this.usuarioService.getUsuario();
    
    if (datosMemoria) {
      this.usuarioPerfil.nombre = datosMemoria.nombre;
      this.usuarioPerfil.correo = datosMemoria.correo;

      // 2. Vamos a Firestore a buscar los datos completos (teléfono y bio)
      try {
        const referenciaDocumento = doc(this.firestore, `usuarios/${datosMemoria.uid}`);
        const documentoConsumido = await getDoc(referenciaDocumento);

        if (documentoConsumido.exists()) {
          const datosCompletos = documentoConsumido.data();
          
          // Si los campos existen en la base de datos, los mostramos en pantalla
          if (datosCompletos['telefono']) {
            this.usuarioPerfil.telefono = datosCompletos['telefono'];
          }
          if (datosCompletos['bio']) {
            this.usuarioPerfil.bio = datosCompletos['bio'];
          }
        }
      } catch (error) {
        console.error('Error al descargar datos extra del perfil:', error);
      }
    }
  }

  // ==========================================
  // FUNCIONES DE CÁMARA (Intactas)
  // ==========================================
  async obtenerImagen() {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
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
      console.log('El usuario canceló la selección de imagen.', error);
    }
  }

  fotoRecortadaEfectuada(event: ImageCroppedEvent) {
    if (event && event.base64) {
      this.imagenTemporalRecortada = event.base64;
    }
  }

  aplicarRecorteCircular() {
    if (this.imagenTemporalRecortada) {
      this.usuarioPerfil.avatarUrl = this.imagenTemporalRecortada;
      this.abrirRecortador = false;
      console.log('Imagen lista para Firebase Storage.');
    }
  }

  // ==========================================
  // 5. NUEVA LÓGICA DE GUARDADO EN FIREBASE
  // ==========================================
  async guardarCambiosPerfil() {
    const datosMemoria = this.usuarioService.getUsuario();
    if (!datosMemoria) {
      alert('Error: No se encontró una sesión activa.');
      return;
    }

    this.guardando = true; // El botón dirá "Guardando..."

    try {
      // Apuntamos al documento específico del usuario en la base de datos
      const referenciaDocumento = doc(this.firestore, `usuarios/${datosMemoria.uid}`);
      
      // Actualizamos solo los campos que nos importan
      await updateDoc(referenciaDocumento, {
        nombre: this.usuarioPerfil.nombre,
        telefono: this.usuarioPerfil.telefono,
        bio: this.usuarioPerfil.bio
      });

      // Actualizamos la memoria RAM para que el Dashboard (Resumen) se entere del cambio de nombre
      datosMemoria.nombre = this.usuarioPerfil.nombre;
      this.usuarioService.setUsuario(datosMemoria);

      console.log('Datos actualizados enviados a Firestore:', this.usuarioPerfil);
      this.guardando = false;
      
      // Regresamos al dashboard
      this.router.navigate(['/dashboard/resumen']);

    } catch (error) {
      console.error('Error al actualizar el perfil en Firestore:', error);
      alert('Hubo un error al guardar los cambios de tu perfil.');
      this.guardando = false;
    }
  }
}