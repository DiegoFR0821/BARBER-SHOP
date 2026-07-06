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
import { Firestore, collection, getDocs, doc, updateDoc, deleteDoc, addDoc } from '@angular/fire/firestore';

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

  private firestore = inject(Firestore);
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
    try {
      const colRef = collection(this.firestore, 'anuncios');
      const snapshot = await getDocs(colRef);
      this.anuncios = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      this.filtrarAnuncios();
    } catch (error) {
      console.error('❌ Error leyendo promociones de Firestore:', error);
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
    try {
      const docRef = doc(this.firestore, `anuncios/${promo.id}`);
      await updateDoc(docRef, { activo: !promo.activo });
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

    const datosAnuncio = {
      titulo: this.anuncioActual.titulo,
      descripcion: this.anuncioActual.descripcion,
      imagen: this.anuncioActual.imagen || '',
      activo: this.anuncioActual.activo
    };

    try {
      if (this.modoEdicion) {
        const docRef = doc(this.firestore, `anuncios/${this.anuncioActual.id}`);
        await updateDoc(docRef, datosAnuncio);
      } else {
        const colRef = collection(this.firestore, 'anuncios');
        await addDoc(colRef, datosAnuncio);
      }
      this.cerrarModal();
      this.cargarAnuncios();
    } catch (error) {
      console.error('Error al guardar el anuncio:', error);
      alert('Surgió un error al guardar los datos del Pop-up.');
    }
  }

  async eliminarAnuncio(id: string) {
    if (confirm('¿Estás seguro de eliminar permanentemente esta campaña promocional emergente?')) {
      try {
        await deleteDoc(doc(this.firestore, `anuncios/${id}`));
        this.cargarAnuncios();
      } catch (error) {
        console.error(error);
      }
    }
  }
}