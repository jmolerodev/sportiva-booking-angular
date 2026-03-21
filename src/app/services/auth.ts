import { Injectable } from '@angular/core';
import { Auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, UserCredential } from '@angular/fire/auth';
import { from, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  /*Constructor del Servicio*/
  constructor(private auth: Auth) { }

  /**
   * Método mediante el cual realizaremos el inicio de sesión del usuario
   * utilizando su correo electrónico y contraseña.
   * @param email Correo electrónico del usuario
   * @param password Contraseña del usuario
   * @returns Observable con el usuario autenticado
   */
  login(email: string, password: string): Observable<User> {
    return from(signInWithEmailAndPassword(this.auth, email, password))
      /*Convertimos la promesa de Firebase en un Observable y obtenemos el usuario autenticado*/
      .pipe(map(credential => credential.user));
  }

  /**
   * Método mediante el cual registraremos a un nuevo usuario en Firebase Authentication
   * utilizando su correo electrónico y contraseña.
   * @param email Correo electrónico del nuevo usuario
   * @param password Contraseña del nuevo usuario
   * @returns Observable con las credenciales del usuario recién creado (incluye el UID)
   */
  register(email: string, password: string): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  /**
   * Método mediante el cual cerraremos la sesión del usuario autenticado.
   * @returns Observable que se completa al cerrar sesión correctamente
   */
  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

}