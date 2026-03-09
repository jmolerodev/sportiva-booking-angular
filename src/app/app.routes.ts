import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Home } from './components/home/home';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'home', component: Home},
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];
