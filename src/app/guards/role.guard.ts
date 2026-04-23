import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { Database, ref, child, get } from '@angular/fire/database';
import { from, switchMap, of } from 'rxjs';
import { Rol } from '../enums/Rol';

/* Nombre de la colección principal de usuarios, igual que en ClienteService */
const COLLECTION_NAME = 'Persons';

/**
 * Factoría que genera un guard de acceso basado en roles.
 * Consulta el rol del usuario autenticado directamente desde Realtime Database.
 *
 * @param rolesPermitidos Lista de roles (Rol[]) que tienen acceso a la ruta protegida
 * @returns CanActivateFn que permite o deniega el acceso según el rol del usuario
 */
export function roleGuard(rolesPermitidos: Rol[]): CanActivateFn {
  return () => {
    const auth     = inject(Auth);
    const database = inject(Database);
    const router   = inject(Router);

    /* Observamos el estado de autenticación actual */
    return from(user(auth)).pipe(
      switchMap((currentUser) => {

        /* Si no hay usuario autenticado, redirigimos al login */
        if (!currentUser) {
          router.navigate(['/login']);
          return of(false);
        }

        /* Consultamos el nodo del usuario en Realtime Database para obtener su rol */
        const userRef = child(ref(database), `/${COLLECTION_NAME}/${currentUser.uid}`);

        return from(get(userRef)).pipe(
          switchMap((snapshot) => {

            /* Si el nodo no existe en la base de datos, redirigimos al login por seguridad */
            if (!snapshot.exists()) {
              router.navigate(['/login']);
              return of(false);
            }

            const userData  = snapshot.val();
            const rol: Rol  = userData?.rol;

            /* Comprobamos si el rol del usuario está entre los permitidos */
            if (rolesPermitidos.includes(rol)) {
              return of(true);
            }

            /* Si no tiene permiso, redirigimos al home */
            router.navigate(['/home']);
            return of(false);
          })
        );
      })
    );
  };
}