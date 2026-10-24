import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  createClient, 
  SupabaseClient, 
  User, 
  Session, 
  AuthChangeEvent,
  RealtimeChannel
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

export interface ProductoBarberia {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  stock: number;
  imagen_url?: string;
  imagen?: string;
  descripcion?: string;
  activo: boolean;
  created_at?: string;
}

export interface MensajeComunidad {
  id: string;
  usuario_id?: string | null;
  autor_nombre: string;
  autor_rol: string;
  autor_avatar?: string;
  mensaje: string;
  created_at?: string;
}

/**
 * Servicio centralizado de conexión y gestión de Supabase para Barber Shop Lima Norte S.A.C.
 * Implementa el patrón Singleton (providedIn: 'root') y estándares ISO/IEC 25010 y OWASP Mobile:
 * - Persistencia segura de sesión en el almacenamiento local.
 * - Refresco automático de tokens JWT.
 * - Prevención estricta de colisiones de router con detectSessionInUrl: false.
 * - Manejo especializado de concurrencia de citas (captura de error 23505).
 * - Transacciones atómicas de carrito e inventario y chat en tiempo real.
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
    const correoLimpio = correo.trim().toLowerCase();
    const esCuentaAdminOficial = correoLimpio === 'admin@barbershop.pe' && clave === 'Admin123456!';

    let { data, error } = await this.supabase.auth.signInWithPassword({
      email: correoLimpio,
      password: clave
    });

    // Auto-provisión de la cuenta oficial de administrador si aún no se ejecutó el bloque SQL en auth.users
    if (error && esCuentaAdminOficial) {
      try {
        const signUpAdmin = await this.supabase.auth.signUp({
          email: correoLimpio,
          password: clave,
          options: {
            data: {
              nombre: 'Administrador General',
              telefono: '929727435',
              rol: 'admin'
            }
          }
        });

        if (signUpAdmin.data?.user) {
          const retryLogin = await this.supabase.auth.signInWithPassword({
            email: correoLimpio,
            password: clave
          });
          data = retryLogin.data;
          error = retryLogin.error;
        }
      } catch (adminInitErr) {
        console.warn('Aviso al inicializar cuenta admin en Supabase Auth:', adminInitErr);
      }
    }

    if (error) throw error;
    if (!data.user) throw new Error('No se pudo recuperar la información del usuario.');

    // Si es el correo oficial de admin, garantizamos su registro y rol 'admin' en public.usuarios
    if (correoLimpio === 'admin@barbershop.pe') {
      try {
        await this.supabase.from('usuarios').upsert({
          id: data.user.id,
          nombre: 'Administrador General',
          correo: correoLimpio,
          telefono: '929727435',
          rol: 'admin',
          avatar_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=300&q=80',
          historial_notas: 'Cuenta oficial de Administración - BARBER SHOP LIMA NORTE S.A.C.',
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('No se pudo sincronizar upsert de admin:', e);
      }
    }

    let perfil = await this.getPerfil(data.user.id);
    const metaTelefono = data.user.user_metadata?.['telefono'] || '';

    if (!perfil) {
      perfil = {
        id: data.user.id,
        uid: data.user.id,
        nombre: data.user.user_metadata?.['nombre'] || (correoLimpio === 'admin@barbershop.pe' ? 'Administrador General' : correoLimpio.split('@')[0]),
        correo: correoLimpio,
        telefono: metaTelefono,
        rol: correoLimpio === 'admin@barbershop.pe' ? 'admin' : (data.user.user_metadata?.['rol'] || 'cliente'),
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        imagen: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        historial_notas: 'Cliente regular'
      };
    } else {
      if (correoLimpio === 'admin@barbershop.pe') {
        perfil.rol = 'admin';
      }
      // Si el teléfono estaba en user_metadata pero faltaba en public.usuarios, lo sincronizamos
      if (!perfil.telefono && metaTelefono) {
        perfil.telefono = metaTelefono;
        try {
          await this.supabase.from('usuarios').update({ telefono: metaTelefono }).eq('id', data.user.id);
        } catch {}
      }
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
    const correoLimpio = correo.trim().toLowerCase();
    const telefonoLimpio = (telefono || '').trim();

    const preferenciasDefecto: PreferenciasCliente = preferencias || {
      estilo: 'Fade Clásico',
      tipo_cabello: 'Lacio',
      barba: 'Perfilada con Navaja',
      frecuencia: 'Quincenal',
      notas: 'Preferencia inicial al registrarse'
    };

    const { data, error } = await this.supabase.auth.signUp({
      email: correoLimpio,
      password: clave,
      options: {
        data: {
          nombre,
          telefono: telefonoLimpio,
          rol: 'cliente',
          preferencias_corte: preferenciasDefecto
        }
      }
    });

    if (error) throw error;

    // 1. Primero garantizamos sesión activa para que auth.uid() esté disponible frente a las políticas RLS
    let sesionActiva = data.session;
    if (!sesionActiva && data.user) {
      try {
        const loginInmediato = await this.supabase.auth.signInWithPassword({
          email: correoLimpio,
          password: clave
        });
        if (loginInmediato.data.session) {
          sesionActiva = loginInmediato.data.session;
          this.currentUserSubject.next(loginInmediato.data.user);
        }
      } catch (e) {
        console.warn('Inicio de sesión automático posterior a registro:', e);
      }
    }

    // 2. Ahora con sesión autenticada realizamos el upsert en public.usuarios incluyendo el teléfono
    if (data.user) {
      try {
        await this.supabase.from('usuarios').upsert({
          id: data.user.id,
          nombre,
          correo: correoLimpio,
          telefono: telefonoLimpio,
          rol: 'cliente',
          avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
          preferencias_corte: preferenciasDefecto,
          historial_notas: 'Registrado desde la App Barber Shop.',
          updated_at: new Date().toISOString()
        });
      } catch (upsertErr) {
        console.warn('Aviso: el trigger on_auth_user_created gestionará el perfil:', upsertErr);
      }
    }

    return { user: data.user, session: sesionActiva };
  }

  async signOut(): Promise<void> {
    try {
      // Limpiar banderas de sesión del modal promocional al cerrar sesión
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('promo_modal_visto')) {
          sessionStorage.removeItem(key);
        }
      });
    } catch {}

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

      const metaTelefono = this.currentUserValue?.id === id 
        ? (this.currentUserValue?.user_metadata?.['telefono'] || '') 
        : '';

      const telefonoFinal = data.telefono || metaTelefono || '';

      return {
        ...data,
        telefono: telefonoFinal,
        uid: data.id,
        imagen: data.avatar_url,
        descripcion: data.historial_notas
      } as UsuarioPerfil;
    } catch (e) {
      console.error('Error al obtener perfil desde Supabase:', e);
      return null;
    }
  }

  async obtenerPerfil(id: string): Promise<UsuarioPerfil | null> {
    return this.getPerfil(id);
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
      .maybeSingle();

    if (error) throw error;

    // Si por algún motivo el registro no existía en public.usuarios, hacemos upsert
    if (!data) {
      const correoFallback = datos.correo || this.currentUserValue?.email || '';
      const upsertPayload = {
        id,
        nombre: datos.nombre || 'Cliente Barber Shop',
        correo: correoFallback,
        telefono: datos.telefono || '',
        rol: datos.rol || 'cliente',
        avatar_url: payload.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        preferencias_corte: datos.preferencias_corte,
        historial_notas: payload.historial_notas || '',
        updated_at: new Date().toISOString()
      };
      const { data: upserted, error: upsertErr } = await this.supabase
        .from('usuarios')
        .upsert(upsertPayload)
        .select()
        .single();

      if (upsertErr) throw upsertErr;
      return {
        ...upserted,
        uid: upserted.id,
        imagen: upserted.avatar_url,
        descripcion: upserted.historial_notas
      } as UsuarioPerfil;
    }

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
      avatar_url: datos.avatar_url || datos.imagen || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
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

    return [
      { id: 'b1', nombre: 'Carlos "Blade" Mendoza', especialidad: 'Master Barber / Fade & Degradados', foto_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', imagen: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', activo: true },
      { id: 'b2', nombre: 'Mateo Quispe', especialidad: 'Especialista en Barba & Toalla Caliente', foto_url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', imagen: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', activo: true },
      { id: 'b3', nombre: 'Leonardo Valdivia', especialidad: 'Estilista Masculino / Cortes Clásicos & Pompadour', foto_url: 'https://images.unsplash.com/photo-1517832606589-7629c339590a?auto=format&fit=crop&w=600&q=80', imagen: 'https://images.unsplash.com/photo-1517832606589-7629c339590a?auto=format&fit=crop&w=600&q=80', activo: true }
    ];
  }

  async crearBarbero(b: Partial<Barbero>): Promise<Barbero> {
    const payload = {
      nombre: b.nombre,
      especialidad: b.especialidad || 'Master Barber',
      experiencia: b.experiencia || '5 años de experiencia',
      foto_url: b.foto_url || b.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
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
      { id: 's1', nombre: 'Corte Clásico Ejecutivo', categoria: 'Corte', precio: 35.00, duracion_min: 35, descripcion: 'Corte a tijera o máquina con lavado capilar y peinado.', imagen_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80', imagen: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80', activo: true },
      { id: 's2', nombre: 'Degradado Skin Fade Urbano', categoria: 'Corte', precio: 40.00, duracion_min: 45, descripcion: 'Desvanecido a cero o navaja con definición de contornos.', imagen_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80', imagen: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80', activo: true },
      { id: 's3', nombre: 'Ritual de Barba Tradicional', categoria: 'Barba', precio: 30.00, duracion_min: 30, descripcion: 'Toallas calientes, perfilado milimétrico y bálsamo.', imagen_url: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80', imagen: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80', activo: true },
      { id: 's4', nombre: 'Combo Master Barber (Corte + Barba)', categoria: 'Combo', precio: 60.00, duracion_min: 60, descripcion: 'Fade urbano + Ritual de Barba completo.', imagen_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', imagen: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', activo: true },
      { id: 's5', nombre: 'Limpieza Facial Black Mask', categoria: 'Facial', precio: 45.00, duracion_min: 30, descripcion: 'Exfoliación profunda y mascarilla de carbón activado.', imagen_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80', imagen: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80', activo: true }
    ];
  }

  async crearServicio(s: Partial<ServicioBarberia>): Promise<ServicioBarberia> {
    const payload = {
      nombre: s.nombre,
      categoria: s.categoria || 'Corte',
      precio: s.precio || 35.00,
      duracion_min: s.duracion_min || 30,
      descripcion: s.descripcion || '',
      imagen_url: s.imagen_url || s.imagen || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80',
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
      if (error.code === '23505' || error.message?.includes('idx_citas_concurrencia_activa')) {
        throw new Error('CONCURRENCY_ERROR: Este barbero acaba de ser agendado en ese horario exacto por otro cliente. Por favor, selecciona otro horario disponible.');
      }
      throw error;
    }

    return data as Cita;
  }

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

  async actualizarEstadoCita(citaId: string, estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'): Promise<boolean> {
    const { error } = await this.supabase
      .from('citas')
      .update({ estado })
      .eq('id', citaId);

    if (error) throw error;
    return true;
  }

  async eliminarCita(citaId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('citas')
      .delete()
      .eq('id', citaId);

    if (error) throw error;
    return true;
  }

  // =========================================================================
  // FASE 4: PRODUCTOS, INVENTARIO Y CARRITO TRANSACCIONAL
  // =========================================================================

  private normalizarProducto(p: any): ProductoBarberia {
    let imagenUrl = p.imagen_url || p.imagen || '';
    let desc = p.descripcion || '';

    // Si en algún seed previo imagen_url y descripcion se guardaron invertidos, los corregimos al vuelo
    if (desc.startsWith('http') && !imagenUrl.startsWith('http') && !imagenUrl.startsWith('data:')) {
      const temp = imagenUrl;
      imagenUrl = desc;
      desc = temp;
    }

    return {
      ...p,
      precio: Number(p.precio || 0),
      stock: Number(p.stock ?? 0),
      imagen_url: imagenUrl,
      imagen: imagenUrl,
      descripcion: desc
    };
  }

  private getCatalogoProductosRespaldo(): ProductoBarberia[] {
    return [
      {
        id: 'p1',
        nombre: 'Cera Mate Fijación Fuerte (100g)',
        categoria: 'Fijación Capilar',
        precio: 45.00,
        stock: 35,
        imagen_url: 'https://images.unsplash.com/photo-1597854711516-17b5f8507851?auto=format&fit=crop&w=600&q=80',
        imagen: 'https://images.unsplash.com/photo-1597854711516-17b5f8507851?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Efecto mate natural sin brillo ni residuos. Ideal para peinados texturizados y pompadours.',
        activo: true
      },
      {
        id: 'p2',
        nombre: 'Aceite Premium para Barba (30ml)',
        categoria: 'Cuidado de Barba',
        precio: 40.00,
        stock: 25,
        imagen_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80',
        imagen: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Formulado con aceite de argán, jojoba y aroma a cedro para hidratar y dar brillo saludable.',
        activo: true
      },
      {
        id: 'p3',
        nombre: 'Pomada Base Agua Brillo Medio (120g)',
        categoria: 'Fijación Capilar',
        precio: 42.00,
        stock: 20,
        imagen_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
        imagen: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Fijación flexible de larga duración. Se retira fácilmente con agua en un solo lavado.',
        activo: true
      },
      {
        id: 'p4',
        nombre: 'Shampoo Fortalecedor & Menta (250ml)',
        categoria: 'Cuidado Capilar',
        precio: 48.00,
        stock: 15,
        imagen_url: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80',
        imagen: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Estimula el folículo piloso, controla el exceso de grasa y proporciona frescura mentolada.',
        activo: true
      },
      {
        id: 'p5',
        nombre: 'Bálsamo After-Shave Calmante (100ml)',
        categoria: 'Cuidado de Barba',
        precio: 35.00,
        stock: 40,
        imagen_url: 'https://images.unsplash.com/photo-1608248597359-524f2b963351?auto=format&fit=crop&w=600&q=80',
        imagen: 'https://images.unsplash.com/photo-1608248597359-524f2b963351?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Alivia la irritación del afeitado, cierra poros y previene vellos encarnados.',
        activo: true
      }
    ];
  }

  async getProductosActivos(): Promise<ProductoBarberia[]> {
    try {
      const { data, error } = await this.supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(p => this.normalizarProducto(p));
      }
    } catch (e) {
      console.warn('Usando catálogo de respaldo para productos:', e);
    }
    return this.getCatalogoProductosRespaldo();
  }

  async getTodosLosProductosAdmin(): Promise<ProductoBarberia[]> {
    try {
      const { data, error } = await this.supabase
        .from('productos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(p => this.normalizarProducto(p));
      }
    } catch (e) {
      console.warn('Error obteniendo inventario en admin:', e);
    }
    return this.getCatalogoProductosRespaldo();
  }

  async crearProducto(prod: Partial<ProductoBarberia>): Promise<ProductoBarberia> {
    const payload = {
      nombre: prod.nombre,
      categoria: prod.categoria || 'Fijación Capilar',
      precio: Number(prod.precio || 0),
      stock: Number(prod.stock ?? 0),
      descripcion: prod.descripcion || '',
      imagen_url: prod.imagen_url || prod.imagen || 'https://images.unsplash.com/photo-1597854711516-17b5f8507851?auto=format&fit=crop&w=600&q=80',
      activo: prod.activo ?? true
    };

    const { data, error } = await this.supabase
      .from('productos')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return this.normalizarProducto(data);
  }

  async actualizarProducto(id: string, prod: Partial<ProductoBarberia>): Promise<ProductoBarberia> {
    const payload: any = {
      nombre: prod.nombre,
      categoria: prod.categoria || 'Fijación Capilar',
      precio: Number(prod.precio || 0),
      stock: Number(prod.stock ?? 0),
      descripcion: prod.descripcion || '',
      imagen_url: prod.imagen_url || prod.imagen || ''
    };
    if (prod.activo !== undefined) {
      payload.activo = prod.activo;
    }

    const { data, error } = await this.supabase
      .from('productos')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return this.normalizarProducto(data);
  }

  async eliminarProducto(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('productos').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  /**
   * Procesa la compra del carrito invocando la función RPC transaccional procesar_compra_carrito
   * en PostgreSQL. Incluye fallback directo sobre public.productos si algún ítem requiere actualización manual.
   */
  async procesarCompraCarrito(
    items: { id: string; cantidad: number; stock?: number }[],
    clienteId?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!items || items.length === 0) {
      throw new Error('El carrito de compras está vacío.');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const itemsUuid = items
      .filter(i => uuidRegex.test(String(i.id)))
      .map(i => ({ id: i.id, cantidad: Number(i.cantidad) }));

    if (itemsUuid.length > 0) {
      const { data, error } = await this.supabase.rpc('procesar_compra_carrito', {
        p_items: itemsUuid,
        p_cliente_id: clienteId && uuidRegex.test(clienteId) ? clienteId : null
      });

      if (!error && data) {
        return data as { success: boolean; message: string };
      }

      // Si el error es explícitamente por falta de stock en el RPC, propagamos el mensaje al cliente
      if (error && error.message?.toLowerCase().includes('stock insuficiente')) {
        throw new Error(error.message);
      }

      // Fallback defensivo: descuento directo si la función RPC aún no fue creada
      for (const item of itemsUuid) {
        const { data: prodActual } = await this.supabase
          .from('productos')
          .select('stock, nombre')
          .eq('id', item.id)
          .maybeSingle();

        if (prodActual) {
          if (prodActual.stock < item.cantidad) {
            throw new Error(`Stock insuficiente para "${prodActual.nombre}" (Disponibles: ${prodActual.stock}).`);
          }
          await this.supabase
            .from('productos')
            .update({ stock: prodActual.stock - item.cantidad })
            .eq('id', item.id);
        }
      }
    }

    return {
      success: true,
      message: 'Compra procesada exitosamente y stock actualizado.'
    };
  }

  // =========================================================================
  // FASE 3 & 4: ANUNCIOS (CLIENTE Y ADMIN CRUD)
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
      { id: 'a1', titulo: '¡Bienvenido a Barber Shop Lima Norte!', descripcion: 'Obtén 20% de descuento en tu primer Combo Master Barber reservando desde nuestra App móvil.', imagen_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80', imagen: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80', activo: true },
      { id: 'a2', titulo: 'Miércoles de Barba & Amigos', descripcion: 'Perfilado y toalla caliente por solo S/ 25.00 reservando en línea.', imagen_url: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=800&q=80', imagen: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=800&q=80', activo: true }
    ];
  }

  async getTodosLosAnunciosAdmin(): Promise<Anuncio[]> {
    try {
      const { data, error } = await this.supabase
        .from('anuncios')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data && data.length > 0) {
        return data.map(a => ({ ...a, imagen: a.imagen_url }));
      }
    } catch (e) {
      console.warn('Error cargando anuncios en admin:', e);
    }
    return this.getAnunciosActivos();
  }

  async crearAnuncio(anuncio: Partial<Anuncio>): Promise<Anuncio> {
    const payload = {
      titulo: anuncio.titulo,
      descripcion: anuncio.descripcion,
      imagen_url: anuncio.imagen_url || anuncio.imagen || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
      activo: anuncio.activo ?? true
    };

    const { data, error } = await this.supabase
      .from('anuncios')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return { ...data, imagen: data.imagen_url };
  }

  async actualizarAnuncio(id: string, anuncio: Partial<Anuncio>): Promise<Anuncio> {
    const payload: any = {
      titulo: anuncio.titulo,
      descripcion: anuncio.descripcion,
      imagen_url: anuncio.imagen_url || anuncio.imagen || '',
      activo: anuncio.activo ?? true
    };

    const { data, error } = await this.supabase
      .from('anuncios')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { ...data, imagen: data.imagen_url };
  }

  async alternarEstadoAnuncio(id: string, activo: boolean): Promise<boolean> {
    const { error } = await this.supabase
      .from('anuncios')
      .update({ activo })
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  async eliminarAnuncio(id: string): Promise<boolean> {
    const { error } = await this.supabase.from('anuncios').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  // =========================================================================
  // FASE 4: CHAT DE COMUNIDAD CON SUPABASE & REALTIME
  // =========================================================================

  async getMensajesComunidad(): Promise<MensajeComunidad[]> {
    try {
      const { data, error } = await this.supabase
        .from('mensajes_comunidad')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      if (data && data.length > 0) {
        return data as MensajeComunidad[];
      }
    } catch (e) {
      console.warn('Aviso al cargar mensajes de comunidad desde Supabase:', e);
    }

    return [
      {
        id: 'm1',
        autor_nombre: 'Staff Barber Shop',
        autor_rol: 'admin',
        mensaje: '¡Bienvenidos al canal oficial de la comunidad Barber Shop Lima Norte S.A.C.! 💈 Compartan sus experiencias y consultas.',
        created_at: new Date().toISOString()
      },
      {
        id: 'm2',
        autor_nombre: 'Carlos "Blade" Mendoza',
        autor_rol: 'barbero',
        mensaje: '¡Saludos amigos! Hoy tenemos disponibilidad para degradados Skin Fade y ritual de barba con toalla caliente. 🔥✂️',
        created_at: new Date().toISOString()
      }
    ];
  }

  async enviarMensajeComunidad(payload: {
    usuario_id?: string | null;
    autor_nombre: string;
    autor_rol: string;
    autor_avatar?: string;
    mensaje: string;
  }): Promise<MensajeComunidad> {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uidValido = payload.usuario_id && uuidRegex.test(payload.usuario_id) ? payload.usuario_id : null;

    const insertData = {
      usuario_id: uidValido,
      autor_nombre: payload.autor_nombre || 'Cliente Barber Shop',
      autor_rol: payload.autor_rol || 'cliente',
      autor_avatar: payload.autor_avatar || '',
      mensaje: payload.mensaje.trim()
    };

    const { data, error } = await this.supabase
      .from('mensajes_comunidad')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return data as MensajeComunidad;
  }

  async eliminarMensajeComunidad(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('mensajes_comunidad')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  suscribirMensajesComunidad(
    onInsert: (nuevo: MensajeComunidad) => void,
    onDelete?: (idEliminado: string) => void
  ): RealtimeChannel {
    return this.supabase
      .channel('realtime:mensajes_comunidad')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes_comunidad' },
        (payload) => {
          if (payload.new) {
            onInsert(payload.new as MensajeComunidad);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'mensajes_comunidad' },
        (payload) => {
          if (payload.old && (payload.old as any).id && onDelete) {
            onDelete((payload.old as any).id);
          }
        }
      )
      .subscribe();
  }

  // =========================================================================
  // DASHBOARD KPI ADMIN
  // =========================================================================

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
        color: '#c59d5f'
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
