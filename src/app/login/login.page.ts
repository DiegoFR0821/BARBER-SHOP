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
   * Inicia sesión validando credenciales contra Supabase Auth, consultando el rol
   * en public.usuarios (o token/metadata) y redirigiendo según rol.
   */
  async iniciarSesion(): Promise<void> {
    const correoLimpio = (this.credenciales.correo || '').trim().toLowerCase();
    const password = this.credenciales.password || '';

    if (!correoLimpio || !password) {
      this.mensajeError = 'Por favor, ingresa tu correo y contraseña.';
      return;
    }

    this.mensajeError = '';
    this.cargando = true;

    try {
      // 1. Autenticación contra Supabase Auth y consulta de public.usuarios
      const { user, perfil } = await this.supabaseService.signIn(correoLimpio, password);

      // 2. Verificación explícita de rol en base de datos o correo administrativo oficial
      const esAdmin =
        correoLimpio === 'admin@barbershop.pe' ||
        correoLimpio === 'admin@barbershop.com' ||
        perfil?.rol === 'admin' ||
        user?.user_metadata?.['rol'] === 'admin';

      perfil.rol = esAdmin ? 'admin' : 'cliente';

      // 3. Almacenamos el perfil recuperado en el servicio de sesión local
      this.usuarioService.setUsuario(perfil);

      this.cargando = false;

      // 4. Redirección obligatoria según el rol
      if (esAdmin || perfil.rol === 'admin') {
        await this.router.navigate(['/admin/resumen-admin']);
      } else {
        await this.router.navigate(['/dashboard/resumen']);
      }
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
