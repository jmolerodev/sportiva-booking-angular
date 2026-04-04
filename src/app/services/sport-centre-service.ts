import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { child, Database, listVal, objectVal, ref, remove, set, update, query, orderByChild, equalTo } from '@angular/fire/database';
import { Storage, ref as refStorage, deleteObject } from '@angular/fire/storage';
import { map, Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ISportCentre } from '../interfaces/Sport-Centre-Interface';

@Injectable({ providedIn: 'root' })
export class SportCentreService {

  private COLLECTION_NAME = 'Sports-Centre';
  private PERSONS_COLLECTION = 'Persons';
  private database = inject(Database);
  private storage  = inject(Storage);
  private injector = inject(Injector);

  /*Obtiene un centro por su ID*/
  getSportCentreByUid(uid: string): Observable<ISportCentre | null> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(centreRef);
  }

  /*Obtiene el centro de un administrador*/
  getSportCentreByAdminUid(adminUid: string): Observable<ISportCentre | null> {
    return runInInjectionContext(this.injector, () =>
      listVal<ISportCentre>(ref(this.database, `/${this.COLLECTION_NAME}`))
    ).pipe(
      map(centros => centros?.find(c => c.adminUid == adminUid) ?? null)
    );
  }

  /**
   * Obtiene el centro donde trabaja un profesional de forma directa usando su 'centroId'
   */
  getSportCentreByProfessionalUid(proUid: string): Observable<ISportCentre | null> {
    const proRef = child(ref(this.database), `${this.PERSONS_COLLECTION}/${proUid}/centroId`);
    
    return objectVal<string>(proRef).pipe(
      switchMap(centroId => {
        if (!centroId) return of(null);
        return this.getSportCentreByUid(centroId);
      })
    );
  }

  /* Lista todos los centros */
  getAllSportCentres(): Observable<ISportCentre[]> {
    return runInInjectionContext(this.injector, () =>
      listVal<ISportCentre>(ref(this.database, `/${this.COLLECTION_NAME}`))
    );
  }

  /**
   * Obtiene todos los profesionales
   */
  getAllProfessionals(): Observable<any[]> {
    return runInInjectionContext(this.injector, () => {
      const personsRef = ref(this.database, this.PERSONS_COLLECTION);
      const proQuery = query(personsRef, orderByChild('rol'), equalTo('PROFESIONAL'));
      
      // listVal con keyField 'uid' recupera automáticamente el ID del nodo
      return listVal<any>(proQuery, { keyField: 'uid' }).pipe(
        map(usuarios => usuarios || []),
        catchError(() => of([]))
      );
    });
  }

  /**
   * Vincula un profesional a un centro deportivo (Nodo Persons)
   */
  vincularProfesionalACentro(proUid: string, centroUid: string): Promise<void> {
    const proRef = child(ref(this.database), `${this.PERSONS_COLLECTION}/${proUid}`);
    return update(proRef, { centroId: centroUid });
  }

  /**
   * Desvincula a un profesional dejándolo libre (Nodo Persons)
   */
  desvincularProfesionalDeCentro(proUid: string): Promise<void> {
    const proRef = child(ref(this.database), `${this.PERSONS_COLLECTION}/${proUid}`);
    return update(proRef, { centroId: null });
  }

  /* Actualización parcial del centro (Nodo Sports-Centre) */
  updateSportCentre(uid: string, data: Partial<ISportCentre>): Promise<void> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return update(centreRef, data);
  }

  /* Eliminación completa de DB y Storage */
  deleteSportCentreComplete(uid: string, fotoUrl: string | null): Observable<void> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    const deleteDb$ = from(remove(centreRef));

    if (fotoUrl && fotoUrl.startsWith('http')) {
      const storageRef = refStorage(this.storage, fotoUrl);
      return from(deleteObject(storageRef)).pipe(
        catchError(() => of(null)),
        switchMap(() => deleteDb$)
      );
    }
    return deleteDb$;
  }

  /* Guardado total */
  saveSportCentre(uid: string, centre: ISportCentre): Promise<void> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return set(centreRef, centre);
  }
}