import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, 
  IonMenuButton, IonSearchbar, IonIcon, IonButton, IonFooter,
  IonModal, IonInput, IonItem, IonLabel, IonBadge, IonSelect, 
  IonSelectOption, IonSegment, IonSegmentButton, IonAvatar,
  IonList, IonFab, IonFabButton, IonFabList 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline, closeOutline, saveOutline, calendarOutline, timeOutline, cameraOutline, imageOutline, personOutline, cutOutline, gridOutline, peopleOutline, cubeOutline, add } from 'ionicons/icons';

import { Firestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where } from '@angular/fire/firestore';

@Component({
  selector: 'app-citas',
  templateUrl: './citas.page.html',
  styleUrls: ['./citas.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonContent, IonHeader, IonTitle, 
    IonToolbar, IonButtons, IonMenuButton, IonSearchbar, IonIcon, 
    IonButton, IonFooter, IonModal, IonInput, IonItem, IonLabel, 
    IonBadge, IonSelect, IonSelectOption, IonSegment, IonSegmentButton, IonAvatar,
    IonList, IonFab, IonFabButton, IonFabList
  ]
})
export class CitasPage implements OnInit {

  private firestore = inject(Firestore);
  private router = inject(Router);

  seccionActiva: string = 'reservas';
  searchTerm: string = '';
  citasFiltradas: any[] = []; 

  citas: any[] = [];
  servicios: any[] = [];
  estilistas: any[] = [];
  clientes: any[] = [];

  // Opciones de profesión solicitadas
  profesionesSalones: string[] = [
    'Estilista Principal', 'Colorista Profesional', 'Manicurista / Pedicurista', 
    'Maquillador Profesional', 'Especialista Capilar', 'Especialista en Peinados', 
    'Barbero Profesional', 'Especialista en Extensiones'
  ];

