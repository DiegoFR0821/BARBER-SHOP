import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, 
  IonLabel, IonAvatar, IonBadge, IonModal, IonInput, IonItem,
  IonFab, IonFabButton, IonToggle, IonTextarea
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  megaphoneOutline, createOutline, trashOutline, closeOutline, 
  saveOutline, add, cameraOutline, imageOutline, eyeOutline, eyeOffOutline 
} from 'ionicons/icons';

@Component({
  selector: 'app-anuncios-admin',
  templateUrl: './anuncios-admin.page.html',
  styleUrls: ['./anuncios-admin.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonMenuButton, IonSearchbar, IonIcon, 
    IonButton, IonLabel, IonAvatar, IonBadge, IonModal, IonInput, 
    IonItem, IonFab, IonFabButton, IonToggle, IonTextarea
  ]
})
export class AnunciosAdminPage implements OnInit {

  private router = inject(Router);

  anuncios: any[] = [];
  anunciosFiltrados: any[] = [];
  searchTerm: string = '';

  // Estados del modal de gestión
  isModalOpen: boolean = false;
  modoEdicion: boolean = false;
  anuncioActual: any = { id: '', titulo: '', descripcion: '', imagen: '', activo: true };

  constructor() {
    addIcons({ 
      megaphoneOutline, createOutline, trashOutline, closeOutline, 
      saveOutline, add, cameraOutline, imageOutline, eyeOutline, eyeOffOutline 
    });
  }

  ngOnInit() {
    this.cargarAnuncios();
  }

  ionViewWillEnter() {
    this.cargarAnuncios();
  }

  async cargarAnuncios() {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('anuncios').select('*'))
    try {
      this.anuncios = [];
      this.filtrarAnuncios();
    } catch (error) {
      console.error('❌ Error leyendo promociones:', error);
    }
  }

  filtrarAnuncios() {
    if (!this.searchTerm.trim()) {
      this.anunciosFiltrados = [...this.anuncios];
    } else {
      this.anunciosFiltrados = this.anuncios.filter(a => 
        a.titulo && a.titulo.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  abrirModalCrear() {
    this.modoEdicion = false;
    this.anuncioActual = { id: '', titulo: '', descripcion: '', imagen: '', activo: true };
    this.isModalOpen = true;
  }

  abrirModalEditar(promo: any) {
    this.modoEdicion = true;
    this.anuncioActual = { ...promo };
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  abrirSelectorArchivo() {
    document.getElementById('file-upload-anuncio')?.click();
  }

  cargarImagenAnuncio(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.anuncioActual.imagen = reader.result as string;
      };
    }
  }

  // Permite activar/desactivar el pop-up directamente desde la tarjeta con un switch rápido
  async alternarEstadoAnuncio(promo: any) {
    // TODO: Migrar a Supabase en Fase 2 (supabase.from('anuncios').update({ activo: !promo.activo }).eq('id', promo.id))
    try {
      promo.activo = !promo.activo;
      this.cargarAnuncios();
    } catch (error) {
      console.error('Error al cambiar el estado del pop-up:', error);
    }
  }

  async guardarAnuncio() {
    if (!this.anuncioActual.titulo || !this.anuncioActual.descripcion) {
      alert('Por favor, ingresa el título y la descripción para la ventana emergente.');
      return;
    }

    // TODO: Migrar a Supabase en Fase 2 (insert o update en tabla 'anuncios')
    try {
      this.cerrarModal();
      this.cargarAnuncios();
    } catch (error) {
      console.error('Error al guardar el anuncio:', error);
      alert('Surgió un error al guardar los datos del Pop-up.');
    }
  }

  async eliminarAnuncio(id: string) {
    if (confirm('¿Estás seguro de eliminar permanentemente esta campaña promocional emergente?')) {
      // TODO: Migrar a Supabase en Fase 2 (supabase.from('anuncios').delete().eq('id', id))
      try {
        this.cargarAnuncios();
      } catch (error) {
        console.error(error);
      }
    }
  }
}
