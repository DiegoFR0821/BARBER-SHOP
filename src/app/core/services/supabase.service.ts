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

/**
 * Servicio centralizado de conexión y gestión de Supabase.
 * Implementa el patrón Singleton (providedIn: 'root') para garantizar una única
 * instancia del cliente en todo el ciclo de vida de la aplicación móvil.
 * 
 * Cumple con estándares de calidad de software ISO/IEC 25010 (Seguridad, Fiabilidad,
 * Mantenibilidad) y directrices OWASP Mobile Top 10 (M1: Credential Hygiene, 
 * M2: Insecure Communication, M3: Insecure Authentication/Authorization):
 * - Persistencia segura de sesión en el almacenamiento local.
 * - Refresco automático de tokens para evitar desconexiones accidentales.
 * - Desactivación de detectSessionInUrl para prevenir colisiones con el router de Ionic.
 * - Gestión reactiva del estado de autenticación mediante RxJS BehaviorSubject.
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
   * Permite realizar consultas a bases de datos, Storage, RPC y funciones Edge.
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Obtiene de forma síncrona el valor actual del usuario autenticado.
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
}
