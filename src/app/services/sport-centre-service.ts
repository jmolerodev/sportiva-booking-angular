import { inject, Injectable } from '@angular/core';
import { child, Database, listVal, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { map, Observable } from 'rxjs';
import { Sport_Centre } from '../models/Sport_Centre';

@Injectable({
  providedIn: 'root',
})
export class SportCentreService {

  /*Nombre de la Colección Principal donde almacenamos todos los centros deportivos*/
  private COLLECTION_NAME = 'Sports-Centre';

  private database = inject(Database);

  
  private allSportCentres$ = listVal<Sport_Centre>(ref(this.database, `/${this.COLLECTION_NAME}`));

  /**
   * Método para obtener los datos de un centro deportivo a través de su UID
   * @param uid Identificador único del centro deportivo
   * @returns Observable con los datos del centro deportivo (o bien null si no existe)
   */
  getSportCentreByUid(uid: string): Observable<Sport_Centre | null> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(centreRef);
  }

  /**
 * Método para obtener el centro deportivo de un administrador a través de su UID
 * @param adminUid UID del administrador
 * @returns Observable con el centro deportivo del administrador o null si no tiene
 */
  getSportCentreByAdminUid(adminUid: string): Observable<Sport_Centre | null> {
    return this.allSportCentres$.pipe(
      map(centros => centros?.find(c => c.adminUid == adminUid) ?? null)
    );
  }

  /**
   * Método para obtener todos los centros deportivos disponibles
   * @returns Observable con la lista de todos los centros deportivos
   */
  getAllSportCentres(): Observable<Sport_Centre[]> {
    return this.allSportCentres$;
  }

  /**
   * Método con el que actualizaremos la información de un centro deportivo ya existente
   * @param uid Identificador del centro deportivo que deseamos actualizar
   * @param data Objeto parcial con los datos del Centro Deportivo a modificar
   * @returns Promesa que se resuelve una vez los datos ya han sido actualizados
   */
  updateSportCentre(uid: string, data: Partial<Sport_Centre>): Promise<void> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return update(centreRef, data);
  }

  /**
   * Método para eliminar completamente un centro deportivo de nuestra base de datos
   * @param uid Identificador del Centro Deportivo que vamos a eliminar
   * @returns Promesa que se resuelve una vez se ha completado la operación
   */
  deleteSportCentre(uid: string): Promise<void> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return remove(centreRef);
  }

  /**
   * Método para guardar los datos de un nuevo centro deportivo dentro de la base de datos
   * @param uid Identificador asignado al nuevo Centro Deportivo
   * @param centre Objeto con los datos del centro deportivo que deseamos guardar
   * @returns Promesa que se resuelve una vez haya finalizado la inserción
   */
  saveSportCentre(uid: string, centre: any): Promise<void> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return set(centreRef, centre);
  }

}