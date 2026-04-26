import { inject, Injectable } from '@angular/core';
import { child, Database, listVal, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { firstValueFrom, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Administrador } from '../models/Administrador';
import { IAdministrador } from '../interfaces/Administrador-Interface';
import { Rol } from '../enums/Rol';
import { IProfesional } from '../interfaces/Profesional-Interface';
import { FunctionsService } from './functions-service';
import { ProfesionalService } from './profesional-service';

@Injectable({
  providedIn: 'root',
})
export class AdminService {

  /* Nombre de la Colección Principal donde almacenamos a todos los usuarios */
  private COLLECTION_NAME = 'Persons';

  /* Nombre de la Colección donde se almacenan los centros deportivos */
  private CENTRES_COLLECTION = 'Sports-Centre';

  private database           = inject(Database);
  private functionsService   = inject(FunctionsService);
  private profesionalService = inject(ProfesionalService);

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
   * Elimina de forma completamente recursiva al administrador y todos sus datos asociados:
   *   1. Recupera todos los profesionales vinculados al administrador.
   *   2. Por cada profesional invoca {@link ProfesionalService.deleteProfesionalCompleto} que a su
   *      vez elimina sus sesiones, las reservas de cada sesión y al propio profesional de Auth.
   *   3. Elimina de forma atómica el nodo del administrador en Persons y su centro en Sports-Centre.
   *   4. Elimina al administrador de Firebase Authentication.
   * @param uid UID del Administrador y clave del Centro Deportivo a eliminar
   * @returns Promesa que se completa al finalizar la eliminación recursiva en todos los nodos
   */
  async deleteAdministrador(uid: string): Promise<void> {

    /* Paso 1: obtenemos la lista de profesionales vinculados al admin (primera emisión) */
    const profesionales = await firstValueFrom(this.getProfesionalesByAdmin(uid));

    /* Paso 2: eliminamos cada profesional junto con sus sesiones y reservas en paralelo */
    await Promise.all(
      profesionales.map(p => this.profesionalService.deleteProfesionalCompleto(p.uid))
    );

    /* Paso 3: eliminamos de forma atómica el nodo del admin y su centro deportivo */
    const adminPath  = `/${this.COLLECTION_NAME}/${uid}`;
    const centrePath = `/${this.CENTRES_COLLECTION}/${uid}`;

    await update(ref(this.database), {
      [adminPath]:  null,
      [centrePath]: null
    });

    /* Paso 4: eliminamos al administrador de Firebase Authentication */
    await this.functionsService.deleteUserFromAuth(uid);
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