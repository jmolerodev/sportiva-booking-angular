import { Routes } from '@angular/router';
import { Login }               from './components/login/login';
import { Home }                from './components/home/home';
import { SignUp }              from './components/signup/signup';
import { NotFound }            from './components/not-found/not-found';
import { AddSportCentre }      from './components/add-sport-centre/add-sport-centre';
import { ResetPassword }       from './components/reset-password/reset-password';
import { Profile }             from './components/profile/profile';
import { ManagementClients }   from './components/management-clients/management-clients';
import { AdminUserManagement } from './components/admin-user-management/admin-user-management';
import { AdminList }           from './components/admin-list/admin-list';
import { ProfesionalList }     from './components/profesional-list/profesional-list';
import { ProfesionalSessions } from './components/profesional-sessions/profesional-sessions';
import { MediaManagement }     from './components/media-management/media-management';
import { SportCentreDetail }   from './components/sportcentredetail/sportcentredetail';
import { MembershipPayment }   from './components/membership-payment/membership-payment';
import { SoporteAdmin }        from './components/soporte-admin/soporte-admin';
import { ClienteSessions }     from './components/cliente-sessions/cliente-sessions';
import { roleGuard } from './guards/role.guard';
import { Rol } from './enums/Rol';

export const routes: Routes = [

  /* Rutas públicas: accesibles sin autenticación */
  { path: 'login',          component: Login },
  { path: 'home',           component: Home },
  { path: 'signup',         component: SignUp },
  { path: 'reset-password', component: ResetPassword },

  /* Rutas comunes: cualquier usuario autenticado */
  {
    path: 'profile',
    component: Profile,
    canActivate: [roleGuard([Rol.ROOT, Rol.ADMINISTRADOR, Rol.CLIENTE, Rol.PROFESIONAL])]
  },

  /* Rutas de CLIENTE */
  {
    path: 'cliente-sessions',
    component: ClienteSessions,
    canActivate: [roleGuard([Rol.CLIENTE])]
  },
  {
    path: 'centre-detail/:centroId',
    component: SportCentreDetail,
    canActivate: [roleGuard([Rol.CLIENTE])]
  },
  {
    path: 'membership-payment/:centroId',
    component: MembershipPayment,
    canActivate: [roleGuard([Rol.CLIENTE])]
  },

  /* Rutas de ADMINISTRADOR */
  {
    path: 'management-clients',
    component: ManagementClients,
    canActivate: [roleGuard([Rol.ADMINISTRADOR, Rol.ROOT])]
  },
  {
    path: 'user-management',
    component: AdminUserManagement,
    canActivate: [roleGuard([Rol.ADMINISTRADOR, Rol.ROOT])]
  },
  {
    path: 'profesional-list',
    component: ProfesionalList,
    canActivate: [roleGuard([Rol.ADMINISTRADOR])]
  },
  {
    path: 'soporte-admin',
    component: SoporteAdmin,
    canActivate: [roleGuard([Rol.ADMINISTRADOR])]
  },
  {
    path: 'add-sport-centre',
    component: AddSportCentre,
    canActivate: [roleGuard([Rol.ADMINISTRADOR])]
  },

  /* Rutas de PROFESIONAL */
  {
    path: 'profesional-sessions',
    component: ProfesionalSessions,
    canActivate: [roleGuard([Rol.PROFESIONAL])]
  },
  {
    path: 'profesional-media',
    component: MediaManagement,
    canActivate: [roleGuard([Rol.PROFESIONAL])]
  },

  /* Rutas de ROOT */
  {
    path: 'admin-list',
    component: AdminList,
    canActivate: [roleGuard([Rol.ROOT])]
  },

  /* Rutas de sistema */
  { path: '',   redirectTo: 'home', pathMatch: 'full' },
  { path: '**', component: NotFound }
];