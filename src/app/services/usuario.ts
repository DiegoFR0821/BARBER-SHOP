import { Injectable } from '@angular/core';

export interface DatosUsuario {
  uid: string;
  nombre: string;
  correo: string;
  rol: string;
}

@Injectable({
  providedIn: 'root' // Esto hace que el servicio sea global para toda la app
})
export class UsuarioService {
  
  private usuarioActual: DatosUsuario | null = null;

  constructor() { }

  // Guardar los datos en memoria
  setUsuario(datos: DatosUsuario) {
    this.usuarioActual = datos;
  }

  // Leer los datos desde cualquier página
  getUsuario(): DatosUsuario | null {
    return this.usuarioActual;
  }

  // Limpiar memoria al cerrar sesión
  limpiarUsuario() {
    this.usuarioActual = null;
  }
}