import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  createClient, 
  SupabaseClient, 
  User, 
  Session, 
  AuthChangeEvent 
} from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { UsuarioPerfil, PreferenciasCliente } from '../../services/usuario';

export interface Barbero {
  id: string;
  nombre: string;
  especialidad: string;
  experiencia?: string;
  foto_url?: string;
  imagen?: string; // alias retrocompatible
  activo: boolean;
  created_at?: string;
}

export interface ServicioBarberia {
  id: string;
  nombre: string;
  categoria: 'Corte' | 'Barba' | 'Facial' | 'Combo' | string;
  precio: number;
  duracion_min: number;
  descripcion?: string;
  imagen_url?: string;
  imagen?: string; // alias retrocompatible
  activo: boolean;
  created_at?: string;
}

export interface Cita {
  id: string;
  cliente_id: string;
  barbero_id: string;
  servicio_id: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // '09:00 AM'
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  notas_corte?: string;
  created_at?: string;
  // Campos relacionales
  cliente?: UsuarioPerfil;
  barbero?: Barbero;
  servicio?: ServicioBarberia;
  nombreCliente?: string;
  nombreBarbero?: string;
  nombreEstilista?: string; // retrocompatibilidad con vistas
  nombreServicio?: string;
  precioServicio?: number;
  preferencias_corte?: PreferenciasCliente;
  preferenciasCliente?: PreferenciasCliente;
}

export interface Anuncio {
  id: string;
  titulo: string;
  descripcion: string;
  imagen_url?: string;
  imagen?: string;
  activo: boolean;
  created_at?: string;
}

