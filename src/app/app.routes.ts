import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Home } from './components/home/home';
import { About } from './components/about/about';
import { Signup } from './components/signup/signup';

export const routes: Routes = [
    { path: 'login', component: Login },
    { path: 'home', component: Home },
    { path: 'about', component: About },
    { path: 'signup', component: Signup },
    { path: '', redirectTo: 'login', pathMatch: 'full' }
];
