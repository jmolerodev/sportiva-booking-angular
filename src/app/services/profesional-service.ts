import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { child, Database, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { map, Observable, of, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Profesional } from '../models/Profesional';
import { IProfesional } from '../interfaces/Profesional-Interface';
import { SessionService } from './session-service';

@Injectable({ providedIn: 'root' })
export class ProfesionalService {

  /* Nombre de la Colección Principal donde almacenamos a todos los usuarios, de forma independiente a su Rol */
  private COLLECTION_NAME = 'Persons';

  private database       = inject(Database);
  private injector       = inject(Injector);
  private sessionService = inject(SessionService);

  /**
   * Método para obtener los datos de un profesional a través de su UID
   * @param uid Identificador único del profesional
   * @returns Observable con los datos del profesional (o bien null si no existe)
   */
  getProfesionalByUid(uid: string): Observable<Profesional | null> {
    const profesionalRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(profesionalRef);
  }

  /**
   * Obtiene únicamente el campo especialidad del nodo del profesional en Firebase
   * @param uid UID del profesional del que queremos recuperar la especialidad
   * @returns Observable con la especialidad como string, o null si no existe el nodo
   */
  getEspecialidadByUid(uid: string): Observable<string | null> {
    return runInInjectionContext(this.injector, () => {
      const especialidadRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}/especialidad`);
      return objectVal<string>(especialidadRef).pipe(
        map(especialidad => especialidad ?? null),
        catchError(() => of(null))
      );
    });
  }

  /**
   * Metodo para actualizar la información utilizando la interfaz IProfesional
   * @param uid UID del profesional
   * @param data Objeto parcial con los campos de IProfesional (aquí ya entrará centroId)
   */
  updateProfesional(uid: string, data: Partial<IProfesional>): Promise<void> {
    const profesionalRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return update(profesionalRef, data);
  }

  /**
   * Elimina completamente a un profesional del sistema en cascada:
   *   1. Recupera todas las sesiones creadas por el profesional.
   *   2. Por cada sesión invoca {@link SessionService.deleteSession} que a su vez
   *      elimina todas las Bookings vinculadas antes de borrar el nodo de sesión.
   *   3. Una vez limpios los nodos dependientes, elimina el nodo del profesional en Persons.
   * @param uid UID del profesional a eliminar junto con todos sus datos asociados
   * @returns Promesa que se resuelve cuando la eliminación en cascada ha finalizado
   */
  async deleteProfesionalCompleto(uid: string): Promise<void> {

    /* Paso 1: obtenemos la lista de sesiones del profesional (primera emisión) */
    const sesiones = await firstValueFrom(
      this.sessionService.getSessionsByProfesional(uid).pipe(catchError(() => of([])))
    );

    /* Paso 2: eliminamos cada sesión junto con sus reservas en paralelo */
    await Promise.all(
      sesiones.map(sesion =>
        firstValueFrom(
          this.sessionService.deleteSession((sesion as any).uid).pipe(catchError(() => of(void 0)))
        )
      )
    );

    /* Paso 3: eliminamos el nodo del profesional en Persons */
    const profesionalRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    await remove(profesionalRef);
  }

  /**
   * Método para guardar los datos de un nuevo profesional dentro de la base de datos
   * @param uid UID asignado al profesional
   * @param profesional Objeto con los datos del profesional que deseamos guardar (puede estar tipado o no)
   * @returns Promesa que se resuelve una vez haya finalizado el guardado
   */
  saveProfesional(uid: string, profesional: any): Promise<void> {
    const profesionalRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return set(profesionalRef, profesional);
  }
}