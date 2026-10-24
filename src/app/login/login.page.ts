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
  // 2. VARIABLES Y ESTADO
  // ==========================================
  credenciales = {
    correo: '',
    password: ''
  };
  
  mensajeError: string = '';
  cargando: boolean = false;

  constructor(
    private router: Router,
    private usuarioService: UsuarioService
  ) { }

  ngOnInit() { }

  // ==========================================
  // 3. FUNCIONES Y ACCIONES
  // ==========================================
  async iniciarSesion() {
    // Validación inicial
    if (!this.credenciales.correo || !this.credenciales.password) {
      this.mensajeError = 'Por favor, rellena todos los campos.';
      return;
    }

    this.mensajeError = '';
    this.cargando = true;

    try {
      // TODO: Migrar a Supabase en Fase 2:
      // const { data, error } = await supabase.auth.signInWithPassword({
      //   email: this.credenciales.correo,
      //   password: this.credenciales.password
      // });
      // Consultar rol en tabla 'usuarios' y guardar en usuarioService
      console.log('Inicio de sesión preparado para Fase 2');
      this.cargando = false;

    } catch (error: any) {
      this.cargando = false;
      this.mensajeError = 'Ocurrió un error al intentar ingresar.';
      console.error(error);
    }
  }

  irARegistro() {
    this.router.navigate(['/registro']);
  }
}
