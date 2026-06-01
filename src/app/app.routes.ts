// Importamos la herramienta oficial de Angular para mapear URLs a componentes independientes.
import { Routes } from '@angular/router';

// Exportamos la lista maestra de caminos que el enrutador inspeccionará de arriba a abajo.
export const routes: Routes = [
  {
    // Si la dirección URL del navegador está vacía (inicio de la aplicación)...
    path: '',
    // Redireccionamos automáticamente al usuario a la vista de presentación.
    redirectTo: 'home',
    // 'full' obliga a que todo el camino esté completamente vacío para activar el desvío.
    pathMatch: 'full',
  },
  {
    // Dirección para la Landing Page pública.
    path: 'home',
    // Carga perezosa (Lazy Loading): el código solo se descarga cuando el cliente entra aquí.
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    // Dirección para la pantalla de Login que acabamos de estilizar en dorado.
    path: 'login',
    // Carga perezosa del componente de inicio de sesión.
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    // Dirección para la pantalla de registro de usuarios.
    path: 'registro',
    // Carga perezosa del componente de creación de cuentas.
    loadComponent: () => import('./registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    // DIRECCIÓN MAESTRA DEL PANEL DEL CLIENTE: /dashboard
    path: 'dashboard',
    // Cargamos la página base que funcionará como la carcasa con los botones inferiores.
    loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
    // Usamos 'children' para definir el enrutamiento anidado de los sub-módulos.
    children: [
      {
        // Si entran exactamente a /dashboard sin especificar una sub-sección...
        path: '',
        // Redireccionamos de forma inmediata a la pestaña interna de resumen.
        redirectTo: 'resumen',
        // Coincidencia estricta para la URL interna del panel.
        pathMatch: 'full',
      },
      {
        // Sub-dirección final mapeada como: /dashboard/resumen
        path: 'resumen',
        // Inyecta el componente con el estado general y puntos del cliente logueado.
        loadComponent: () => import('./dashboard/resumen/resumen.page').then((m) => m.ResumenPage),
      },
      {
        // Sub-dirección final mapeada como: /dashboard/reservar
        path: 'reservar',
        // Inyecta el componente del selector inteligente de citas y estilistas.
        loadComponent: () => import('./dashboard/reservar/reservar.page').then((m) => m.ReservarPage),
      },
      {
        // Sub-dirección final mapeada como: /dashboard/tienda
        path: 'tienda',
        // Inyecta el catálogo digital y el carrito de productos de belleza.
        loadComponent: () => import('./dashboard/tienda/tienda.page').then((m) => m.TiendaPage),
      },
      {
        // Sub-dirección final mapeada como: /dashboard/chatbot
        path: 'chatbot',
        // Inyecta la sala de chat interactiva con la asistente inteligente.
        loadComponent: () => import('./dashboard/chatbot/chatbot.page').then((m) => m.ChatbotPage),
      },
    ],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./perfil/perfil.page').then( m => m.PerfilPage)
  },
  {
    path: 'carrito',
    // ¡AQUÍ ESTÁ LA CORRECCIÓN! Apuntamos a la carpeta correcta
    loadComponent: () => import('./dashboard/carrito/carrito.page').then( m => m.CarritoPage)
  },
];