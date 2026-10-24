import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, 
  IonLabel, IonAvatar, IonBadge, IonModal, IonInput, IonItem,
  IonFab, IonFabButton, IonToggle, IonTextarea, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  megaphoneOutline, createOutline, trashOutline, closeOutline, 
  saveOutline, add, cameraOutline, imageOutline, eyeOutline, eyeOffOutline 
} from 'ionicons/icons';
import { SupabaseService, Anuncio } from '../../core/services/supabase.service';

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
  private supabaseService = inject(SupabaseService);
  private toastCtrl = inject(ToastController);

  anuncios: Anuncio[] = [];
  anunciosFiltrados: Anuncio[] = [];
  searchTerm: string = '';

  // Estados del modal de gestión
  isModalOpen: boolean = false;
  modoEdicion: boolean = false;
  guardando: boolean = false;
  anuncioActual: any = { id: '', titulo: '', descripcion: '', imagen: '', activo: true };

  constructor() {
    addIcons({ 
      megaphoneOutline, createOutline, trashOutline, closeOutline, 
      saveOutline, add, cameraOutline, imageOutline, eyeOutline, eyeOffOutline 
    });
  }

  async ngOnInit() {
    await this.cargarAnuncios();
  }

  async ionViewWillEnter() {
    await this.cargarAnuncios();
  }

  async cargarAnuncios() {
    try {
      this.anuncios = await this.supabaseService.getTodosLosAnunciosAdmin();
      this.filtrarAnuncios();
    } catch (error) {
      console.error('❌ Error leyendo promociones en Supabase:', error);
    }
  }

  filtrarAnuncios() {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.anunciosFiltrados = [...this.anuncios];
    } else {
      this.anunciosFiltrados = this.anuncios.filter(a => 
        (a.titulo && a.titulo.toLowerCase().includes(term)) ||
        (a.descripcion && a.descripcion.toLowerCase().includes(term))
      );
    }
  }

  abrirModalCrear() {
    this.modoEdicion = false;
    this.anuncioActual = { id: '', titulo: '', descripcion: '', imagen: '', activo: true };
    this.isModalOpen = true;
  }

  abrirModalEditar(promo: Anuncio) {
    this.modoEdicion = true;
    this.anuncioActual = { 
      ...promo,
      imagen: promo.imagen || promo.imagen_url || ''
    };
    this.isModalOpen = true;
  }

  cerrarModal() {
    this.isModalOpen = false;
  }

  abrirSelectorArchivo() {
    document.getElementById('file-upload-anuncio')?.click();
  }

  cargarImagenAnuncio(event: any) {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_W = 600;
        const MAX_H = 380;
        canvas.width = MAX_W;
        canvas.height = MAX_H;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, MAX_W, MAX_H);
          this.anuncioActual.imagen = canvas.toDataURL('image/jpeg', 0.82);
        } else {
          this.anuncioActual.imagen = e.target.result;
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Permite activar/desactivar el pop-up directamente desde la tarjeta con un switch rápido
  async alternarEstadoAnuncio(promo: Anuncio) {
    const nuevoEstado = !promo.activo;
    try {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (promo.id && uuidRegex.test(promo.id)) {
        await this.supabaseService.alternarEstadoAnuncio(promo.id, nuevoEstado);
      }
      promo.activo = nuevoEstado;
      const t = await this.toastCtrl.create({
        message: nuevoEstado ? '👁️ Anuncio activado en Inicio.' : '⏸️ Anuncio pausado.',
        duration: 1800,
        color: nuevoEstado ? 'success' : 'medium',
        position: 'bottom'
      });
      await t.present();
    } catch (error) {
      console.error('Error al cambiar el estado del pop-up:', error);
      promo.activo = nuevoEstado;
    }
  }

  async guardarAnuncio() {
    if (!this.anuncioActual.titulo || !this.anuncioActual.descripcion) {
      alert('Por favor, ingresa el título y la descripción para la ventana emergente.');
      return;
    }

    this.guardando = true;
    try {
      const payload: Partial<Anuncio> = {
        titulo: this.anuncioActual.titulo.trim(),
        descripcion: this.anuncioActual.descripcion.trim(),
        imagen_url: this.anuncioActual.imagen || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
        activo: Boolean(this.anuncioActual.activo)
      };

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (this.modoEdicion && this.anuncioActual.id && uuidRegex.test(this.anuncioActual.id)) {
        await this.supabaseService.actualizarAnuncio(this.anuncioActual.id, payload);
      } else {
        await this.supabaseService.crearAnuncio(payload);
      }

      this.guardando = false;
      this.cerrarModal();
      await this.cargarAnuncios();

      const t = await this.toastCtrl.create({
        message: '✅ Promoción sincronizada en Supabase.',
        duration: 2200,
        color: 'success',
        position: 'bottom'
      });
      await t.present();
    } catch (error) {
      this.guardando = false;
      console.error('Error al guardar el anuncio:', error);
      alert('Surgió un error al guardar los datos del Pop-up.');
    }
  }

  async eliminarAnuncio(id: string) {
    if (confirm('¿Estás seguro de eliminar permanentemente esta campaña promocional emergente?')) {
      try {
        await this.supabaseService.eliminarAnuncio(id);
        await this.cargarAnuncios();
        const t = await this.toastCtrl.create({
          message: '🗑️ Anuncio eliminado.',
          duration: 2000,
          color: 'warning',
          position: 'bottom'
        });
        await t.present();
      } catch (error) {
        console.error(error);
        this.anuncios = this.anuncios.filter(a => a.id !== id);
        this.filtrarAnuncios();
      }
    }
  }
}
