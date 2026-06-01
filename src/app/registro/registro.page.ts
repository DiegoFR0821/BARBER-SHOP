import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonButton, IonButtons, IonBackButton, 
  IonItem, IonInput, IonText 
} from '@ionic/angular/standalone';

// 👈 1. Importaciones vitales de Firebase
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonButton, 
    IonButtons, IonBackButton, IonInput, IonItem, IonText
  ]
})
export class RegistroPage implements OnInit {

  nombre: string = '';
  correo: string = '';
  clave: string = ''; // 👈 Mantenemos tu variable 'clave'
  
  mensajeError: string = '';
  cargando: boolean = false; // 👈 Variable extra para que el botón muestre que está pensando

  // 👈 2. Inyectamos Auth y Firestore en tu constructor
  constructor(
    private router: Router,
    private auth: Auth,         
    private firestore: Firestore 
  ) { }

  ngOnInit() { }

  async registrarUsuario() {
    // Validación de campos
    if (!this.nombre || !this.correo || !this.clave) {
      this.mensajeError = 'Por favor, completa todos los campos.';
      return;
    }

    this.mensajeError = '';
    this.cargando = true; // El botón se bloquea temporalmente

    try {
      // 3. Crear el usuario en Firebase Authentication
      const credencialUsuario = await createUserWithEmailAndPassword(this.auth, this.correo, this.clave);
      const uid = credencialUsuario.user.uid;

      // 4. Guardar los datos en Firestore (El CRUD de creación)
      const referenciaDocumento = doc(this.firestore, `usuarios/${uid}`);
      await setDoc(referenciaDocumento, {
        nombre: this.nombre,
        correo: this.correo,
        rol: 'cliente',
        fechaRegistro: new Date()
      });

      console.log('¡Usuario registrado con éxito en la nube!');
      this.cargando = false;
      this.router.navigate(['/login']);

    } catch (error: any) {
      this.cargando = false;
      // 5. Manejo de errores de Firebase traducidos al cliente
      if (error.code === 'auth/email-already-in-use') {
        this.mensajeError = 'Este correo ya está registrado.';
      } else if (error.code === 'auth/weak-password') {
        this.mensajeError = 'La contraseña debe tener al menos 6 caracteres.';
      } else {
        this.mensajeError = 'Ocurrió un error. Verifica tus datos.';
        console.error(error);
      }
    }
  }
}