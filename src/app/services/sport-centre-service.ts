import { inject, Injectable } from '@angular/core';
import { child, Database, listVal, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { Storage, ref as refStorage, deleteObject } from '@angular/fire/storage';
import { map, Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Sport_Centre } from '../models/Sport_Centre';

@Injectable({
  providedIn: 'root',
})
export class SportCentreService {

  /*Nombre de la Colección Principal donde almacenamos todos los centros deportivos*/
  private COLLECTION_NAME = 'Sports-Centre';

  private database = inject(Database);
  private storage = inject(Storage);

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
   * Método para eliminar completamente un centro deportivo (RTDB + Storage)
   * @param uid Identificador del centro deportivo (clave del nodo)
   * @param fotoUrl URL de la foto almacenada en Storage para su eliminación física
   * @returns Observable que se completa tras eliminar ambos recursos
   */
  deleteSportCentreComplete(uid: string, fotoUrl: string | null): Observable<void> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    const deleteDb$ = from(remove(centreRef));

    /*Si el centro tiene foto en Storage, procedemos a su eliminación antes de borrar el nodo*/
    if (fotoUrl && fotoUrl.trim() !== '' && fotoUrl.startsWith('http')) {
      const storageRef = refStorage(this.storage, fotoUrl);
      return from(deleteObject(storageRef)).pipe(
        catchError(error => {
          /*Si la foto no existe o da error, permitimos que el flujo continúe para borrar los datos*/
          console.warn('Error al eliminar foto de Storage, procediendo con DB:', error);
          return of(null);
        }),
        switchMap(() => deleteDb$)
      );
    }

    /*Si no hay foto, eliminamos directamente el nodo de la base de datos*/
    return deleteDb$;
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