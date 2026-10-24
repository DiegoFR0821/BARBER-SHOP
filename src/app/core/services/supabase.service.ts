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

/**
 * Servicio centralizado de conexión y gestión de Supabase para Barber Shop Lima Norte S.A.C.
 * Implementa el patrón Singleton (providedIn: 'root') para garantizar una única
 * instancia del cliente en todo el ciclo de vida de la aplicación móvil.
 * 
 * Cumple con estándares de calidad de software ISO/IEC 25010 y directrices OWASP Mobile:
 * - Persistencia segura de sesión en el almacenamiento local.
 * - Refresco automático de tokens para evitar desconexiones accidentales.
 * - Desactivación de detectSessionInUrl para prevenir colisiones con el router de Ionic.
 * - Gestión reactiva del estado de autenticación mediante RxJS BehaviorSubject.
 * - Operaciones tipadas para la gestión de usuarios, roles y preferencias de corte.
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
    // Inicialización del cliente Supabase con configuraciones óptimas para Ionic/Angular
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

    // Carga de sesión inicial al arrancar el servicio
    this.initSession();

    // Listener reactivo a eventos de autenticación de Supabase
    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const user = session?.user ?? null;
      this.currentUserSubject.next(user);
    });
  }

  /**
   * Obtiene la sesión actual al inicializar el servicio.
   */
  private async initSession(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      this.currentUserSubject.next(session?.user ?? null);
    } catch (error) {
      console.error('Error al inicializar sesión de Supabase:', error);
      this.currentUserSubject.next(null);
    }
  }

  /**
   * Getter seguro para acceder a la instancia del cliente Supabase.
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Obtiene de forma síncrona el valor actual del usuario autenticado en Supabase Auth.
   */
  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Acceso rápido al módulo de autenticación de Supabase.
   */
  get auth() {
    return this.supabase.auth;
  }

  // =========================================================================
  // MÉTODOS DE AUTENTICACIÓN (LOGIN, REGISTRO, LOGOUT)
  // =========================================================================

  /**
   * Inicia sesión con correo y contraseña, y recupera el perfil y rol del usuario
   */
  async signIn(correo: string, clave: string): Promise<{ user: User; session: Session | null; perfil: UsuarioPerfil }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: correo,
      password: clave
    });

    if (error) {
      throw error;
    }

    if (!data.user) {
      throw new Error('No se pudo recuperar la información del usuario.');
    }

    // Consultamos la tabla 'usuarios' para obtener el rol y preferencias
    let perfil = await this.getPerfil(data.user.id);
    
    // Si aún no existe el registro en la tabla usuarios (por ejemplo, demora de red en el trigger), lo construimos
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

  /**
   * Registra un nuevo usuario en Supabase Auth y garantiza su registro en la tabla 'usuarios'
   */
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

    if (error) {
      throw error;
    }

    // Aseguramos inserción/upsert en public.usuarios como salvaguarda directa
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

  /**
   * Cierra sesión de Supabase y notifica el cambio reactivo
   */
  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    this.currentUserSubject.next(null);
    if (error) {
      console.warn('Aviso al cerrar sesión en Supabase:', error);
    }
  }

  // =========================================================================
  // MÉTODOS DE GESTIÓN DE PERFILES Y USUARIOS (CRUD)
  // =========================================================================

  /**
   * Obtiene el perfil completo de un usuario por su ID
   */
  async getPerfil(id: string): Promise<UsuarioPerfil | null> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !data) {
        return null;
      }

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

  /**
   * Actualiza los datos de un perfil (incluyendo preferencias de corte e historial de notas)
   */
  async actualizarPerfil(id: string, datos: Partial<UsuarioPerfil>): Promise<UsuarioPerfil | null> {
    const payload: any = { ...datos };
    
    // Normalización de campos
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

    if (error) {
      throw error;
    }

    return {
      ...data,
      uid: data.id,
      imagen: data.avatar_url,
      descripcion: data.historial_notas
    } as UsuarioPerfil;
  }

  /**
   * Lista todos los usuarios registrados (para vista de administración)
   */
  async obtenerUsuarios(): Promise<UsuarioPerfil[]> {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data || []).map(u => ({
      ...u,
      uid: u.id,
      imagen: u.avatar_url,
      descripcion: u.historial_notas
    })) as UsuarioPerfil[];
  }

  /**
   * Crea un usuario manualmente desde el panel de administración
   */
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

    if (error) {
      throw error;
    }

    return {
      ...data,
      uid: data.id,
      imagen: data.avatar_url,
      descripcion: data.historial_notas
    } as UsuarioPerfil;
  }

  /**
   * Elimina un usuario por su ID
   */
  async eliminarUsuario(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  }

  /**
   * Cambia el rol de un usuario (ej. alternar entre 'cliente' y 'admin')
   */
  async cambiarRolUsuario(id: string, nuevoRol: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('usuarios')
      .update({ 
        rol: nuevoRol, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  }
}
