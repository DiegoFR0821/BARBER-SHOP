import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UsuarioService } from '../services/usuario';
import { SupabaseService } from '../core/services/supabase.service';
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

  credenciales = {
    correo: '',
    password: ''
  };
  
  mensajeError: string = '';
  cargando: boolean = false;

  constructor(
    private router: Router,
    private usuarioService: UsuarioService,
    private supabaseService: SupabaseService
  ) { }

  ngOnInit() { }

  /**
   * Inicia sesión validando credenciales contra Supabase Auth y recuperando
   * el perfil relacional del usuario (incluyendo rol y preferencias de corte).
   */
  async iniciarSesion(): Promise<void> {
    if (!this.credenciales.correo || !this.credenciales.password) {
      this.mensajeError = 'Por favor, ingresa tu correo y contraseña.';
      return;
    }

    this.mensajeError = '';
    this.cargando = true;

    try {
      // 1. Autenticación contra Supabase Auth y consulta de la tabla 'usuarios'
      const { user, perfil } = await this.supabaseService.signIn(
        this.credenciales.correo.trim(),
        this.credenciales.password
      );

      // 2. Almacenamos el perfil recuperado en el servicio de sesión local
      this.usuarioService.setUsuario(perfil);

      console.log('✅ Ingreso exitoso a Barber Shop. Rol detectado:', perfil.rol);

      // 3. Enrutamiento según el rol obtenido de la base de datos PostgreSQL
      if (perfil.rol === 'admin') {
        this.router.navigate(['/admin/resumen-admin']);
      } else {
        this.router.navigate(['/dashboard/resumen']);
      }

      this.cargando = false;

    } catch (error: any) {
      this.cargando = false;
      console.error('Error en autenticación con Supabase:', error);

      if (error?.message?.includes('Invalid login credentials') || error?.code === 'invalid_credentials') {
        this.mensajeError = 'Correo electrónico o contraseña incorrectos.';
      } else if (error?.message?.includes('Email not confirmed')) {
        this.mensajeError = 'Por favor, confirma tu correo electrónico antes de ingresar.';
      } else {
        this.mensajeError = error?.message || 'Ocurrió un error al intentar iniciar sesión. Inténtalo nuevamente.';
      }
    }
  }

  irARegistro(): void {
    this.router.navigate(['/registro']);
  }
}
