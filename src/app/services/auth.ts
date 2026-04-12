import { Injectable, inject } from '@angular/core';
import { Auth, authState, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User, UserCredential } from '@angular/fire/auth';
import { from, map, Observable, of, switchMap } from 'rxjs';
import { Rol } from '../enums/Rol';
import { child, Database, objectVal } from '@angular/fire/database';
import { ref } from 'firebase/database';
import { onAuthStateChanged, getAuth, signOut as secondarySignOut } from 'firebase/auth';
import { initializeApp, getApp } from '@angular/fire/app';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  public auth = inject(Auth);
  private database = inject(Database);
  private authState$ = authState(this.auth);

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
   * Método especializado para la creación de usuarios por parte de un administrador.
   * Crea una instancia secundaria de Firebase para evitar el cierre de sesión del usuario actual,
   * envía el correo de verificación y limpia la sesión secundaria.
   * @param email Correo electrónico del nuevo usuario
   * @param password Contraseña provisional del nuevo usuario
   * @returns Observable con las credenciales del usuario creado
   */
  registerByAdmin(email: string, password: string): Observable<UserCredential> {
    const secondaryApp = initializeApp(getApp().options, 'SecondaryApp');
    const secondaryAuth = getAuth(secondaryApp);

    return from(createUserWithEmailAndPassword(secondaryAuth, email, password)).pipe(
      switchMap(async (credential) => {
        await sendEmailVerification(credential.user);
        await secondarySignOut(secondaryAuth);
        return credential;
      })
    );
  }

  /**
   * Método mediante el cual cerraremos la sesión del usuario autenticado.
   * @returns Observable que se completa al cerrar sesión correctamente
   */
  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  /**
   * Método que nos devuelve en tiempo real el usuario autenticado o bien null si no hay sesión
   * @returns Observable con el usuario autenticado o bien null
   */
  getCurrentUser(): Observable<User | null> {
    return this.authState$;
  }

  /**
   * Devuelve un observable con la información del usuario autenticado
   * @returns Observable<User | null>
   */
  getUserAuthenticated(): Observable<User | null> {
    return new Observable((observer) => {
      onAuthStateChanged(
        this.auth,
        (user) => observer.next(user),
        (error) => observer.error(error)
      );
    });
  }

  /**
   * Método que obtiene el rol del usuario autenticado leyendo su nodo en RTDB.
   * Emite null si no hay sesión activa.
   * @returns Observable con el Rol del usuario o null
   */
  getRol(): Observable<Rol | null> {
    return this.authState$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        const personRef = child(ref(this.database), `/Persons/${user.uid}`);
        return objectVal<{ rol: Rol }>(personRef).pipe(
          map(person => person?.rol ?? null)
        );
      })
    );
  }

  /**
 * Metodo mediante el cual enviaremos un correo de restablecimiento de contraseña via Firebase Auth
 */
  sendPasswordResetEmail(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

}