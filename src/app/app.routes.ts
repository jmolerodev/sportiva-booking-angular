import { Routes, Router } from '@angular/router';

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
    { path: 'user-management', component: AdminUserManagement},
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: '**', component: NotFound }
];