import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { map, take } from 'rxjs';
import { AuthService } from './services/auth';
import { Rol } from './enums/Rol';

/* Componentes */
import { Login } from './components/login/login';
import { Home } from './components/home/home';
import { SignUp } from './components/signup/signup';
import { NotFound } from './components/not-found/not-found';
import { AddSportCentre } from './components/add-sport-centre/add-sport-centre';
import { ResetPassword } from './components/reset-password/reset-password';
import { AddProfesionalToCenter } from './components/add-profesional-to-center/add-profesional-to-center';
import { Profile } from './components/profile/profile';
import { ManagementClients } from './components/management-clients/management-clients';
import { AdminUserManagement } from './components/admin-user-management/admin-user-management';
import { AdminList } from './components/admin-list/admin-list';

/**
 * Función Guard para proteger rutas de administración (ROOT y ADMINISTRADOR)
 */
const staffGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authService.getRol().pipe(
    take(1),
    map(rol => {
      if (rol === Rol.ADMINISTRADOR || rol === Rol.ROOT) return true;
      /* Si no tiene permiso, lo echamos al home */
      return router.createUrlTree(['/home']);
    })
  );
};

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'home', component: Home },
    { path: 'signup', component: SignUp },
    { path: 'reset-password', component: ResetPassword},
    { path: 'profile', component: Profile},
    { path: 'management-clients', component: ManagementClients},
    { path: 'add-sport-centre', component: AddSportCentre },
    { path: 'admin-list', component: AdminList},
    { path: 'add-profesional-to-center', component: AddProfesionalToCenter },

    /* Componente nuevo para el alta de staff (Admins/Pros) */
    { 
      path: 'user-management', 
      component: AdminUserManagement,
      canActivate: [staffGuard] 
    },

    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: '**', component: NotFound }
];