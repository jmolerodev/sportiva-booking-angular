import { inject, Injectable } from '@angular/core';
import { child, Database, listVal, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { Storage, ref as refStorage, deleteObject } from '@angular/fire/storage';
import { map, Observable, from, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { ISportCentre } from '../interfaces/Sport-Centre-Interface';

@Injectable({ providedIn: 'root' })
export class SportCentreService {

  private COLLECTION_NAME = 'Sports-Centre';
  private database = inject(Database);
  private storage  = inject(Storage);

  private allSportCentres$ = listVal<ISportCentre>(ref(this.database, `/${this.COLLECTION_NAME}`));

  /* Obtiene un centro por su ID */
  getSportCentreByUid(uid: string): Observable<ISportCentre | null> {
    const centreRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(centreRef);
  }

  /* Obtiene el centro de un administrador */
  getSportCentreByAdminUid(adminUid: string): Observable<ISportCentre | null> {
    return this.allSportCentres$.pipe(
      map(centros => centros?.find(c => c.adminUid == adminUid) ?? null)
    );
  }

  /* Lista todos los centros */
  getAllSportCentres(): Observable<ISportCentre[]> {
    return this.allSportCentres$;
  }

  /* Actualización parcial */
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