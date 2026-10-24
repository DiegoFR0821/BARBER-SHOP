import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../core/services/supabase.service';
import { UsuarioService, PreferenciasCliente } from '../services/usuario';
import { 
  IonContent, IonButton, IonButtons, IonBackButton, 
  IonItem, IonInput, IonText, IonSelect, IonSelectOption 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-registro',
  templateUrl: './registro.page.html',
  styleUrls: ['./registro.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonButton, 
    IonButtons, IonBackButton, IonInput, IonItem, IonText,
    IonSelect, IonSelectOption
  ]
})
export class RegistroPage implements OnInit {

  nombre: string = '';
  correo: string = '';
  telefono: string = '';
  clave: string = '';
  estiloPreferido: string = 'Fade Clásico';
  
  mensajeError: string = '';
  cargando: boolean = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private usuarioService: UsuarioService
  ) { }

  ngOnInit() { }

  /**
   * Registra un nuevo cliente en Supabase Auth y crea su perfil relacional
   * con sus preferencias de estilo en la tabla 'public.usuarios'.
   */
  async registrarUsuario(): Promise<void> {
    if (!this.nombre.trim() || !this.correo.trim() || !this.clave.trim()) {
      this.mensajeError = 'Por favor, completa los campos requeridos (Nombre, Correo y Contraseña).';
      return;
    }

    if (this.clave.length < 6) {
      this.mensajeError = 'La contraseña debe tener al menos 6 caracteres.';
      return;
    }

    this.mensajeError = '';
    this.cargando = true;

    try {
      const preferenciasIniciales: PreferenciasCliente = {
        estilo: this.estiloPreferido || 'Fade Clásico',
        tipo_cabello: 'Normal',
        barba: 'Perfilada',
        frecuencia: 'Quincenal',
        notas: `Preferencia inicial registrada: ${this.estiloPreferido}`
      };

      // 1. Llamada al servicio centralizado de Supabase
      const { user } = await this.supabaseService.signUp(
        this.correo.trim(),
        this.clave,
        this.nombre.trim(),
        this.telefono.trim(),
        preferenciasIniciales
      );

      console.log('✅ Cliente registrado con éxito en Supabase:', user?.email);
      this.cargando = false;

      alert('¡Cuenta creada con éxito en Barber Shop Lima Norte! Ahora puedes iniciar sesión.');
      this.router.navigate(['/login']);

    } catch (error: any) {
      this.cargando = false;
      console.error('Error al registrar usuario en Supabase:', error);

      if (error?.message?.includes('already registered') || error?.code === 'user_already_exists') {
        this.mensajeError = 'Este correo electrónico ya se encuentra registrado.';
      } else if (error?.message?.includes('Password should be')) {
        this.mensajeError = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      } else {
        this.mensajeError = error?.message || 'Ocurrió un error al intentar crear tu cuenta. Verifica tus datos.';
      }
    }
  }

  irALogin(): void {
    this.router.navigate(['/login']);
  }
}
