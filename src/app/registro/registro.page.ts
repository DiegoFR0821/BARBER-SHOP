import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';
import { UsuarioService } from '../services/usuario';
import { 
  IonContent, IonButton, IonButtons, IonBackButton, 
  IonItem, IonInput, IonText 
} from '@ionic/angular/standalone';

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
  telefono: string = '';
  clave: string = '';
  
  mensajeError: string = '';
  cargando: boolean = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private usuarioService: UsuarioService
  ) { }

  ngOnInit() { }

  /**
   * Registra un nuevo cliente en Supabase Auth de forma limpia y directa.
   * Sin pasos superfluos ni bloqueo por confirmación de Gmail.
   */
  async registrarUsuario(): Promise<void> {
    if (!this.nombre.trim() || !this.correo.trim() || !this.clave.trim()) {
      this.mensajeError = 'Por favor, completa Nombre, Correo y Contraseña.';
      return;
    }

    if (this.clave.length < 6) {
      this.mensajeError = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.mensajeError = '';
    this.cargando = true;

    try {
      // 1. Registro directo en Supabase Auth y tabla public.usuarios
      const { user, session } = await this.supabaseService.signUp(
        this.correo.trim(),
        this.clave,
        this.nombre.trim(),
        this.telefono.trim()
      );

      console.log('✅ Cliente registrado con éxito en Supabase:', user?.email);
      this.cargando = false;

      // 2. Si hay sesión activa inmediata (gracias al trigger/auto-login), entra directo al dashboard
      if (session && user) {
        const perfil = await this.supabaseService.obtenerPerfil(user.id);
        const perfilCompleto = {
          ...(perfil || {}),
          id: user.id,
          uid: user.id,
          nombre: this.nombre.trim(),
          correo: this.correo.trim().toLowerCase(),
          telefono: this.telefono.trim() || perfil?.telefono || '',
          rol: perfil?.rol || 'cliente',
          avatar_url: perfil?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
          imagen: perfil?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
        };
        this.usuarioService.setUsuario(perfilCompleto as any);
        alert(`💈 ¡Bienvenido a Barber Shop, ${this.nombre.trim()}! Tu cuenta ha sido activada.`);
        this.router.navigate(['/dashboard/resumen']);
      } else {
        alert('💈 ¡Cuenta creada con éxito! Ingresa con tus credenciales.');
        this.router.navigate(['/login']);
      }

    } catch (error: any) {
      this.cargando = false;
      console.error('Error al registrar usuario en Supabase:', error);

      if (error?.message?.includes('already registered') || error?.code === 'user_already_exists') {
        this.mensajeError = 'Este correo electrónico ya se encuentra registrado.';
      } else if (error?.message?.includes('Password should be')) {
        this.mensajeError = 'La contraseña debe tener al menos 6 caracteres.';
      } else {
        this.mensajeError = error?.message || 'Ocurrió un error al intentar crear tu cuenta.';
      }
    }
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
