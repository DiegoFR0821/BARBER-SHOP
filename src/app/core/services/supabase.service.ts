import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
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
  imagen?: string;
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
  imagen?: string;
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
  nombreEstilista?: string;
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

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  private supabase: SupabaseClient;
  private currentUserSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  /** Emite eventos reactivos cada vez que cambia una tabla operativa (citas, usuarios, productos, anuncios) */
  private datosActualizadosSubject = new Subject<string>();
  public datosActualizados$: Observable<string> = this.datosActualizadosSubject.asObservable();

  private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          storage: localStorage
        }
      }
    );

    this.initSession();

    this.supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const user = session?.user ?? null;
      this.currentUserSubject.next(user);
      if (user) {
        this.asegurarUsuarioEnTabla(user.id, {
          nombre: user.user_metadata?.['nombre'] || user.email?.split('@')[0] || 'Cliente Barber Shop',
          correo: user.email || '',
          telefono: user.user_metadata?.['telefono'] || '',
          rol: user.email === 'admin@barbershop.pe' ? 'admin' : (user.user_metadata?.['rol'] || 'cliente'),
          preferencias_corte: user.user_metadata?.['preferencias_corte']
        }).catch(() => {});
      }
    });
  }

  private async initSession(): Promise<void> {
    try {
      const { data: { session } } = await this.supabase.auth.getSession();
      const user = session?.user ?? null;
      this.currentUserSubject.next(user);
      if (user) {
        await this.asegurarUsuarioEnTabla(user.id, {
          nombre: user.user_metadata?.['nombre'] || user.email?.split('@')[0] || 'Cliente Barber Shop',
          correo: user.email || '',
          telefono: user.user_metadata?.['telefono'] || '',
          rol: user.email === 'admin@barbershop.pe' ? 'admin' : (user.user_metadata?.['rol'] || 'cliente')
        });
      }
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

  public notificarCambioDatos(tabla: string) {
    this.datosActualizadosSubject.next(tabla);
  }

  /**
   * Utilidad para comprimir cualquier archivo de imagen en un <canvas> HTML5
   * a máximo 400x400px en formato JPEG calidad 0.7 para guardado instantáneo en Supabase.
   */
  public comprimirImagenArchivo(file: File, maxW = 400, maxH = 400, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
      reader.onload = (e: any) => {
        const img = new Image();
        img.onerror = () => resolve(e.target.result as string);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxW) {
              height = Math.round((height * maxW) / width);
              width = maxW;
            }
          } else {
            if (height > maxH) {
              width = Math.round((width * maxH) / height);
              height = maxH;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } else {
            resolve(e.target.result as string);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // SINCRONIZACIÓN DE USUARIOS Y CACHÉ DE RESPALDO
  // =========================================================================

  private guardarUsuarioEnCacheLocal(perfil: UsuarioPerfil) {
    try {
      const raw = localStorage.getItem('barber_usuarios_sync');
      const lista: UsuarioPerfil[] = raw ? JSON.parse(raw) : [];
      const idx = lista.findIndex(u => (u.id && u.id === perfil.id) || (u.correo && u.correo.toLowerCase() === perfil.correo?.toLowerCase()));
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], ...perfil };
      } else {
        lista.unshift(perfil);
      }
      localStorage.setItem('barber_usuarios_sync', JSON.stringify(lista));
    } catch {}
  }

  private obtenerUsuariosDeCacheLocal(): UsuarioPerfil[] {
    try {
      const raw = localStorage.getItem('barber_usuarios_sync');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Garantiza que un usuario autenticado exista en public.usuarios antes de crear citas
   * o consultar la lista de clientes desde el panel administrador.
   */
  async asegurarUsuarioEnTabla(id: string, datos?: Partial<UsuarioPerfil>): Promise<UsuarioPerfil> {
    const correoLimpio = (datos?.correo || this.currentUserValue?.email || 'cliente@barbershop.pe').trim().toLowerCase();
    const esAdmin = correoLimpio === 'admin@barbershop.pe' || datos?.rol === 'admin';
    const nombreLimpio = datos?.nombre || this.currentUserValue?.user_metadata?.['nombre'] || (esAdmin ? 'Administrador General' : correoLimpio.split('@')[0]);
    const telefonoLimpio = datos?.telefono || this.currentUserValue?.user_metadata?.['telefono'] || (esAdmin ? '929727435' : '');

    const preferenciasDefecto: PreferenciasCliente = datos?.preferencias_corte || {
      estilo: 'Fade Clásico',
      tipo_cabello: 'Lacio',
      barba: 'Perfilada con Navaja',
      frecuencia: 'Quincenal',
      notas: 'Cliente registrado en Barber Shop Lima Norte'
    };

    const perfilBase: UsuarioPerfil = {
      id,
      uid: id,
      nombre: nombreLimpio,
      correo: correoLimpio,
      telefono: telefonoLimpio,
      rol: esAdmin ? 'admin' : (datos?.rol || 'cliente'),
      avatar_url: datos?.avatar_url || datos?.imagen || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      imagen: datos?.avatar_url || datos?.imagen || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      preferencias_corte: preferenciasDefecto,
      historial_notas: datos?.historial_notas || datos?.descripcion || 'Cliente registrado en Barber Shop Lima Norte.'
    };

    this.guardarUsuarioEnCacheLocal(perfilBase);

    if (this.UUID_REGEX.test(id)) {
      try {
        const { data: existente } = await this.supabase
          .from('usuarios')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!existente) {
          const { data: insertado } = await this.supabase
            .from('usuarios')
            .upsert({
              id,
              nombre: perfilBase.nombre,
              correo: perfilBase.correo,
              telefono: perfilBase.telefono,
              rol: perfilBase.rol,
              avatar_url: perfilBase.avatar_url,
              preferencias_corte: perfilBase.preferencias_corte,
              historial_notas: perfilBase.historial_notas,
              updated_at: new Date().toISOString()
            })
            .select()
            .maybeSingle();

          if (insertado) {
            const completo = { ...insertado, uid: insertado.id, imagen: insertado.avatar_url, descripcion: insertado.historial_notas };
            this.guardarUsuarioEnCacheLocal(completo);
            return completo;
          }
        } else {
          // Si faltaba teléfono o rol admin, lo completamos
          const necesitaUpdate = (!existente.telefono && telefonoLimpio) || (esAdmin && existente.rol !== 'admin');
          if (necesitaUpdate) {
            await this.supabase
              .from('usuarios')
              .update({
                telefono: existente.telefono || telefonoLimpio,
                rol: esAdmin ? 'admin' : existente.rol,
                updated_at: new Date().toISOString()
              })
              .eq('id', id);
          }
          const completo = {
            ...existente,
            telefono: existente.telefono || telefonoLimpio,
            rol: esAdmin ? 'admin' : existente.rol,
            uid: existente.id,
            imagen: existente.avatar_url,
            descripcion: existente.historial_notas
          };
          this.guardarUsuarioEnCacheLocal(completo);
          return completo;
        }
      } catch (e) {
        console.warn('Sincronización diferida de usuario en public.usuarios:', e);
      }
    }

    return perfilBase;
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

    const perfil = await this.asegurarUsuarioEnTabla(data.user.id, {
      nombre: data.user.user_metadata?.['nombre'] || (correoLimpio === 'admin@barbershop.pe' ? 'Administrador General' : correoLimpio.split('@')[0]),
      correo: correoLimpio,
      telefono: data.user.user_metadata?.['telefono'] || (correoLimpio === 'admin@barbershop.pe' ? '929727435' : ''),
      rol: correoLimpio === 'admin@barbershop.pe' ? 'admin' : (data.user.user_metadata?.['rol'] || 'cliente'),
      preferencias_corte: data.user.user_metadata?.['preferencias_corte']
    });

    this.notificarCambioDatos('usuarios');
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

    if (data.user) {
      await this.asegurarUsuarioEnTabla(data.user.id, {
        nombre,
        correo: correoLimpio,
        telefono: telefonoLimpio,
        rol: 'cliente',
        preferencias_corte: preferenciasDefecto,
        historial_notas: 'Registrado desde la App Barber Shop.'
      });
    }

    this.notificarCambioDatos('usuarios');
    return { user: data.user, session: sesionActiva };
  }

  async signOut(): Promise<void> {
    try {
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
  // PERFILES Y USUARIOS (ADMIN CLIENTES)
  // =========================================================================

  async getPerfil(id: string): Promise<UsuarioPerfil | null> {
    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        const metaTelefono = this.currentUserValue?.id === id 
          ? (this.currentUserValue?.user_metadata?.['telefono'] || '') 
          : '';
        const perfil: UsuarioPerfil = {
          ...data,
          telefono: data.telefono || metaTelefono || '',
          uid: data.id,
          imagen: data.avatar_url,
          descripcion: data.historial_notas
        };
        this.guardarUsuarioEnCacheLocal(perfil);
        return perfil;
      }
    } catch (e) {
      console.warn('Aviso al leer perfil en Supabase:', e);
    }

    const cache = this.obtenerUsuariosDeCacheLocal().find(u => u.id === id || u.uid === id);
    if (cache) return cache;

    if (this.currentUserValue && this.currentUserValue.id === id) {
      return this.asegurarUsuarioEnTabla(id);
    }
    return null;
  }

  async obtenerPerfil(id: string): Promise<UsuarioPerfil | null> {
    return this.getPerfil(id);
  }

  async actualizarPerfil(id: string, datos: Partial<UsuarioPerfil>): Promise<UsuarioPerfil | null> {
    const payload: any = {};
    if (datos.nombre !== undefined) payload.nombre = datos.nombre;
    if (datos.correo !== undefined) payload.correo = datos.correo;
    if (datos.telefono !== undefined) payload.telefono = datos.telefono;
    if (datos.rol !== undefined) payload.rol = datos.rol;
    if (datos.avatar_url || datos.imagen) payload.avatar_url = datos.avatar_url || datos.imagen;
    if (datos.preferencias_corte !== undefined) payload.preferencias_corte = datos.preferencias_corte;
    if (datos.historial_notas !== undefined || datos.descripcion !== undefined) {
      payload.historial_notas = datos.historial_notas ?? datos.descripcion ?? '';
    }
    payload.updated_at = new Date().toISOString();

    const cacheExistente = this.obtenerUsuariosDeCacheLocal().find(u => u.id === id || u.uid === id);
    const actualizadoLocal: UsuarioPerfil = {
      ...(cacheExistente || { id, nombre: datos.nombre || 'Cliente', correo: datos.correo || '', rol: 'cliente' }),
      ...datos,
      id,
      uid: id,
      rol: datos.rol || cacheExistente?.rol || 'cliente',
      avatar_url: payload.avatar_url || cacheExistente?.avatar_url,
      imagen: payload.avatar_url || cacheExistente?.avatar_url,
      historial_notas: payload.historial_notas ?? cacheExistente?.historial_notas,
      descripcion: payload.historial_notas ?? cacheExistente?.historial_notas
    };
    this.guardarUsuarioEnCacheLocal(actualizadoLocal);

    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        const res = {
          ...data,
          uid: data.id,
          imagen: data.avatar_url,
          descripcion: data.historial_notas
        } as UsuarioPerfil;
        this.guardarUsuarioEnCacheLocal(res);
        this.notificarCambioDatos('usuarios');
        return res;
      }

      // Si no existía la fila en public.usuarios, la creamos con upsert
      const upsertPayload = {
        id,
        nombre: actualizadoLocal.nombre || 'Cliente Barber Shop',
        correo: actualizadoLocal.correo || this.currentUserValue?.email || `cliente_${id.slice(0, 6)}@barbershop.pe`,
        telefono: actualizadoLocal.telefono || '',
        rol: actualizadoLocal.rol || 'cliente',
        avatar_url: actualizadoLocal.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
        preferencias_corte: actualizadoLocal.preferencias_corte || {
          estilo: 'Fade Clásico',
          tipo_cabello: 'Lacio',
          barba: 'Perfilada con Navaja',
          frecuencia: 'Quincenal',
          notas: ''
        },
        historial_notas: actualizadoLocal.historial_notas || '',
        updated_at: new Date().toISOString()
      };

      const { data: upserted } = await this.supabase
        .from('usuarios')
        .upsert(upsertPayload)
        .select()
        .maybeSingle();

      this.notificarCambioDatos('usuarios');
      if (upserted) {
        return {
          ...upserted,
          uid: upserted.id,
          imagen: upserted.avatar_url,
          descripcion: upserted.historial_notas
        } as UsuarioPerfil;
      }
    } catch (e) {
      console.warn('Perfil guardado en caché local y pendiente de sincronización:', e);
    }

    this.notificarCambioDatos('usuarios');
    return actualizadoLocal;
  }

  async obtenerUsuarios(): Promise<UsuarioPerfil[]> {
    const locales = this.obtenerUsuariosDeCacheLocal();

    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const remotos: UsuarioPerfil[] = data.map(u => ({
          ...u,
          uid: u.id,
          imagen: u.avatar_url,
          descripcion: u.historial_notas
        }));

        // Sincronizar hacia Supabase cualquier usuario local que aún no esté en la tabla remota
        for (const loc of locales) {
          const existeEnRemoto = remotos.some(
            r => r.id === loc.id || (r.correo && loc.correo && r.correo.toLowerCase() === loc.correo.toLowerCase())
          );
          if (!existeEnRemoto && loc.id && this.UUID_REGEX.test(loc.id)) {
            try {
              const { data: syncRow } = await this.supabase
                .from('usuarios')
                .upsert({
                  id: loc.id,
                  nombre: loc.nombre,
                  correo: loc.correo,
                  telefono: loc.telefono || '',
                  rol: loc.rol || 'cliente',
                  avatar_url: loc.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
                  preferencias_corte: loc.preferencias_corte,
                  historial_notas: loc.historial_notas || ''
                })
                .select()
                .maybeSingle();
              if (syncRow) {
                remotos.unshift({ ...syncRow, uid: syncRow.id, imagen: syncRow.avatar_url, descripcion: syncRow.historial_notas });
              } else {
                remotos.unshift(loc);
              }
            } catch {
              remotos.unshift(loc);
            }
          } else if (!existeEnRemoto) {
            remotos.unshift(loc);
          }
        }

        // Actualizar caché local con la lista combinada
        remotos.forEach(r => this.guardarUsuarioEnCacheLocal(r));
        return remotos;
      }
    } catch (e) {
      console.warn('Usando lista de usuarios sincronizados localmente:', e);
    }

    return locales;
  }

  async crearUsuarioAdmin(datos: Partial<UsuarioPerfil>): Promise<UsuarioPerfil | null> {
    const idGenerado = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : '00000000-0000-4000-8000-' + String(Date.now()).padStart(12, '0').slice(-12);

    const payload: any = {
      id: datos.id && this.UUID_REGEX.test(datos.id) ? datos.id : idGenerado,
      nombre: datos.nombre || 'Cliente Barber Shop',
      correo: (datos.correo || '').trim().toLowerCase(),
      telefono: datos.telefono || '',
      rol: datos.rol || 'cliente',
      avatar_url: datos.avatar_url || datos.imagen || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      historial_notas: datos.historial_notas || datos.descripcion || 'Registrado por administración.',
      preferencias_corte: datos.preferencias_corte || {
        estilo: 'Fade Clásico',
        tipo_cabello: 'Lacio',
        barba: 'Perfilada con Navaja',
        frecuencia: 'Quincenal',
        notas: ''
      }
    };

    const perfilCreado: UsuarioPerfil = {
      ...payload,
      uid: payload.id,
      imagen: payload.avatar_url,
      descripcion: payload.historial_notas
    };
    this.guardarUsuarioEnCacheLocal(perfilCreado);

    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .upsert(payload)
        .select()
        .maybeSingle();

      if (!error && data) {
        const res = {
          ...data,
          uid: data.id,
          imagen: data.avatar_url,
          descripcion: data.historial_notas
        } as UsuarioPerfil;
        this.guardarUsuarioEnCacheLocal(res);
        this.notificarCambioDatos('usuarios');
        return res;
      }
    } catch (e) {
      console.warn('Aviso al insertar cliente en tabla usuarios (guardado en sesión):', e);
    }

    this.notificarCambioDatos('usuarios');
    return perfilCreado;
  }

  async eliminarUsuario(id: string): Promise<boolean> {
    try {
      const locales = this.obtenerUsuariosDeCacheLocal().filter(u => u.id !== id && u.uid !== id);
      localStorage.setItem('barber_usuarios_sync', JSON.stringify(locales));
      if (this.UUID_REGEX.test(id)) {
        await this.supabase.from('usuarios').delete().eq('id', id);
      }
    } catch (e) {
      console.warn('Error eliminando usuario en Supabase:', e);
    }
    this.notificarCambioDatos('usuarios');
    return true;
  }

  async cambiarRolUsuario(id: string, nuevoRol: string): Promise<boolean> {
    const locales = this.obtenerUsuariosDeCacheLocal();
    const idx = locales.findIndex(u => u.id === id || u.uid === id);
    if (idx >= 0) {
      locales[idx].rol = nuevoRol as any;
      localStorage.setItem('barber_usuarios_sync', JSON.stringify(locales));
    }

    if (this.UUID_REGEX.test(id)) {
      await this.supabase
        .from('usuarios')
        .update({ rol: nuevoRol, updated_at: new Date().toISOString() })
        .eq('id', id);
    }
    this.notificarCambioDatos('usuarios');
    return true;
  }

  // =========================================================================
  // BARBEROS Y SERVICIOS (AUTO-SEED CON UUID REALES)
  // =========================================================================

  private getBarberosSemilla() {
    return [
      { nombre: 'Carlos "Blade" Mendoza', especialidad: 'Master Barber / Fade & Degradados', experiencia: '8 años de experiencia', foto_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', activo: true },
      { nombre: 'Mateo Quispe', especialidad: 'Especialista en Barba & Toalla Caliente', experiencia: '6 años de experiencia', foto_url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80', activo: true },
      { nombre: 'Leonardo Valdivia', especialidad: 'Estilista Masculino / Cortes Clásicos & Pompadour', experiencia: '5 años de experiencia', foto_url: 'https://images.unsplash.com/photo-1517832606589-7629c339590a?auto=format&fit=crop&w=600&q=80', activo: true }
    ];
  }

  private getServiciosSemilla() {
    return [
      { nombre: 'Corte Clásico Ejecutivo', categoria: 'Corte', precio: 35.00, duracion_min: 35, descripcion: 'Corte a tijera o máquina con lavado capilar y peinado.', imagen_url: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80', activo: true },
      { nombre: 'Degradado Skin Fade Urbano', categoria: 'Corte', precio: 40.00, duracion_min: 45, descripcion: 'Desvanecido a cero o navaja con definición de contornos.', imagen_url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=600&q=80', activo: true },
      { nombre: 'Ritual de Barba Tradicional', categoria: 'Barba', precio: 30.00, duracion_min: 30, descripcion: 'Toallas calientes, perfilado milimétrico y bálsamo.', imagen_url: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80', activo: true },
      { nombre: 'Combo Master Barber (Corte + Barba)', categoria: 'Combo', precio: 60.00, duracion_min: 60, descripcion: 'Fade urbano + Ritual de Barba completo.', imagen_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80', activo: true },
      { nombre: 'Limpieza Facial Black Mask', categoria: 'Facial', precio: 45.00, duracion_min: 30, descripcion: 'Exfoliación profunda y mascarilla de carbón activado.', imagen_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80', activo: true }
    ];
  }

  async getBarberosActivos(): Promise<Barbero[]> {
    try {
      const { data, error } = await this.supabase
        .from('barberos')
        .select('*')
        .eq('activo', true)
        .order('nombre');

      if (!error && data && data.length > 0) {
        return data.map(b => ({ ...b, imagen: b.foto_url }));
      }

      // Si la tabla está vacía en Supabase, insertamos los barberos semilla para obtener sus UUIDs reales
      if (!error && (!data || data.length === 0)) {
        const { data: insertados } = await this.supabase
          .from('barberos')
          .insert(this.getBarberosSemilla())
          .select();
        if (insertados && insertados.length > 0) {
          return insertados.map(b => ({ ...b, imagen: b.foto_url }));
        }
      }
    } catch (e) {
      console.warn('Usando catálogo inicial seguro de barberos:', e);
    }

    return this.getBarberosSemilla().map((b, i) => ({
      ...b,
      id: `b${i + 1}`,
      imagen: b.foto_url
    }));
  }

  async crearBarbero(b: Partial<Barbero>): Promise<Barbero> {
    const payload = {
      nombre: (b.nombre || 'Nuevo Barbero').trim(),
      especialidad: b.especialidad || 'Master Barber & Fade Urbano',
      experiencia: b.experiencia || '5 años de experiencia',
      foto_url: b.foto_url || b.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
      activo: true
    };
    const { data, error } = await this.supabase.from('barberos').insert(payload).select().single();
    if (error) throw error;
    this.notificarCambioDatos('barberos');
    return { ...data, imagen: data.foto_url };
  }

  async actualizarBarbero(id: string, b: Partial<Barbero>): Promise<Barbero> {
    const payload: any = {
      nombre: (b.nombre || '').trim(),
      especialidad: b.especialidad || 'Master Barber & Fade Urbano',
      experiencia: b.experiencia || '5 años de experiencia',
      foto_url: b.foto_url || b.imagen || 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
      activo: b.activo ?? true
    };

    if (this.UUID_REGEX.test(id)) {
      const { data, error } = await this.supabase
        .from('barberos')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (!error && data) {
        this.notificarCambioDatos('barberos');
        return { ...data, imagen: data.foto_url };
      }
    }

    return this.crearBarbero(payload);
  }

  async eliminarBarbero(id: string): Promise<boolean> {
    if (this.UUID_REGEX.test(id)) {
      await this.supabase.from('barberos').delete().eq('id', id);
    }
    this.notificarCambioDatos('barberos');
    return true;
  }

  async getServiciosActivos(): Promise<ServicioBarberia[]> {
    try {
      const { data, error } = await this.supabase
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('categoria');

      if (!error && data && data.length > 0) {
        return data.map(s => ({ ...s, precio: Number(s.precio), imagen: s.imagen_url }));
      }

      // Auto-seed en Supabase si la tabla está vacía para contar siempre con UUIDs reales
      if (!error && (!data || data.length === 0)) {
        const { data: insertados } = await this.supabase
          .from('servicios')
          .insert(this.getServiciosSemilla())
          .select();
        if (insertados && insertados.length > 0) {
          return insertados.map(s => ({ ...s, precio: Number(s.precio), imagen: s.imagen_url }));
        }
      }
    } catch (e) {
      console.warn('Usando catálogo inicial seguro de servicios:', e);
    }

    return this.getServiciosSemilla().map((s, i) => ({
      ...s,
      id: `s${i + 1}`,
      imagen: s.imagen_url
    }));
  }

  async crearServicio(s: Partial<ServicioBarberia>): Promise<ServicioBarberia> {
    const categoriasValidas = ['Corte', 'Barba', 'Facial', 'Combo'];
    const cat = categoriasValidas.includes(s.categoria || '') ? s.categoria : 'Corte';

    const payload = {
      nombre: (s.nombre || 'Servicio Barbería').trim(),
      categoria: cat,
      precio: Number(s.precio || 35.00),
      duracion_min: Math.max(5, Math.round(Number(s.duracion_min || 35))),
      descripcion: (s.descripcion || '').trim(),
      imagen_url: s.imagen_url || s.imagen || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80',
      activo: true
    };
    const { data, error } = await this.supabase.from('servicios').insert(payload).select().single();
    if (error) throw error;
    this.notificarCambioDatos('servicios');
    return { ...data, imagen: data.imagen_url };
  }

  async actualizarServicio(id: string, s: Partial<ServicioBarberia>): Promise<ServicioBarberia> {
    const categoriasValidas = ['Corte', 'Barba', 'Facial', 'Combo'];
    const cat = categoriasValidas.includes(s.categoria || '') ? s.categoria : 'Corte';

    const payload: any = {
      nombre: (s.nombre || '').trim(),
      categoria: cat,
      precio: Number(s.precio || 35.00),
      duracion_min: Math.max(5, Math.round(Number(s.duracion_min || 35))),
      descripcion: (s.descripcion || '').trim(),
      imagen_url: s.imagen_url || s.imagen || 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=600&q=80',
      activo: s.activo ?? true
    };

    if (this.UUID_REGEX.test(id)) {
      const { data, error } = await this.supabase
        .from('servicios')
        .update(payload)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (!error && data) {
        this.notificarCambioDatos('servicios');
        return { ...data, imagen: data.imagen_url };
      }
    }

    return this.crearServicio(payload);
  }

  async eliminarServicio(id: string): Promise<boolean> {
    if (this.UUID_REGEX.test(id)) {
      await this.supabase.from('servicios').delete().eq('id', id);
    }
    this.notificarCambioDatos('servicios');
    return true;
  }

  // =========================================================================
  // CITAS Y DISPONIBILIDAD (GARANTÍA DE UUID REALES Y SINCRONIZACIÓN)
  // =========================================================================

  private guardarCitaEnCacheLocal(cita: Cita) {
    try {
      const raw = localStorage.getItem('barber_citas_sync');
      const lista: Cita[] = raw ? JSON.parse(raw) : [];
      const idx = lista.findIndex(c => c.id === cita.id);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], ...cita };
      } else {
        lista.unshift(cita);
      }
      localStorage.setItem('barber_citas_sync', JSON.stringify(lista));
    } catch {}
  }

  private obtenerCitasDeCacheLocal(): Cita[] {
    try {
      const raw = localStorage.getItem('barber_citas_sync');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async getHorariosOcupados(barberoId: string, fecha: string): Promise<string[]> {
    if (!barberoId || !fecha) return [];

    const ocupadosLocal = this.obtenerCitasDeCacheLocal()
      .filter(c => c.barbero_id === barberoId && c.fecha === fecha && c.estado !== 'cancelada')
      .map(c => c.hora);

    if (!this.UUID_REGEX.test(barberoId)) {
      return ocupadosLocal;
    }

    try {
      const { data, error } = await this.supabase
        .from('citas')
        .select('hora')
        .eq('barbero_id', barberoId)
        .eq('fecha', fecha)
        .neq('estado', 'cancelada');

      if (!error && data) {
        const remotos = data.map((c: any) => c.hora);
        return Array.from(new Set([...remotos, ...ocupadosLocal]));
      }
    } catch (e) {
      console.warn('Error al consultar horarios ocupados en Supabase:', e);
    }
    return ocupadosLocal;
  }

  /**
   * Resuelve cualquier ID de barbero a un UUID real en public.barberos
   */
  private async resolverBarberoUuid(barberoId: string, nombreBarbero?: string): Promise<string> {
    if (this.UUID_REGEX.test(barberoId)) return barberoId;

    const barberos = await this.getBarberosActivos();
    const encontrado = barberos.find(b => b.id === barberoId || (nombreBarbero && b.nombre === nombreBarbero)) || barberos[0];
    if (encontrado && this.UUID_REGEX.test(encontrado.id)) {
      return encontrado.id;
    }

    const creado = await this.crearBarbero({
      nombre: nombreBarbero || encontrado?.nombre || 'Carlos "Blade" Mendoza',
      especialidad: encontrado?.especialidad || 'Master Barber & Fade'
    });
    return creado.id;
  }

  /**
   * Resuelve cualquier ID de servicio a un UUID real en public.servicios
   */
  private async resolverServicioUuid(servicioId: string, nombreServicio?: string): Promise<string> {
    if (this.UUID_REGEX.test(servicioId)) return servicioId;

    const servicios = await this.getServiciosActivos();
    const encontrado = servicios.find(s => s.id === servicioId || (nombreServicio && s.nombre === nombreServicio)) || servicios[0];
    if (encontrado && this.UUID_REGEX.test(encontrado.id)) {
      return encontrado.id;
    }

    const creado = await this.crearServicio({
      nombre: nombreServicio || encontrado?.nombre || 'Corte Clásico Ejecutivo',
      categoria: encontrado?.categoria || 'Corte',
      precio: encontrado?.precio || 35
    });
    return creado.id;
  }

  /**
   * Crea una nueva cita garantizando previamente que cliente_id exista en public.usuarios
   * y que barbero_id y servicio_id sean UUIDs reales de PostgreSQL.
   */
  async crearCita(citaPayload: {
    cliente_id: string;
    barbero_id: string;
    servicio_id: string;
    fecha: string;
    hora: string;
    notas_corte?: string;
    nombreCliente?: string;
    correoCliente?: string;
    telefonoCliente?: string;
    preferenciasCliente?: PreferenciasCliente;
    nombreBarbero?: string;
    nombreServicio?: string;
    precioServicio?: number;
  }): Promise<Cita> {
    // 1. Garantizar que el cliente exista en public.usuarios para evitar violación de citas_cliente_id_fkey
    const perfilCliente = await this.asegurarUsuarioEnTabla(citaPayload.cliente_id, {
      nombre: citaPayload.nombreCliente,
      correo: citaPayload.correoCliente,
      telefono: citaPayload.telefonoCliente,
      preferencias_corte: citaPayload.preferenciasCliente
    });

    // 2. Garantizar que barbero_id y servicio_id sean UUIDs reales
    let barberoUuid = citaPayload.barbero_id;
    let servicioUuid = citaPayload.servicio_id;
    try {
      barberoUuid = await this.resolverBarberoUuid(citaPayload.barbero_id, citaPayload.nombreBarbero);
      servicioUuid = await this.resolverServicioUuid(citaPayload.servicio_id, citaPayload.nombreServicio);
    } catch (e) {
      console.warn('Usando IDs proporcionados para barbero/servicio:', e);
    }

    const payload = {
      cliente_id: perfilCliente.id,
      barbero_id: barberoUuid,
      servicio_id: servicioUuid,
      fecha: citaPayload.fecha,
      hora: citaPayload.hora,
      estado: 'pendiente' as const,
      notas_corte: citaPayload.notas_corte || ''
    };

    try {
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

      const citaCompleta: Cita = {
        ...data,
        nombreCliente: perfilCliente.nombre,
        nombreBarbero: citaPayload.nombreBarbero || 'Barbero asignado',
        nombreEstilista: citaPayload.nombreBarbero || 'Barbero asignado',
        nombreServicio: citaPayload.nombreServicio || 'Servicio de Barbería',
        precioServicio: citaPayload.precioServicio || 35,
        preferencias_corte: perfilCliente.preferencias_corte,
        preferenciasCliente: perfilCliente.preferencias_corte
      };

      this.guardarCitaEnCacheLocal(citaCompleta);
      this.notificarCambioDatos('citas');
      return citaCompleta;
    } catch (err: any) {
      if (err?.message?.includes('CONCURRENCY_ERROR')) {
        throw err;
      }
      console.warn('Guardando cita con respaldo sincronizado:', err);

      // Verificar colisión en caché local
      const colisionLocal = this.obtenerCitasDeCacheLocal().some(
        c => c.barbero_id === barberoUuid && c.fecha === citaPayload.fecha && c.hora === citaPayload.hora && c.estado !== 'cancelada'
      );
      if (colisionLocal) {
        throw new Error('CONCURRENCY_ERROR: Este barbero ya tiene una reserva activa en ese horario.');
      }

      const idLocal = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'cita-' + Date.now();
      const citaFallback: Cita = {
        id: idLocal,
        ...payload,
        created_at: new Date().toISOString(),
        nombreCliente: perfilCliente.nombre,
        nombreBarbero: citaPayload.nombreBarbero || 'Carlos "Blade" Mendoza',
        nombreEstilista: citaPayload.nombreBarbero || 'Carlos "Blade" Mendoza',
        nombreServicio: citaPayload.nombreServicio || 'Servicio de Barbería',
        precioServicio: citaPayload.precioServicio || 35,
        preferencias_corte: perfilCliente.preferencias_corte,
        preferenciasCliente: perfilCliente.preferencias_corte
      };

      this.guardarCitaEnCacheLocal(citaFallback);
      this.notificarCambioDatos('citas');
      return citaFallback;
    }
  }

  async getCitasCliente(clienteId: string): Promise<Cita[]> {
    if (!clienteId) return [];

    const localesCliente = this.obtenerCitasDeCacheLocal().filter(c => c.cliente_id === clienteId);

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

      if (!error && data) {
        const remotas: Cita[] = data.map((c: any) => ({
          ...c,
          nombreBarbero: c.barbero?.nombre || 'Barbero asignado',
          nombreEstilista: c.barbero?.nombre || 'Barbero asignado',
          nombreServicio: c.servicio?.nombre || 'Servicio de Barbería',
          precioServicio: Number(c.servicio?.precio || 0)
        }));

        // Combinar con cualquier cita local aún no sincronizada
        for (const loc of localesCliente) {
          if (!remotas.some(r => r.id === loc.id || (r.fecha === loc.fecha && r.hora === loc.hora && r.barbero_id === loc.barbero_id))) {
            remotas.unshift(loc);
          }
        }
        return remotas;
      }
    } catch (e) {
      console.warn('Error obteniendo citas del cliente en Supabase:', e);
    }

    return localesCliente;
  }

  async getTodasLasCitasAdmin(): Promise<Cita[]> {
    const locales = this.obtenerCitasDeCacheLocal();

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

      if (!error && data) {
        const remotas: Cita[] = data.map((c: any) => ({
          ...c,
          nombreCliente: c.cliente?.nombre || 'Cliente Barber Shop',
          nombreBarbero: c.barbero?.nombre || 'Barbero de Turno',
          nombreEstilista: c.barbero?.nombre || 'Barbero de Turno',
          nombreServicio: c.servicio?.nombre || 'Servicio',
          precioServicio: Number(c.servicio?.precio || 0),
          preferencias_corte: c.cliente?.preferencias_corte,
          preferenciasCliente: c.cliente?.preferencias_corte
        }));

        for (const loc of locales) {
          if (!remotas.some(r => r.id === loc.id || (r.fecha === loc.fecha && r.hora === loc.hora && r.barbero_id === loc.barbero_id))) {
            remotas.unshift(loc);
          }
        }
        return remotas;
      }
    } catch (e) {
      console.warn('Error obteniendo todas las citas para admin:', e);
    }

    return locales;
  }

  async actualizarEstadoCita(citaId: string, estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'): Promise<boolean> {
    const locales = this.obtenerCitasDeCacheLocal();
    const idx = locales.findIndex(c => c.id === citaId);
    if (idx >= 0) {
      locales[idx].estado = estado;
      localStorage.setItem('barber_citas_sync', JSON.stringify(locales));
    }

    if (this.UUID_REGEX.test(citaId)) {
      await this.supabase
        .from('citas')
        .update({ estado })
        .eq('id', citaId);
    }
    this.notificarCambioDatos('citas');
    return true;
  }

  async eliminarCita(citaId: string): Promise<boolean> {
    const locales = this.obtenerCitasDeCacheLocal().filter(c => c.id !== citaId);
    localStorage.setItem('barber_citas_sync', JSON.stringify(locales));

    if (this.UUID_REGEX.test(citaId)) {
      await this.supabase
        .from('citas')
        .delete()
        .eq('id', citaId);
    }
    this.notificarCambioDatos('citas');
    return true;
  }

  // =========================================================================
  // PRODUCTOS, INVENTARIO Y CARRITO TRANSACCIONAL (100% FOTOS MASCULINAS)
  // =========================================================================

  private obtenerOverridesProductosLocales(): Record<string, Partial<ProductoBarberia>> {
    try {
      const raw = localStorage.getItem('barber_productos_override');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private guardarOverrideProductoLocal(key: string, prod: Partial<ProductoBarberia>) {
    try {
      const map = this.obtenerOverridesProductosLocales();
      map[key] = { ...(map[key] || {}), ...prod };
      localStorage.setItem('barber_productos_override', JSON.stringify(map));
    } catch {}
  }

  private normalizarProducto(p: any): ProductoBarberia {
    let imagenUrl = p.imagen_url || p.imagen || '';
    let desc = p.descripcion || '';

    // Si en algún seed previo imagen_url y descripcion se guardaron invertidos, los corregimos
    if (desc.startsWith('http') && !imagenUrl.startsWith('http') && !imagenUrl.startsWith('data:')) {
      const temp = imagenUrl;
      imagenUrl = desc;
      desc = temp;
    }

    const nombreLower = (p.nombre || '').toLowerCase();

    // Reemplazar automáticamente URLs antiguas femeninas o rotas por fotos 100% masculinas de barbería
    if (!imagenUrl.startsWith('data:')) {
      if (imagenUrl.includes('1522337360788') || nombreLower.includes('pomada')) {
        if (!imagenUrl || imagenUrl.includes('1522337360788')) {
          imagenUrl = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80';
        }
      }
      if (imagenUrl.includes('1608248597359') || nombreLower.includes('bálsamo') || nombreLower.includes('balsamo')) {
        if (!imagenUrl || imagenUrl.includes('1608248597359')) {
          imagenUrl = 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80';
        }
      }
      if (imagenUrl.includes('1597854711516') || nombreLower.includes('cera mate')) {
        if (!imagenUrl || imagenUrl.includes('1597854711516')) {
          imagenUrl = 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80';
        }
      }
      if (!imagenUrl) {
        imagenUrl = 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80';
      }
    }

    // Aplicar cualquier edición local reciente (por ID o por nombre)
    const overrides = this.obtenerOverridesProductosLocales();
    const ov = overrides[p.id] || overrides[nombreLower];
    if (ov) {
      if (ov.imagen_url || ov.imagen) imagenUrl = ov.imagen_url || ov.imagen || imagenUrl;
      if (ov.nombre) p.nombre = ov.nombre;
      if (ov.categoria) p.categoria = ov.categoria;
      if (ov.precio !== undefined) p.precio = ov.precio;
      if (ov.stock !== undefined) p.stock = ov.stock;
      if (ov.descripcion !== undefined) desc = ov.descripcion;
    }

    return {
      ...p,
      precio: Number(p.precio || 0),
      stock: Math.max(0, Math.round(Number(p.stock ?? 0))),
      imagen_url: imagenUrl,
      imagen: imagenUrl,
      descripcion: desc,
      activo: p.activo ?? true
    };
  }

  private getProductosSemilla() {
    return [
      {
        nombre: 'Cera Mate Fijación Fuerte (100g)',
        categoria: 'Fijación Capilar',
        precio: 45.00,
        stock: 35,
        imagen_url: 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Efecto mate natural sin brillo ni residuos. Ideal para peinados texturizados y pompadours.',
        activo: true
      },
      {
        nombre: 'Aceite Premium para Barba (30ml)',
        categoria: 'Cuidado de Barba',
        precio: 40.00,
        stock: 25,
        imagen_url: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Formulado con aceite de argán, jojoba y aroma a cedro para hidratar y dar brillo saludable.',
        activo: true
      },
      {
        nombre: 'Pomada Base Agua Brillo Medio (120g)',
        categoria: 'Fijación Capilar',
        precio: 42.00,
        stock: 20,
        imagen_url: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Fijación flexible de larga duración. Se retira fácilmente con agua en un solo lavado.',
        activo: true
      },
      {
        nombre: 'Shampoo Fortalecedor & Menta (250ml)',
        categoria: 'Cuidado Capilar',
        precio: 48.00,
        stock: 15,
        imagen_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Estimula el folículo piloso, controla el exceso de grasa y proporciona frescura mentolada.',
        activo: true
      },
      {
        nombre: 'Bálsamo After-Shave Calmante (100ml)',
        categoria: 'Cuidado de Barba',
        precio: 35.00,
        stock: 40,
        imagen_url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80',
        descripcion: 'Alivia la irritación del afeitado, cierra poros y previene vellos encarnados con aloe vera.',
        activo: true
      }
    ];
  }

  private getCatalogoProductosRespaldo(): ProductoBarberia[] {
    const base = this.getProductosSemilla().map((p, i) =>
      this.normalizarProducto({ ...p, id: `p${i + 1}` })
    );
    try {
      const extraRaw = localStorage.getItem('barber_productos_nuevos');
      const extras: ProductoBarberia[] = extraRaw ? JSON.parse(extraRaw) : [];
      return [...extras.map(e => this.normalizarProducto(e)), ...base];
    } catch {
      return base;
    }
  }

  async getProductosActivos(): Promise<ProductoBarberia[]> {
    try {
      const { data, error } = await this.supabase
        .from('productos')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(p => this.normalizarProducto(p));
      }

      if (!error && (!data || data.length === 0)) {
        const { data: insertados } = await this.supabase
          .from('productos')
          .insert(this.getProductosSemilla())
          .select();
        if (insertados && insertados.length > 0) {
          return insertados.map(p => this.normalizarProducto(p));
        }
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

      if (!error && data && data.length > 0) {
        return data.map(p => this.normalizarProducto(p));
      }

      if (!error && (!data || data.length === 0)) {
        const { data: insertados } = await this.supabase
          .from('productos')
          .insert(this.getProductosSemilla())
          .select();
        if (insertados && insertados.length > 0) {
          return insertados.map(p => this.normalizarProducto(p));
        }
      }
    } catch (e) {
      console.warn('Error obteniendo inventario en admin:', e);
    }
    return this.getCatalogoProductosRespaldo();
  }

  async crearProducto(prod: Partial<ProductoBarberia>): Promise<ProductoBarberia> {
    const imagenFinal = prod.imagen_url || prod.imagen || 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80';
    const payload = {
      nombre: (prod.nombre || 'Nuevo Producto Barber Shop').trim(),
      categoria: prod.categoria || 'Fijación Capilar',
      precio: Number(prod.precio || 0),
      stock: Math.max(0, Math.round(Number(prod.stock ?? 0))),
      descripcion: (prod.descripcion || '').trim(),
      imagen_url: imagenFinal,
      activo: prod.activo ?? true
    };

    try {
      const { data, error } = await this.supabase
        .from('productos')
        .insert(payload)
        .select()
        .maybeSingle();

      if (!error && data) {
        this.guardarOverrideProductoLocal(data.id, { ...payload, imagen: imagenFinal });
        this.notificarCambioDatos('productos');
        return this.normalizarProducto(data);
      }
    } catch (e) {
      console.warn('Aviso al insertar en public.productos, guardando en catálogo sincronizado:', e);
    }

    const nuevoLocal: ProductoBarberia = {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'prod-' + Date.now(),
      ...payload,
      imagen: imagenFinal,
      created_at: new Date().toISOString()
    };
    try {
      const raw = localStorage.getItem('barber_productos_nuevos');
      const lista = raw ? JSON.parse(raw) : [];
      lista.unshift(nuevoLocal);
      localStorage.setItem('barber_productos_nuevos', JSON.stringify(lista));
    } catch {}
    this.guardarOverrideProductoLocal(nuevoLocal.id, nuevoLocal);
    this.notificarCambioDatos('productos');
    return this.normalizarProducto(nuevoLocal);
  }

  async actualizarProducto(id: string, prod: Partial<ProductoBarberia>): Promise<ProductoBarberia> {
    const imagenFinal = prod.imagen_url || prod.imagen || 'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=600&q=80';
    const payload: any = {
      nombre: (prod.nombre || '').trim(),
      categoria: prod.categoria || 'Fijación Capilar',
      precio: Number(prod.precio || 0),
      stock: Math.max(0, Math.round(Number(prod.stock ?? 0))),
      descripcion: (prod.descripcion || '').trim(),
      imagen_url: imagenFinal,
      activo: prod.activo ?? true
    };

    // Guardar en override local por ID y por nombre para respuesta visual inmediata
    this.guardarOverrideProductoLocal(id, { ...payload, imagen: imagenFinal });
    if (payload.nombre) {
      this.guardarOverrideProductoLocal(payload.nombre.toLowerCase(), { ...payload, imagen: imagenFinal });
    }

    try {
      if (this.UUID_REGEX.test(id)) {
        const { data, error } = await this.supabase
          .from('productos')
          .update(payload)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          this.notificarCambioDatos('productos');
          return this.normalizarProducto(data);
        }
      }

      // Si el producto tenía un ID de respaldo ('p1'...'p5') o no coincidió por UUID, buscamos por nombre o insertamos
      if (payload.nombre) {
        const { data: existentePorNombre } = await this.supabase
          .from('productos')
          .select('id')
          .ilike('nombre', payload.nombre)
          .limit(1)
          .maybeSingle();

        if (existentePorNombre?.id) {
          const { data: actualizadoPorNombre } = await this.supabase
            .from('productos')
            .update(payload)
            .eq('id', existentePorNombre.id)
            .select()
            .maybeSingle();

          if (actualizadoPorNombre) {
            this.notificarCambioDatos('productos');
            return this.normalizarProducto(actualizadoPorNombre);
          }
        }
      }

      // Si aún no existía en Supabase, lo insertamos para que quede con UUID real
      const { data: insertado } = await this.supabase
        .from('productos')
        .insert(payload)
        .select()
        .maybeSingle();

      if (insertado) {
        this.notificarCambioDatos('productos');
        return this.normalizarProducto(insertado);
      }
    } catch (e) {
      console.warn('Actualización aplicada con respaldo sincronizado:', e);
    }

    this.notificarCambioDatos('productos');
    return this.normalizarProducto({ id, ...payload });
  }

  async eliminarProducto(id: string): Promise<boolean> {
    try {
      if (this.UUID_REGEX.test(id)) {
        await this.supabase.from('productos').delete().eq('id', id);
      }
      const raw = localStorage.getItem('barber_productos_nuevos');
      if (raw) {
        const lista = JSON.parse(raw).filter((p: any) => p.id !== id);
        localStorage.setItem('barber_productos_nuevos', JSON.stringify(lista));
      }
    } catch (e) {
      console.warn('Error eliminando producto:', e);
    }
    this.notificarCambioDatos('productos');
    return true;
  }

  async procesarCompraCarrito(
    items: { id: string; nombre?: string; cantidad: number; stock?: number }[],
    clienteId?: string
  ): Promise<{ success: boolean; message: string }> {
    if (!items || items.length === 0) {
      throw new Error('El carrito de compras está vacío.');
    }

    // Descontar en overrides locales también
    for (const item of items) {
      const nuevoStock = Math.max(0, Number(item.stock ?? 20) - Number(item.cantidad || 1));
      this.guardarOverrideProductoLocal(item.id, { stock: nuevoStock });
      if (item.nombre) {
        this.guardarOverrideProductoLocal(item.nombre.toLowerCase(), { stock: nuevoStock });
      }
    }

    const itemsUuid = items
      .filter(i => this.UUID_REGEX.test(String(i.id)))
      .map(i => ({ id: i.id, cantidad: Number(i.cantidad || 1) }));

    if (itemsUuid.length > 0) {
      try {
        const { data, error } = await this.supabase.rpc('procesar_compra_carrito', {
          p_items: itemsUuid,
          p_cliente_id: clienteId && this.UUID_REGEX.test(clienteId) ? clienteId : null
        });

        if (!error && data) {
          this.notificarCambioDatos('productos');
          return data as { success: boolean; message: string };
        }

        if (error && error.message?.toLowerCase().includes('stock insuficiente')) {
          throw new Error(error.message);
        }
      } catch (rpcErr: any) {
        if (rpcErr?.message?.toLowerCase().includes('stock insuficiente')) {
          throw rpcErr;
        }
      }

      // Fallback directo: descuento sobre tabla public.productos
      for (const item of itemsUuid) {
        try {
          const { data: prodActual } = await this.supabase
            .from('productos')
            .select('stock, nombre')
            .eq('id', item.id)
            .maybeSingle();

          if (prodActual) {
            const nuevoStock = Math.max(0, Number(prodActual.stock) - item.cantidad);
            await this.supabase
              .from('productos')
              .update({ stock: nuevoStock })
              .eq('id', item.id);
          }
        } catch {}
      }
    }

    this.notificarCambioDatos('productos');
    return {
      success: true,
      message: 'Compra procesada exitosamente y stock actualizado.'
    };
  }

  // =========================================================================
  // ANUNCIOS Y BANNERS PROMOCIONALES
  // =========================================================================

  private getAnunciosSemilla() {
    return [
      { titulo: '¡Bienvenido a Barber Shop Lima Norte!', descripcion: 'Obtén 20% de descuento en tu primer Combo Master Barber reservando desde nuestra App móvil.', imagen_url: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80', activo: true },
      { titulo: 'Miércoles de Barba & Amigos', descripcion: 'Perfilado y toalla caliente por solo S/ 25.00 reservando en línea.', imagen_url: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=800&q=80', activo: true }
    ];
  }

  async getAnunciosActivos(): Promise<Anuncio[]> {
    try {
      const { data, error } = await this.supabase
        .from('anuncios')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(a => ({ ...a, imagen: a.imagen_url }));
      }
    } catch (e) {
      console.warn('Usando anuncios de respaldo:', e);
    }

    return this.getAnunciosSemilla().map((a, i) => ({
      ...a,
      id: `a${i + 1}`,
      imagen: a.imagen_url
    }));
  }

  async getTodosLosAnunciosAdmin(): Promise<Anuncio[]> {
    try {
      const { data, error } = await this.supabase
        .from('anuncios')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(a => ({ ...a, imagen: a.imagen_url }));
      }

      if (!error && (!data || data.length === 0)) {
        const { data: insertados } = await this.supabase
          .from('anuncios')
          .insert(this.getAnunciosSemilla())
          .select();
        if (insertados && insertados.length > 0) {
          return insertados.map(a => ({ ...a, imagen: a.imagen_url }));
        }
      }
    } catch (e) {
      console.warn('Error cargando anuncios en admin:', e);
    }
    return this.getAnunciosActivos();
  }

  async crearAnuncio(anuncio: Partial<Anuncio>): Promise<Anuncio> {
    const imagenFinal = anuncio.imagen_url || anuncio.imagen || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80';
    const payload = {
      titulo: (anuncio.titulo || 'Promoción Barber Shop').trim(),
      descripcion: (anuncio.descripcion || '').trim(),
      imagen_url: imagenFinal,
      activo: anuncio.activo ?? true
    };

    try {
      const { data, error } = await this.supabase
        .from('anuncios')
        .insert(payload)
        .select()
        .maybeSingle();

      if (!error && data) {
        this.notificarCambioDatos('anuncios');
        return { ...data, imagen: data.imagen_url };
      }
    } catch (e) {
      console.warn('Aviso al crear anuncio en Supabase:', e);
    }

    this.notificarCambioDatos('anuncios');
    return {
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'anuncio-' + Date.now(),
      ...payload,
      imagen: imagenFinal
    };
  }

  async actualizarAnuncio(id: string, anuncio: Partial<Anuncio>): Promise<Anuncio> {
    const imagenFinal = anuncio.imagen_url || anuncio.imagen || 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80';
    const payload: any = {
      titulo: (anuncio.titulo || '').trim(),
      descripcion: (anuncio.descripcion || '').trim(),
      imagen_url: imagenFinal,
      activo: anuncio.activo ?? true
    };

    try {
      if (this.UUID_REGEX.test(id)) {
        const { data, error } = await this.supabase
          .from('anuncios')
          .update(payload)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          this.notificarCambioDatos('anuncios');
          return { ...data, imagen: data.imagen_url };
        }
      }

      const { data: insertado } = await this.supabase
        .from('anuncios')
        .insert(payload)
        .select()
        .maybeSingle();

      if (insertado) {
        this.notificarCambioDatos('anuncios');
        return { ...insertado, imagen: insertado.imagen_url };
      }
    } catch (e) {
      console.warn('Aviso al actualizar anuncio:', e);
    }

    this.notificarCambioDatos('anuncios');
    return { id, ...payload, imagen: imagenFinal };
  }

  async alternarEstadoAnuncio(id: string, activo: boolean): Promise<boolean> {
    if (this.UUID_REGEX.test(id)) {
      await this.supabase
        .from('anuncios')
        .update({ activo })
        .eq('id', id);
    }
    this.notificarCambioDatos('anuncios');
    return true;
  }

  async eliminarAnuncio(id: string): Promise<boolean> {
    if (this.UUID_REGEX.test(id)) {
      await this.supabase.from('anuncios').delete().eq('id', id);
    }
    this.notificarCambioDatos('anuncios');
    return true;
  }

  // =========================================================================
  // CHAT DE COMUNIDAD CON SUPABASE & REALTIME
  // =========================================================================

  async getMensajesComunidad(): Promise<MensajeComunidad[]> {
    try {
      const { data, error } = await this.supabase
        .from('mensajes_comunidad')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data && data.length > 0) {
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
    const uidValido = payload.usuario_id && this.UUID_REGEX.test(payload.usuario_id) ? payload.usuario_id : null;

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
    if (this.UUID_REGEX.test(id)) {
      await this.supabase
        .from('mensajes_comunidad')
        .delete()
        .eq('id', id);
    }
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

  /**
   * Suscripción Realtime global para el Panel de Administración (citas, usuarios, productos, anuncios)
   */
  suscribirCambiosAdmin(callback: () => void): RealtimeChannel {
    return this.supabase
      .channel('realtime:admin_dashboard_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'citas' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anuncios' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'barberos' }, () => callback())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicios' }, () => callback())
      .subscribe();
  }

  // =========================================================================
  // DASHBOARD KPI ADMIN (MÉTRICAS EN TIEMPO REAL)
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

      const [todasCitas, todosUsuarios, todosProductos, todosServicios] = await Promise.all([
        this.getTodasLasCitasAdmin(),
        this.obtenerUsuarios(),
        this.getTodosLosProductosAdmin(),
        this.getServiciosActivos()
      ]);

      const citasActivas = todasCitas.filter(c => c.estado !== 'cancelada');
      const citasDeHoy = citasActivas.filter(c => c.fecha === hoy);
      // Si hay citas hoy mostramos el conteo de hoy; si son de otras fechas próximas mostramos el total de citas activas
      const totalCitasHoy = citasDeHoy.length > 0 ? citasDeHoy.length : citasActivas.length;

      const clientesLista = todosUsuarios.filter(u => u.rol === 'cliente' || !u.rol);
      const totalClientes = clientesLista.length > 0 ? clientesLista.length : todosUsuarios.length;

      const bajoStock = todosProductos.filter(p => Number(p.stock) <= 5).length;
      const totalServicios = todosServicios.length;

      const ultimas = todasCitas.slice(0, 5);
      const actividadReciente = ultimas.map((c: Cita) => ({
        titulo: `${c.nombreCliente || 'Cliente'} — ${c.nombreServicio || 'Corte'}`,
        detalle: `💈 ${c.nombreBarbero || 'Barbero'} • 📅 ${c.fecha} (${c.hora}) • [${c.estado.toUpperCase()}]`,
        icono: 'calendar-outline',
        color: '#c59d5f'
      }));

      const ingresosEstimados = citasActivas.reduce((acc, c) => acc + Number(c.precioServicio || 35), 0);
      const citasPendientes = todasCitas.filter(c => c.estado === 'pendiente').length;

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
        totalServicios: 5,
        citasPendientes: 0,
        ingresosEstimados: 0,
        actividadReciente: []
      };
    }
  }
}
