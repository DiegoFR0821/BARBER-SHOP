import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Estructura de preferencias personalizadas de corte y cuidado masculino
 * Resuelve la problemática de 'Falta de historial de clientes' en Barber Shop.
 */
export interface PreferenciasCliente {
  estilo: string;        // Ej. 'Skin Fade', 'Taper Fade', 'Clásico Tijera', 'Pompadour', 'Buzz Cut'
  tipo_cabello: string;  // Ej. 'Lacio', 'Ondulado', 'Rizado', 'Grueso'
  barba: string;         // Ej. 'Afeitado Completo', 'Perfilada con Navaja', 'Corta (3mm)', 'Larga Tradicional'
  frecuencia?: string;   // Ej. 'Semanal', 'Quincenal', 'Mensual'
  notas?: string;        // Ej. 'Remolino en coronilla, evitar máquina cero en patillas'
}

/**
 * Perfil completo de usuario para Barber Shop Lima Norte S.A.C.
 * Compatible con la tabla 'public.usuarios' de Supabase y con el sistema de sesiones móviles.
 */
export interface UsuarioPerfil {
  id: string;
  uid?: string; // Alias retrocompatible con código existente
  nombre: string;
  correo: string;
  telefono?: string;
  rol: 'cliente' | 'admin' | 'barbero' | string;
  avatar_url?: string;
  imagen?: string; // Alias retrocompatible para avatar en Base64 o URL
  preferencias_corte?: PreferenciasCliente;
  historial_notas?: string;
  descripcion?: string; // Alias para notas o descripción en panel administrativo
  created_at?: string;
  updated_at?: string;
}

// Tipo de compatibilidad con vistas previas
export type DatosUsuario = UsuarioPerfil;

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  
  private readonly STORAGE_KEY = 'barber_shop_user_session';
  private usuarioSubject = new BehaviorSubject<UsuarioPerfil | null>(this.recuperarUsuarioStorage());
  
  /** Observable reactivo del usuario logueado en la aplicación */
  public usuario$: Observable<UsuarioPerfil | null> = this.usuarioSubject.asObservable();

  constructor() { }

  /**
   * Almacena el usuario tanto en memoria RAM reactiva como en el almacenamiento local persistente
   */
  setUsuario(datos: UsuarioPerfil): void {
    // Garantizamos compatibilidad mutua entre id y uid, y entre avatar_url e imagen
    const usuarioNormalizado: UsuarioPerfil = {
      ...datos,
      id: datos.id || datos.uid || '',
      uid: datos.id || datos.uid || '',
      avatar_url: datos.avatar_url || datos.imagen || 'https://ionicframework.com/docs/img/demos/avatar.svg',
      imagen: datos.avatar_url || datos.imagen || 'https://ionicframework.com/docs/img/demos/avatar.svg',
      descripcion: datos.descripcion || datos.historial_notas || ''
    };

    this.usuarioSubject.next(usuarioNormalizado);
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuarioNormalizado));
    } catch (e) {
      console.warn('No se pudo guardar la sesión en localStorage:', e);
    }
  }

  /**
   * Obtiene la lectura síncrona del usuario en sesión
   */
  getUsuario(): UsuarioPerfil | null {
    return this.usuarioSubject.value;
  }

  /**
   * Actualiza parcialmente datos del usuario (como foto o preferencias de corte)
   */
  actualizarDatos(parcial: Partial<UsuarioPerfil>): void {
    const actual = this.getUsuario();
    if (actual) {
      const actualizado: UsuarioPerfil = { ...actual, ...parcial };
      this.setUsuario(actualizado);
    }
  }

  /**
   * Cierra sesión local y borra credenciales de memoria
   */
  limpiarUsuario(): void {
    this.usuarioSubject.next(null);
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e) {
      console.warn('Error al limpiar localStorage:', e);
    }
  }

  /**
   * Recupera usuario almacenado previamente si no ha expirado
   */
  private recuperarUsuarioStorage(): UsuarioPerfil | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as UsuarioPerfil;
      }
    } catch (e) {
      console.warn('Error recuperando usuario almacenado:', e);
    }
    return null;
  }
}
