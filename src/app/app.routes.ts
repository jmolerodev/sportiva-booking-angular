import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Home } from './components/home/home';
import { About } from './components/about/about';
import { SignUp } from './components/signup/signup';
import { NotFound } from './components/not-found/not-found';
import { AddSportCentre } from './components/add-sport-centre/add-sport-centre';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'home', component: Home },
    { path: 'about', component: About },
    { path: 'signup', component: SignUp },
    { path: 'add-sport-centre', component: AddSportCentre },
    { path: '', redirectTo: 'login', pathMatch: 'full' },
    { path: '**', component: NotFound }
];