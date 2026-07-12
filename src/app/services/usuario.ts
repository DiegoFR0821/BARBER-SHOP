import { Injectable } from '@angular/core';

export interface DatosUsuario {
  uid: string;
  nombre: string;
  correo: string;
  rol: string;
  imagen?: string; // 👈 Aseguramos que la propiedad opcional exista para TypeScript
}

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  
  private usuarioActual: DatosUsuario | null = null;

  constructor() { }

  setUsuario(datos: DatosUsuario) {
    this.usuarioActual = datos;
  }

  getUsuario(): DatosUsuario | null {
    return this.usuarioActual;
  }

  limpiarUsuario() {
    this.usuarioActual = null;
  }
}