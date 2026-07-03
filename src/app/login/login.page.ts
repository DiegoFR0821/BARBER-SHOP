// ==========================================
// 1. IMPORTACIONES Y CONFIGURACIÓN
// ==========================================
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from '../services/usuario';
import { 
  IonContent, IonButton, IonButtons, IonBackButton, 
  IonItem, IonInput, IonText 
} from '@ionic/angular/standalone';

// 👈 Importaciones de Firebase para Auth y Firestore
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonButton, 
    IonButtons, IonBackButton, IonInput, IonItem, IonText
  ]
})
export class LoginPage implements OnInit {

  // ==========================================
  // 2. VARIABLES Y ESTADO (DATOS PARA FIREBASE)
  // ==========================================
  credenciales = {
    correo: '',
    password: ''
  };
  
  mensajeError: string = '';
  cargando: boolean = false; // 👈 Variable para controlar el estado del botón

  // 👈 Inyectamos Auth y Firestore en tu constructor
  constructor(
  private router: Router,
  private auth: Auth,
  private firestore: Firestore,
  private usuarioService: UsuarioService // 👈 Añadimos el servicio
) { }

  ngOnInit() { }

  // ==========================================
  // 3. FUNCIONES Y ACCIONES (LÓGICA FIREBASE)
  // ==========================================
  async iniciarSesion() {
    // Validación inicial
    if (!this.credenciales.correo || !this.credenciales.password) {
      this.mensajeError = 'Por favor, rellena todos los campos.';
      return;
    }

    this.mensajeError = '';
    this.cargando = true;
    console.log('Validando usuario en Firebase Auth:', this.credenciales.correo);

    try {
      // 1. Validar credenciales en Firebase Authentication
      const credencial = await signInWithEmailAndPassword(this.auth, this.credenciales.correo, this.credenciales.password);
      const uid = credencial.user.uid;

      // 2. Leer el documento del usuario en Firestore para descubrir su rol
      const referenciaDocumento = doc(this.firestore, `usuarios/${uid}`);
      const documentoConsumido = await getDoc(referenciaDocumento);

      if (documentoConsumido.exists()) {
     const datosUsuario = documentoConsumido.data();
     const rol = datosUsuario['rol'];

     // 👈 ¡NUEVO! Guardamos todo en la memoria RAM
     this.usuarioService.setUsuario({
       uid: uid,
       nombre: datosUsuario['nombre'],
       correo: datosUsuario['correo'], // Tu base de datos guarda esto en el registro
       rol: rol
     });

     console.log('Ingreso exitoso. Rol detectado:', rol);

     if (rol === 'admin') {
     console.log('Redirigiendo al Panel de Administración...');
    // 👇 ¡AQUÍ ESTÁ LA SOLUCIÓN! Apuntamos a la sub-ruta del admin
    this.router.navigate(['/admin/resumen-admin']);
    }else {
       this.router.navigate(['/dashboard/resumen']);
     }
   } else {
        this.mensajeError = 'No se encontraron los datos del perfil.';
      }

      this.cargando = false;

    } catch (error: any) {
      this.cargando = false;
      // Manejo de errores comunes de autenticación
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        this.mensajeError = 'Correo o contraseña incorrectos.';
      } else {
        this.mensajeError = 'Ocurrió un error al intentar ingresar.';
        console.error(error);
      }
    }
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }
}