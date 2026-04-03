import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Home } from './components/home/home';
import { About } from './components/about/about';
import { SignUp } from './components/signup/signup';
import { NotFound } from './components/not-found/not-found';
import { AddSportCentre } from './components/add-sport-centre/add-sport-centre';
import { ResetPassword } from './components/reset-password/reset-password';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'home', component: Home },
    { path: 'about', component: About },
    { path: 'signup', component: SignUp },
    { path: 'reset-password', component: ResetPassword},
    { path: 'add-sport-centre', component: AddSportCentre },
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: '**', component: NotFound }
];