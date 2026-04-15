import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { child, Database, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Profesional } from '../models/Profesional';
import { IProfesional } from '../interfaces/Profesional-Interface';

@Injectable({ providedIn: 'root' })
export class ProfesionalService {

  /*Nombre de la Colección Principal donde almacenamos a todos los usuarios, de forma independiente a su Rol*/
  private COLLECTION_NAME = 'Persons';

  private database = inject(Database);
  private injector = inject(Injector);

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
        map(especialidad  => especialidad ?? null),
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
   * Método para eliminar completamente a un profesional de la base de datos
   * @param uid UID del profesional que vamos a eliminar
   * @returns Promesa que se resuelve al completar la operación
   */
  deleteProfesional(uid: string): Promise<void> {
    const profesionalRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return remove(profesionalRef);
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