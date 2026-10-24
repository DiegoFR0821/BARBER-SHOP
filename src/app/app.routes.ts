import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    loadComponent: () => import('./registro/registro.page').then((m) => m.RegistroPage),
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.page').then((m) => m.DashboardPage),
    children: [
      {
        path: '',
        redirectTo: 'resumen',
        pathMatch: 'full',
      },
      {
        path: 'resumen',
        loadComponent: () => import('./dashboard/resumen/resumen.page').then((m) => m.ResumenPage),
      },
      {
        path: 'reservar',
        loadComponent: () => import('./dashboard/reservar/reservar.page').then((m) => m.ReservarPage),
      },
      {
        path: 'citas',
        redirectTo: 'reservar',
        pathMatch: 'full',
      },
      {
        path: 'tienda',
        loadComponent: () => import('./dashboard/tienda/tienda.page').then((m) => m.TiendaPage),
      },
      {
        path: 'carrito',
        loadComponent: () => import('./dashboard/carrito/carrito.page').then((m) => m.CarritoPage),
      },
      {
        path: 'chatbot',
        loadComponent: () => import('./dashboard/chatbot/chatbot.page').then((m) => m.ChatbotPage),
      },
      {
        path: 'comunidad',
        loadComponent: () => import('./dashboard/comunidad/comunidad.page').then((m) => m.ComunidadPage),
      },
    ],
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin.page').then((m) => m.AdminPage),
    children: [
      {
        path: '',
        redirectTo: 'resumen-admin',
        pathMatch: 'full',
      },
      {
        path: 'resumen-admin',
        loadComponent: () => import('./admin/resumen-admin/resumen-admin.page').then((m) => m.ResumenAdminPage),
      },
      {
        path: 'citas',
        loadComponent: () => import('./admin/citas/citas.page').then((m) => m.CitasPage),
      },
      {
        path: 'citas-admin',
        redirectTo: 'citas',
        pathMatch: 'full',
      },
      {
        path: 'clientes',
        loadComponent: () => import('./admin/clientes/clientes.page').then((m) => m.ClientesPage),
      },
      {
        path: 'inventario',
        loadComponent: () => import('./admin/inventario/inventario.page').then((m) => m.InventarioPage),
      },
      {
        path: 'anuncios-admin',
        loadComponent: () => import('./admin/anuncios-admin/anuncios-admin.page').then((m) => m.AnunciosAdminPage),
      },
      {
        path: 'comunidad-admin',
        loadComponent: () => import('./admin/comunidad-admin/comunidad-admin.page').then((m) => m.ComunidadAdminPage),
      },
    ],
  },
  {
    path: 'perfil',
    loadComponent: () => import('./perfil/perfil.page').then((m) => m.PerfilPage),
  },
  {
    path: 'carrito',
    loadComponent: () => import('./dashboard/carrito/carrito.page').then((m) => m.CarritoPage),
  },
  {
    path: 'resumen-admin',
    loadComponent: () => import('./admin/resumen-admin/resumen-admin.page').then((m) => m.ResumenAdminPage),
  },
  {
    path: 'citas',
    loadComponent: () => import('./admin/citas/citas.page').then((m) => m.CitasPage),
  },
  {
    path: 'citas-admin',
    redirectTo: 'citas',
    pathMatch: 'full',
  },
  {
    path: 'clientes',
    loadComponent: () => import('./admin/clientes/clientes.page').then((m) => m.ClientesPage),
  },
  {
    path: 'inventario',
    loadComponent: () => import('./admin/inventario/inventario.page').then((m) => m.InventarioPage),
  },
];
