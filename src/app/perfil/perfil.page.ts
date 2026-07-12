import { Component, OnInit, ElementRef, ViewChild } from '@angular/core'; // 👈 Añadido ElementRef y ViewChild
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonBackButton, IonButton, IonList, IonItem, IonLabel, 
  IonInput, IonTextarea, IonModal, IonIcon
} from '@ionic/angular/standalone';

import { ImageCropperComponent, ImageCroppedEvent } from 'ngx-image-cropper';
// Ya no necesitamos @capacitor/camera porque el input file nativo hace el trabajo en ambas plataformas
import { addIcons } from 'ionicons';
import { pencilOutline, cameraOutline } from 'ionicons/icons';

import { Firestore, doc, updateDoc, getDoc } from '@angular/fire/firestore';
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

  // 👈 Obtenemos una referencia al input oculto en el HTML
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
    private firestore: Firestore,
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
          if (datosCompletos['imagen']) {
            this.usuarioPerfil.avatarUrl = datosCompletos['imagen'];
            // 👈 Sincronizamos la memoria local si Firebase tiene una foto que la memoria no
             datosMemoria.imagen = datosCompletos['imagen'];
             this.usuarioService.setUsuario(datosMemoria);
          }
        }
      } catch (error) {
        console.error('Error al descargar datos extra del perfil desde Firestore:', error);
      }
    }
  }

  // ==============================================================
  // LÓGICA DE SELECCIÓN DE IMAGEN (PC Y MÓVIL) + NGX-CROPPER
  // ==============================================================
  
  // 1. Esta función se ejecuta al tocar el botón de la cámara
  abrirSelectorArchivo() {
    // Simula un clic en el input de tipo file oculto
    this.fileInput.nativeElement.click(); 
  }

  // 2. Esta función se dispara cuando el usuario selecciona un archivo (en PC o Celular)
  archivoSeleccionado(event: any) {
    const archivo = event.target.files[0]; // Captura el archivo
    if (archivo) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        // Convierte el archivo a Base64 y lo manda al Recortador (Cropper)
        this.imagenOriginalBase64 = e.target.result;
        this.abrirRecortador = true; // Abre el modal
      };
      reader.readAsDataURL(archivo);
    }
    // Resetea el input para poder seleccionar la misma imagen dos veces seguidas si se quiere
    event.target.value = ''; 
  }

  // ==========================================
  // CORRECCIÓN: LECTURA HÍBRIDA DEL RECORTADOR
  // ==========================================
  fotoRecortadaEfectuada(event: any) {
    // 1. Si usas una versión de ngx-image-cropper que aún envía base64
    if (event.base64) {
      this.imagenTemporalRecortada = event.base64;
    } 
    // 2. Si usas una versión moderna que envía un 'blob', lo convertimos a base64
    else if (event.blob) {
      const reader = new FileReader();
      reader.readAsDataURL(event.blob);
      reader.onloadend = () => {
        this.imagenTemporalRecortada = reader.result as string;
      };
    }
  }

  aplicarRecorteCircular() {
    // Si por alguna razón el recorte falló, usamos la imagen original como respaldo
    // Esto garantiza que el modal SIEMPRE se cierre y no te deje atrapado.
    if (!this.imagenTemporalRecortada) {
      this.imagenTemporalRecortada = this.imagenOriginalBase64;
    }
    
    // Aplicamos la foto al círculo de perfil y apagamos el modal
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
      const referenciaDocumento = doc(this.firestore, `usuarios/${datosMemoria.uid}`);
      
      const datosActualizar: any = {
        nombre: this.usuarioPerfil.nombre,
        telefono: this.usuarioPerfil.telefono,
        bio: this.usuarioPerfil.bio
      };

      if (this.usuarioPerfil.avatarUrl && !this.usuarioPerfil.avatarUrl.includes('avatar.svg')) {
        datosActualizar.imagen = this.usuarioPerfil.avatarUrl;
      }

      await updateDoc(referenciaDocumento, datosActualizar);

      // 👈 AÑADIDO: Actualizamos el UsuarioService con la nueva imagen
      datosMemoria.nombre = this.usuarioPerfil.nombre;
      if (datosActualizar.imagen) {
        datosMemoria.imagen = datosActualizar.imagen; // Guardamos la imagen base64 en la memoria global
      }
      this.usuarioService.setUsuario(datosMemoria);

      this.guardando = false;
      this.router.navigate(['/dashboard/resumen']);

    } catch (error) {
      console.error('Error al actualizar el perfil en Firestore:', error);
      alert('Hubo un error al guardar los cambios de tu perfil.');
      this.guardando = false;
    }
  }
}