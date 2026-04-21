import { inject, Injectable } from '@angular/core';
import { child, Database, listVal, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Administrador } from '../models/Administrador';
import { IAdministrador } from '../interfaces/Administrador-Interface';
import { Rol } from '../enums/Rol';
import { IProfesional } from '../interfaces/Profesional-Interface';

@Injectable({
  providedIn: 'root',
})
export class AdminService {

  /* Nombre de la Colección Principal donde almacenamos a todos los usuarios */
  private COLLECTION_NAME = 'Persons';

  /* Nombre de la Colección donde se almacenan los centros deportivos */
  private CENTRES_COLLECTION = 'Sports-Centre';

  private database = inject(Database);

  /**
   * Método mediante el cual obtenemos los datos de un administrador a través de su UID
   * @param uid UID del Administrador
   * @returns Observable con los datos del Administrador (o null si no existe)
   */
  getAdministradorByUid(uid: string): Observable<Administrador | null> {
    const adminRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(adminRef);
  }

  /**
   * Método mediante el cual obtenemos la lista completa de Administradores registrados,
   * filtrando del nodo 'Persons' únicamente aquellos con rol ADMINISTRADOR
   * @returns Observable con un array de objetos (UID y datos) de cada Administrador
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
   * Método para actualizar la información de un Administrador
   * @param uid UID del Administrador que deseamos modificar
   * @param data Objeto parcial con los campos a modificar
   * @returns Promesa que se resuelve tras la actualización
   */
  updateAdministrador(uid: string, data: Partial<IAdministrador>): Promise<void> {
    const adminRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return update(adminRef, data);
  }

  /**
   * Obtiene los profesionales vinculados a un administrador específico
   * @param adminUid UID del administrador propietario
   * @returns Observable con el listado de profesionales (UID y datos)
   */
  getProfesionalesByAdmin(adminUid: string): Observable<{ uid: string; data: IProfesional }[]> {
    const personsRef = ref(this.database, `/${this.COLLECTION_NAME}`);

    return listVal<IProfesional & { uid: string }>(personsRef, { keyField: 'uid' }).pipe(
      map(persons =>
        (persons ?? [])
          .filter(p => p.rol === Rol.PROFESIONAL && p.adminId === adminUid)
          .map(({ uid, ...data }) => ({ uid, data: data as IProfesional }))
      )
    );
  }

  /**
   * Elimina de forma atómica tanto el perfil del administrador como su centro deportivo asociado.
   * Se utiliza update en la raíz para garantizar que ambas eliminaciones se procesen como una sola transacción.
   * @param uid UID del Administrador y clave del Centro Deportivo a eliminar
   * @returns Promesa que se completa al finalizar la operación en ambos nodos
   */
  deleteAdministrador(uid: string): Promise<void> {
    // Definimos las rutas exactas de los nodos a eliminar
    const adminPath = `/${this.COLLECTION_NAME}/${uid}`;
    const centrePath = `/${this.CENTRES_COLLECTION}/${uid}`;

    // Ejecutamos la actualización atómica pasando null a ambas rutas para borrarlas
    return update(ref(this.database), {
      [adminPath]: null,
      [centrePath]: null
    });
  }

  /**
   * Método mediante el cual podremos guardar a un Administrador en la colección 'Persons'
   * @param uid UID del Administrador
   * @param administrador Objeto con los datos del administrador
   * @returns Promesa que se resuelve tras el guardado
   */
  saveAdministrador(uid: string, administrador: any): Promise<void> {
    const adminRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return set(adminRef, administrador);
  }
}