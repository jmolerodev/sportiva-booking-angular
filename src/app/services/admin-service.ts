import { inject, Injectable } from '@angular/core';
import { child, Database, listVal, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Administrador } from '../models/Administrador';
import { Rol } from '../enums/Rol';


@Injectable({
  providedIn: 'root',
})
export class AdminService {

  /* Nombre de la Colección Principal donde almacenamos a todos los usuarios, de forma independiente a su Rol */
  private COLLECTION_NAME = 'Persons';

  private database = inject(Database);


  /**
   * Método mediante el cual obtenemos los datos de un administrador a través de su UID
   * @param uid UID del Administrador
   * @returns Observable con los datos del Administrador (o null en caso de no encontrarlo mediante el identificador)
   */
  getAdministradorByUid(uid: string): Observable<Administrador | null> {
    const adminRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(adminRef);
  }

 /**
 * Método mediante el cual obtenemos la lista completa de Administradores registrados en el sistema,
 * filtrando del nodo 'Persons' únicamente aquellos cuyo rol sea ADMINISTRADOR
 * @returns Observable con un array de objetos que contienen el UID y los datos de cada Administrador
 */
getAllAdministradores(): Observable<{ uid: string; data: Administrador }[]> {
  const personsRef = ref(this.database, `/${this.COLLECTION_NAME}`);

  return listVal<Administrador & { uid: string }>(personsRef, { keyField: 'uid' }).pipe(
    map(persons =>
      (persons ?? [])
        .filter(p => p.rol == Rol.ADMINISTRADOR)
        .map(({ uid, ...data }) => ({ uid, data: data as Administrador }))
    )
  );
}
  /**
   * Método mediante el que podremos actualizar la información de un Administrador ya existente
   * @param uid UID del Administrador que deseamos modificar
   * @param data Objeto Parcial con los datos del administrador a modificar
   * @returns Promesa que se resuelve una vez que los datos sean actualizados
   */
  updateAdministrador(uid: string, data: Partial<Administrador>): Promise<void> {
    const adminRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return update(adminRef, data);
  }

  /**
   * Método mediante el cual podremos eliminar a un Administrador de nuestra Base de Datos
   * @param uid UID del Administrador que deseamos eliminar
   * @returns Promesa que se resuelve una vez que se complete la operación
   */
  deleteAdministrador(uid: string): Promise<void> {
    const adminRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return remove(adminRef);
  }

  /**
   * Método mediante el cual podremos guardar a un Administrador dentro de nuestra Base de Datos
   * @param uid UID del Administrador que deseamos guardar en nuestra colección 'Persons'
   * @param administrador Objeto con los datos del administrador (puede estar tipado o no)
   * @returns Promesa que se resuelve una vez que se haya finalizado el guardado
   */
  saveAdministrador(uid: string, administrador: any): Promise<void> {
    const adminRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return set(adminRef, administrador);
  }
}