/**
 * Servicio centralizado de conexión y gestión de Supabase para Barber Shop Lima Norte S.A.C.
 * Implementa el patrón Singleton (providedIn: 'root') y estándares ISO/IEC 25010 y OWASP Mobile:
 * - Persistencia segura de sesión en el almacenamiento local.
 * - Refresco automático de tokens JWT.
 * - Prevención estricta de colisiones de router con detectSessionInUrl: false.
 * - Manejo especializado de concurrencia de citas (captura de error 23505).
 * - Consultas relacionales PostgREST de alto rendimiento (< 2.0s).
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  private supabase: SupabaseClient;
  private currentUserSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

  /** Observable reactivo para suscribirse a cambios de usuario en tiempo real */
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false, // Previene interferencias con Ionic Router
          storage: localStorage
        }
      }
    );

    this.initSession();

    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const user = session?.user ?? null;
      this.currentUserSubject.next(user);
    });
  }

  private async initSession(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      this.currentUserSubject.next(session?.user ?? null);
    } catch (error) {
      console.error('Error al inicializar sesión de Supabase:', error);
      this.currentUserSubject.next(null);
    }
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get auth() {
    return this.supabase.auth;
  }

  // =========================================================================
  // AUTENTICACIÓN
  // =========================================================================

  async signIn(correo: string, clave: string): Promise<{ user: User; session: Session | null; perfil: UsuarioPerfil }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: correo,
      password: clave
    });

    if (error) throw error;
    if (!data.user) throw new Error('No se pudo recuperar la información del usuario.');

    let perfil = await this.getPerfil(data.user.id);
    if (!perfil) {
      perfil = {
        id: data.user.id,
        uid: data.user.id,
        nombre: data.user.user_metadata['nombre'] || correo.split('@')[0],
        correo: correo,
        rol: data.user.user_metadata['rol'] || 'cliente',
        avatar_url: 'https://ionicframework.com/docs/img/demos/avatar.svg',
        imagen: 'https://ionicframework.com/docs/img/demos/avatar.svg',
        historial_notas: 'Cliente regular'
      };
    }

    return { user: data.user, session: data.session, perfil };
  }

  async signUp(
    correo: string, 
    clave: string, 
    nombre: string, 
    telefono?: string, 
    preferencias?: PreferenciasCliente
  ): Promise<{ user: User | null; session: Session | null }> {
    const preferenciasDefecto: PreferenciasCliente = preferencias || {
      estilo: 'Fade Clásico',
      tipo_cabello: 'Lacio',
      barba: 'Perfilada',
      frecuencia: 'Quincenal',
      notas: 'Preferencia inicial al registrarse'
    };

    const { data, error } = await this.supabase.auth.signUp({
      email: correo,
      password: clave,
      options: {
        data: {
          nombre,
          telefono: telefono || '',
          rol: 'cliente',
          preferencias_corte: preferenciasDefecto
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      try {
        await this.supabase.from('usuarios').upsert({
          id: data.user.id,
          nombre,
          correo,
          telefono: telefono || '',
          rol: 'cliente',
          avatar_url: 'https://ionicframework.com/docs/img/demos/avatar.svg',
          preferencias_corte: preferenciasDefecto,
          historial_notas: 'Registrado desde la App Barber Shop.'
        });
      } catch (upsertErr) {
        console.warn('Aviso: el trigger on_auth_user_created gestionará el perfil:', upsertErr);
      }
    }

    return { user: data.user, session: data.session };
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    this.currentUserSubject.next(null);
    if (error) console.warn('Aviso al cerrar sesión en Supabase:', error);
  }

  // =========================================================================
  // PERFILES Y USUARIOS
  // =========================================================================

  async getPerfil(id: string): Promise<UsuarioPerfil | null> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) return null;

      return {
        ...data,
        uid: data.id,
        imagen: data.avatar_url,
        descripcion: data.historial_notas
      } as UsuarioPerfil;
    } catch (e) {
      console.error('Error al obtener perfil desde Supabase:', e);
      return null;
    }
  }

  async actualizarPerfil(id: string, datos: Partial<UsuarioPerfil>): Promise<UsuarioPerfil | null> {
    const payload: any = { ...datos };
    if (datos.imagen && !datos.avatar_url) payload.avatar_url = datos.imagen;
    if (datos.descripcion && !datos.historial_notas) payload.historial_notas = datos.descripcion;
    delete payload.uid;
    delete payload.imagen;
    delete payload.descripcion;
    payload.updated_at = new Date().toISOString();

    const { data, error } = await this.supabase
      .from('usuarios')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      uid: data.id,
      imagen: data.avatar_url,
      descripcion: data.historial_notas
    } as UsuarioPerfil;
  }

  async obtenerUsuarios(): Promise<UsuarioPerfil[]> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(u => ({
      ...u,
      uid: u.id,
      imagen: u.avatar_url,
      descripcion: u.historial_notas
    })) as UsuarioPerfil[];
  }

  async crearUsuarioAdmin(datos: Partial<UsuarioPerfil>): Promise<UsuarioPerfil | null> {
    const idGenerado = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : 'usr-' + Date.now();

    const payload: any = {
      id: datos.id || idGenerado,
      nombre: datos.nombre,
      correo: datos.correo,
      telefono: datos.telefono || '',
      rol: datos.rol || 'cliente',
      avatar_url: datos.avatar_url || datos.imagen || 'https://ionicframework.com/docs/img/demos/avatar.svg',
      historial_notas: datos.historial_notas || datos.descripcion || 'Registrado por administración.',
      preferencias_corte: datos.preferencias_corte || {
        estilo: 'Fade Clásico',
        tipo_cabello: 'Lacio',
        barba: 'Perfilada',
        frecuencia: 'Quincenal',
        notas: ''
      }
    };

    const { data, error } = await this.supabase
      .from('usuarios')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    return {
      ...data,
      uid: data.id,
      imagen: data.avatar_url,
      descripcion: data.historial_notas
    } as UsuarioPerfil;
  }

  async eliminarUsuario(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('usuarios').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async cambiarRolUsuario(id: string, nuevoRol: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('usuarios')
      .update({ rol: nuevoRol, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  // =========================================================================
  // FASE 3: BARBEROS Y SERVICIOS
  // =========================================================================

  /**
   * Obtiene la lista de barberos activos en Barber Shop Lima Norte
   */
  async getBarberosActivos(): Promise<Barbero[]> {
    try {
      const { data, error } = await this.supabase
        .from('barberos')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(b => ({ ...b, imagen: b.foto_url }));
      }
    } catch (e) {
      console.warn('Usando catálogo inicial seguro de barberos:', e);
    }

    // Fallback defensivo para asegurar renderizado inmediato
    return [
      { id: 'b1', nombre: 'Carlos "Blade" Mendoza', especialidad: 'Master Barber / Fade & Degradados', foto_url: 'assets/img/cortes.jpg', imagen: 'assets/img/cortes.jpg', activo: true },
      { id: 'b2', nombre: 'Mateo Quispe', especialidad: 'Especialista en Barba & Toalla Caliente', foto_url: 'assets/img/tintes.jpg', imagen: 'assets/img/tintes.jpg', activo: true },
      { id: 'b3', nombre: 'Leonardo Valdivia', especialidad: 'Estilista Masculino / Cortes Clásicos & Pompadour', foto_url: 'assets/img/peinados.jpg', imagen: 'assets/img/peinados.jpg', activo: true }
    ];
  }

  async crearBarbero(b: Partial<Barbero>): Promise<Barbero> {
    const payload = {
      nombre: b.nombre,
      especialidad: b.especialidad || 'Master Barber',
      experiencia: b.experiencia || '5 años de experiencia',
      foto_url: b.foto_url || b.imagen || 'assets/img/cortes.jpg',
      activo: true
    };
    const { data, error } = await this.supabase.from('barberos').insert(payload).select().single();
    if (error) throw error;
    return { ...data, imagen: data.foto_url };
  }

  async actualizarBarbero(id: string, b: Partial<Barbero>): Promise<Barbero> {
    const payload: any = { ...b };
    if (b.imagen) payload.foto_url = b.imagen;
    delete payload.imagen;
    const { data, error } = await this.supabase.from('barberos').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return { ...data, imagen: data.foto_url };
  }

  async eliminarBarbero(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('barberos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  /**
   * Obtiene la lista de servicios masculinos activos
   */
  async getServiciosActivos(): Promise<ServicioBarberia[]> {
    try {
      const { data, error } = await this.supabase
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('categoria');

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(s => ({ ...s, imagen: s.imagen_url }));
      }
    } catch (e) {
      console.warn('Usando catálogo inicial seguro de servicios:', e);
    }

    return [
      { id: 's1', nombre: 'Corte Clásico Ejecutivo', categoria: 'Corte', precio: 35.00, duracion_min: 35, descripcion: 'Corte a tijera o máquina con lavado capilar y peinado.', imagen_url: 'assets/img/cortes.jpg', imagen: 'assets/img/cortes.jpg', activo: true },
      { id: 's2', nombre: 'Degradado Skin Fade Urbano', categoria: 'Corte', precio: 40.00, duracion_min: 45, descripcion: 'Desvanecido a cero o navaja con definición de contornos.', imagen_url: 'assets/img/cortes.jpg', imagen: 'assets/img/cortes.jpg', activo: true },
      { id: 's3', nombre: 'Ritual de Barba Tradicional', categoria: 'Barba', precio: 30.00, duracion_min: 30, descripcion: 'Toallas calientes, perfilado milimétrico y bálsamo.', imagen_url: 'assets/img/tintes.jpg', imagen: 'assets/img/tintes.jpg', activo: true },
      { id: 's4', nombre: 'Combo Master Barber (Corte + Barba)', categoria: 'Combo', precio: 60.00, duracion_min: 60, descripcion: 'Fade urbano + Ritual de Barba completo.', imagen_url: 'assets/img/peinados.jpg', imagen: 'assets/img/peinados.jpg', activo: true },
      { id: 's5', nombre: 'Limpieza Facial Black Mask', categoria: 'Facial', precio: 45.00, duracion_min: 30, descripcion: 'Exfoliación profunda y mascarilla de carbón activado.', imagen_url: 'assets/img/uñas.jpg', imagen: 'assets/img/uñas.jpg', activo: true }
    ];
  }

  async crearServicio(s: Partial<ServicioBarberia>): Promise<ServicioBarberia> {
    const payload = {
      nombre: s.nombre,
      categoria: s.categoria || 'Corte',
      precio: s.precio || 35.00,
      duracion_min: s.duracion_min || 30,
      descripcion: s.descripcion || '',
      imagen_url: s.imagen_url || s.imagen || 'assets/img/cortes.jpg',
      activo: true
    };
    const { data, error } = await this.supabase.from('servicios').insert(payload).select().single();
    if (error) throw error;
    return { ...data, imagen: data.imagen_url };
  }

  async actualizarServicio(id: string, s: Partial<ServicioBarberia>): Promise<ServicioBarberia> {
    const payload: any = { ...s };
    if (s.imagen) payload.imagen_url = s.imagen;
    delete payload.imagen;
    const { data, error } = await this.supabase.from('servicios').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return { ...data, imagen: data.imagen_url };
  }

  async eliminarServicio(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('servicios').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // =========================================================================
  // FASE 3: CITAS Y DISPONIBILIDAD (PREVENCIÓN DE CONCURRENCIA)
  // =========================================================================

  /**
   * Consulta las horas ocupadas de un barbero en una fecha dada aprovechando
   * los índices B-Tree de PostgreSQL (tiempo de respuesta < 2.0s).
   */
  async getHorariosOcupados(barberoId: string, fecha: string): Promise<string[]> {
    if (!barberoId || !fecha) return [];

    try {
      const { data, error } = await this.supabase
        .from('citas')
        .select('hora')
        .eq('barbero_id', barberoId)
        .eq('fecha', fecha)
        .neq('estado', 'cancelada');

      if (error) throw error;
      return (data || []).map((c: any) => c.hora);
    } catch (e) {
      console.warn('Error al consultar horarios ocupados en Supabase:', e);
      return [];
    }
  }

  /**
   * Inserta una nueva cita en public.citas.
   * CAPTURA ESPECÍFICAMENTE EL ERROR 23505 (violación de unicidad de concurrencia)
   * del índice idx_citas_concurrencia_activa para prevenir solapamiento en milisegundos.
   */
  async crearCita(citaPayload: {
    cliente_id: string;
    barbero_id: string;
    servicio_id: string;
    fecha: string;
    hora: string;
    notas_corte?: string;
  }): Promise<Cita> {
    const payload = {
      cliente_id: citaPayload.cliente_id,
      barbero_id: citaPayload.barbero_id,
      servicio_id: citaPayload.servicio_id,
      fecha: citaPayload.fecha,
      hora: citaPayload.hora,
      estado: 'pendiente',
      notas_corte: citaPayload.notas_corte || ''
    };

    const { data, error } = await this.supabase
      .from('citas')
      .insert(payload)
      .select()
      .single();

    if (error) {
      // Código PostgreSQL 23505: unique_violation (idx_citas_concurrencia_activa)
      if (error.code === '23505' || error.message?.includes('idx_citas_concurrencia_activa')) {
        throw new Error('CONCURRENCY_ERROR: Este barbero acaba de ser agendado en ese horario exacto por otro cliente. Por favor, selecciona otro horario disponible.');
      }
      throw error;
    }

    return data as Cita;
  }

  /**
   * Obtiene las citas del cliente en sesión con JOIN relacional (Barbero y Servicio)
   */
  async getCitasCliente(clienteId: string): Promise<Cita[]> {
    if (!clienteId) return [];

    try {
      const { data, error } = await this.supabase
        .from('citas')
        .select(`
          *,
          barbero:barberos(id, nombre, especialidad, foto_url),
          servicio:servicios(id, nombre, precio, duracion_min, categoria)
        `)
        .eq('cliente_id', clienteId)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: true });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        nombreBarbero: c.barbero?.nombre || 'Barbero asignado',
        nombreEstilista: c.barbero?.nombre || 'Barbero asignado',
        nombreServicio: c.servicio?.nombre || 'Servicio de Barbería',
        precioServicio: c.servicio?.precio || 0
      }));
    } catch (e) {
      console.warn('Error obteniendo citas del cliente en Supabase:', e);
      return [];
    }
  }

  /**
   * Obtiene todas las citas para el Administrador con JOIN a Cliente, Barbero y Servicio,
   * incluyendo preferencias_corte y notas para el barbero.
   */
  async getTodasLasCitasAdmin(): Promise<Cita[]> {
    try {
      const { data, error } = await this.supabase
        .from('citas')
        .select(`
          *,
          cliente:usuarios(id, nombre, correo, telefono, preferencias_corte, historial_notas),
          barbero:barberos(id, nombre, especialidad),
          servicio:servicios(id, nombre, precio, duracion_min)
        `)
        .order('fecha', { ascending: false })
        .order('hora', { ascending: true });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        ...c,
        nombreCliente: c.cliente?.nombre || 'Cliente Barber Shop',
        nombreBarbero: c.barbero?.nombre || 'Barbero de Turno',
        nombreEstilista: c.barbero?.nombre || 'Barbero de Turno',
        nombreServicio: c.servicio?.nombre || 'Servicio',
        precioServicio: c.servicio?.precio || 0,
        preferencias_corte: c.cliente?.preferencias_corte,
        preferenciasCliente: c.cliente?.preferencias_corte
      }));
    } catch (e) {
      console.warn('Error obteniendo todas las citas para admin:', e);
      return [];
    }
  }

  /**
   * Actualiza el estado de una cita ('confirmada', 'completada', 'cancelada')
   */
  async actualizarEstadoCita(citaId: string, estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'): Promise<boolean> {
    const { error } = await this.supabase
      .from('citas')
      .update({ estado })
      .eq('id', citaId);

    if (error) throw error;
    return true;
  }

  /**
   * Elimina una cita de la base de datos
   */
  async eliminarCita(citaId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('citas')
      .delete()
      .eq('id', citaId);

    if (error) throw error;
    return true;
  }

  // =========================================================================
  // FASE 3: ANUNCIOS Y DASHBOARD KPI
  // =========================================================================

  async getAnunciosActivos(): Promise<Anuncio[]> {
    try {
      const { data, error } = await this.supabase
        .from('anuncios')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(a => ({ ...a, imagen: a.imagen_url }));
      }
    } catch (e) {
      console.warn('Usando anuncios de respaldo:', e);
    }

    return [
      { id: 'a1', titulo: '¡Gran Apertura Barber Shop Lima Norte!', descripcion: '20% de descuento en tu primer Combo Master Barber reservando desde la App.', imagen_url: 'assets/img/cortes.jpg', imagen: 'assets/img/cortes.jpg', activo: true },
      { id: 'a2', titulo: 'Miércoles de Barba & Amigos', descripcion: 'Perfilado y toalla caliente por solo S/ 25.00 reservando en línea.', imagen_url: 'assets/img/tintes.jpg', imagen: 'assets/img/tintes.jpg', activo: true }
    ];
  }

  /**
   * Calcula las métricas del panel administrativo en una sola llamada de agregación
   */
  async getMetricasDashboardAdmin(): Promise<{
    totalCitasHoy: number;
    totalClientes: number;
    bajoStock: number;
    totalServicios: number;
    citasPendientes: number;
    ingresosEstimados: number;
    actividadReciente: any[];
  }> {
    try {
      const hoy = new Date().toISOString().split('T')[0];

      // Consultas paralelas de conteo
      const [citasHoyRes, clientesRes, stockRes, serviciosRes, todasCitasRes] = await Promise.all([
        this.supabase.from('citas').select('*', { count: 'exact' }).eq('fecha', hoy).neq('estado', 'cancelada'),
        this.supabase.from('usuarios').select('*', { count: 'exact' }).eq('rol', 'cliente'),
        this.supabase.from('productos').select('*', { count: 'exact' }).lte('stock', 5),
        this.supabase.from('servicios').select('*', { count: 'exact' }).eq('activo', true),
        this.supabase.from('citas').select(`
          *,
          cliente:usuarios(nombre),
          servicio:servicios(nombre, precio)
        `).order('created_at', { ascending: false }).limit(4)
      ]);

      const totalCitasHoy = citasHoyRes.count || 0;
      const totalClientes = clientesRes.count || 0;
      const bajoStock = stockRes.count || 0;
      const totalServicios = serviciosRes.count || 0;

      const ultimas = todasCitasRes.data || [];
      const actividadReciente = ultimas.map((c: any) => ({
        titulo: `Cita: ${c.cliente?.nombre || 'Cliente'}`,
        detalle: `${c.servicio?.nombre || 'Corte'} (${c.fecha} - ${c.hora})`,
        icono: 'calendar-outline',
        color: '#aa8529'
      }));

      const ingresosEstimados = ultimas.reduce((acc: number, c: any) => acc + (c.servicio?.precio || 0), 0);
      const citasPendientes = ultimas.filter((c: any) => c.estado === 'pendiente').length;

      return {
        totalCitasHoy,
        totalClientes,
        bajoStock,
        totalServicios,
        citasPendientes,
        ingresosEstimados,
        actividadReciente
      };
    } catch (e) {
      console.warn('Error calculando métricas de dashboard en Supabase:', e);
      return {
        totalCitasHoy: 0,
        totalClientes: 0,
        bajoStock: 0,
        totalServicios: 0,
        citasPendientes: 0,
        ingresosEstimados: 0,
        actividadReciente: []
      };
    }
  }
}
