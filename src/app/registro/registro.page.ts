import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  clave: string = '';
  
  mensajeError: string = '';
  cargando: boolean = false;

  constructor(
    private router: Router
  ) { }

  ngOnInit() { }

  async registrarUsuario() {
    if (!this.nombre || !this.correo || !this.clave) {
      this.mensajeError = 'Por favor, completa todos los campos.';
      return;
    }

    this.mensajeError = '';
    this.cargando = true;

    try {
      // TODO: Migrar a Supabase en Fase 2:
      // const { data, error } = await supabase.auth.signUp({
      //   email: this.correo,
      //   password: this.clave,
      //   options: { data: { nombre: this.nombre, rol: 'cliente' } }
      // });
      // Inserción en tabla 'usuarios'
      console.log('Registro de usuario preparado para Fase 2');
      this.cargando = false;
      this.router.navigate(['/login']);

    } catch (error: any) {
      this.cargando = false;
      this.mensajeError = 'Ocurrió un error. Verifica tus datos.';
      console.error(error);
    }
  }
}
