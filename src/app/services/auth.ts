import { Injectable } from '@angular/core';
import {
  Auth,
  signInWithEmailAndPassword,
  signOut,
  User
} from '@angular/fire/auth';
import { from, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private auth: Auth) { }

  /**
   * Metodo mediante el cual realizaremos el inicio de sesión del usuario
   * utilizando su correo y contraseña.
   */
  login(email: string, password: string): Observable<User> {
    return from(signInWithEmailAndPassword(this.auth, email, password))
      /*Convertimos la promesa de Firebase en un Observable y obtenemos el usuario autenticado*/
      .pipe(map(credential => credential.user));
  }

  /**
   * Metodo mediante el cual cerraremos la sesión del usuario autenticado.
   */
  logout(): Observable<void> {
    return from(signOut(this.auth));
  }
}