  horariosFijos: string[] = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'
  ];

  isModalReservaOpen: boolean = false;
  isModalServicioOpen: boolean = false;
  isModalEstilistaOpen: boolean = false;
  modoEdicion: boolean = false;

  reservaActual: any = { id: '', clienteId: '', servicioId: '', estilistaId: '', fecha: '', hora: '', estado: 'pendiente' };
  servicioActual: any = { id: '', nombre: '', imagen: '' };
  
  // Añadimos imagen y profesión al objeto de estilista
  estilistaActual: any = { id: '', nombre: '', imagen: '', profesion: '' };
  // ==========================================
  // LÓGICA DEL BOTÓN FLOTANTE DINÁMICO
  // ==========================================
  ejecutarAccionFab() {
    if (this.seccionActiva === 'reservas') {
      this.abrirModalReserva();
    } else if (this.seccionActiva === 'servicios') {
      this.abrirModalServicio();
    } else if (this.seccionActiva === 'estilistas') {
      this.abrirModalEstilista();
    }
  }

  constructor() {
    addIcons({ createOutline, trashOutline, closeOutline, saveOutline, calendarOutline, timeOutline, cameraOutline, imageOutline, personOutline, cutOutline, gridOutline, peopleOutline, cubeOutline, add });
  }

  ngOnInit() {
    this.cargarTodo();
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  async cargarTodo() {
    await Promise.all([
      this.cargarCitas(),
      this.cargarServicios(),
      this.cargarEstilistas(),
      this.cargarClientes()
    ]);
  }

  async cargarCitas() {
    const snap = await getDocs(collection(this.firestore, 'citas'));
    this.citas = snap.docs.map(d => ({ ...d.data(), id: d.id }));
    this.filtrarCitas();
  }

  filtrarCitas() {
    if (!this.searchTerm.trim()) {
      this.citasFiltradas = [...this.citas];
    } else {
      this.citasFiltradas = this.citas.filter(c => 
        c.nombreCliente && c.nombreCliente.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  async cargarServicios() {
    const snap = await getDocs(collection(this.firestore, 'servicios'));
    this.servicios = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  }

  async cargarEstilistas() {
    const snap = await getDocs(collection(this.firestore, 'estilistas'));
    this.estilistas = snap.docs.map(d => ({ ...d.data(), id: d.id }));
  }

  async cargarClientes() {
    const q = query(collection(this.firestore, 'usuarios'), where('rol', '==', 'cliente'));
    const snap = await getDocs(q);
    this.clientes = snap.docs.map(d => ({ ...d.data(), uid: d.id }));
  }

  // ==========================================
  // LÓGICA DE RESERVAS (CITAS)
  // ==========================================
  abrirModalReserva(cita?: any) {
    if (cita) {
      this.modoEdicion = true;
      this.reservaActual = { ...cita };
    } else {
      this.modoEdicion = false;
      this.reservaActual = { id: '', clienteId: '', servicioId: '', estilistaId: '', fecha: '', hora: '', estado: 'pendiente' };
    }
    this.isModalReservaOpen = true;
  }

  async guardarReserva() {
    if (!this.reservaActual.clienteId || !this.reservaActual.servicioId || !this.reservaActual.estilistaId || !this.reservaActual.fecha || !this.reservaActual.hora) {
      alert('Completa todos los campos de la reserva.'); return;
    }

    // Mantenemos tu validación de domingos
    const diaSemana = new Date(this.reservaActual.fecha + 'T00:00:00').getDay(); 
    if (diaSemana === 0) { 
      alert('❌ El salón no atiende los domingos. Elige una fecha de Lunes a Sábado.'); return;
    }

    // Mantenemos tu validación de cruce de horarios
    const qVal = query(collection(this.firestore, 'citas'), 
      where('fecha', '==', this.reservaActual.fecha), 
      where('hora', '==', this.reservaActual.hora)
    );
    const snap = await getDocs(qVal);
    const ocupado = snap.docs.some(doc => doc.id !== this.reservaActual.id);
    
    if (ocupado) {
      alert('❌ Esta hora ya está reservada. Por favor, elige otro horario.'); return;
    }

    const cliente = this.clientes.find(c => c.uid === this.reservaActual.clienteId);
    const servicio = this.servicios.find(s => s.id === this.reservaActual.servicioId);
    const estilista = this.estilistas.find(e => e.id === this.reservaActual.estilistaId);

    const datosParaGuardar = {
      clienteId: this.reservaActual.clienteId,
      servicioId: this.reservaActual.servicioId,
      estilistaId: this.reservaActual.estilistaId,
      fecha: this.reservaActual.fecha,
      hora: this.reservaActual.hora,
      estado: this.reservaActual.estado,
      nombreCliente: cliente ? cliente.nombre : 'Desconocido',
      nombreServicio: servicio ? servicio.nombre : 'Servicio',
      nombreEstilista: estilista ? estilista.nombre : 'Estilista'
    };

    if (this.modoEdicion) {
      await updateDoc(doc(this.firestore, `citas/${this.reservaActual.id}`), datosParaGuardar);
    } else {
      await addDoc(collection(this.firestore, 'citas'), datosParaGuardar);
    }
    this.isModalReservaOpen = false;
    this.cargarCitas();
  }

  async eliminarReserva(id: string) {
    if (confirm('¿Eliminar cita?')) {
      await deleteDoc(doc(this.firestore, `citas/${id}`));
      this.cargarCitas();
    }
  }

  // ==========================================
  // LÓGICA DE SERVICIOS
  // ==========================================
  abrirModalServicio(servicio?: any) {
    if (servicio) {
      this.modoEdicion = true;
      this.servicioActual = { ...servicio };
    } else {
      this.modoEdicion = false;
      this.servicioActual = { id: '', nombre: '', imagen: '' };
    }
    this.isModalServicioOpen = true;
  }

  abrirSelectorArchivo() {
    document.getElementById('file-upload-servicio')?.click();
  }

  cargarImagenServicio(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => { this.servicioActual.imagen = reader.result as string; };
    }
  }

  async guardarServicio() {
    if (!this.servicioActual.nombre) { alert('Ingresa un nombre para el servicio.'); return; }
    
    const datosParaGuardar = { nombre: this.servicioActual.nombre, imagen: this.servicioActual.imagen || '' };

    if (this.modoEdicion) {
      await updateDoc(doc(this.firestore, `servicios/${this.servicioActual.id}`), datosParaGuardar);
    } else {
      await addDoc(collection(this.firestore, 'servicios'), datosParaGuardar);
    }
    this.isModalServicioOpen = false;
    this.cargarServicios();
  }

  async eliminarServicio(id: string) {
    if (confirm('¿Eliminar este servicio del catálogo?')) {
      await deleteDoc(doc(this.firestore, `servicios/${id}`));
      this.cargarServicios();
    }
  }

  // ==========================================
  // LÓGICA DE ESTILISTAS (ACTUALIZADA)
  // ==========================================
  abrirModalEstilista(estilista?: any) {
    if (estilista) {
      this.modoEdicion = true;
      this.estilistaActual = { ...estilista };
    } else {
      this.modoEdicion = false;
      // Añadimos 'Estilista Principal' por defecto si es nuevo
      this.estilistaActual = { id: '', nombre: '', imagen: '', profesion: 'Estilista Principal' };
    }
    this.isModalEstilistaOpen = true;
  }

  abrirSelectorEstilista() {
    document.getElementById('file-upload-estilista')?.click();
  }

  cargarImagenEstilista(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => { this.estilistaActual.imagen = reader.result as string; };
    }
  }

  async guardarEstilista() {
    if (!this.estilistaActual.nombre) { alert('Ingresa el nombre del estilista.'); return; }

    // Guardamos nombre, imagen y la profesión en Firestore
    const datosParaGuardar = { 
      nombre: this.estilistaActual.nombre,
      imagen: this.estilistaActual.imagen || '', 
      profesion: this.estilistaActual.profesion || 'Estilista Principal'
    };

    if (this.modoEdicion) {
      await updateDoc(doc(this.firestore, `estilistas/${this.estilistaActual.id}`), datosParaGuardar);
    } else {
      await addDoc(collection(this.firestore, 'estilistas'), datosParaGuardar);
    }
    this.isModalEstilistaOpen = false;
    this.cargarEstilistas();
  }

  async eliminarEstilista(id: string) {
    if (confirm('¿Dar de baja a este estilista?')) {
      await deleteDoc(doc(this.firestore, `estilistas/${id}`));
      this.cargarEstilistas();
    }
  }
}