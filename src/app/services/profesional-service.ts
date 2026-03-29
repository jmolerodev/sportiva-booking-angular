import { inject, Injectable } from '@angular/core';
import { child, Database, objectVal, ref, remove, set, update } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { Profesional } from '../models/Profesional';

@Injectable({
  providedIn: 'root',
})
export class ProfesionalService {
  
  /*Nombre de la Colección Principal donde almacenamos a todos los usuarios, de forma independiente a su Rol*/
  private COLLECTION_NAME = 'Persons';

  private database = inject(Database);


  /**
   * Método para obtener los datos de un profesional a través de su UID
   * @param uid Identificador único del profesional
   * @returns Observable con los datos del profesional (o bien null si no existe)
   */
  getProfesionalByUid (uid : string) : Observable <Profesional | null > {
    const profesionalRef = child (ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(profesionalRef);
  }

  /**
   * Metodo para actualizar la información de un profesional ya existente
   * @param uid UID del profesional 
   * @param data Objeto parcial con los campos del profesional a modificar
   * @returns Promesa que se resuelve una vez que se actualicen los datos
   */
  updateProfesional (uid : string, data : Partial <Profesional>) : Promise <void>{
     const profesionalRef = child (ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
     return update (profesionalRef, data);
  }


  /**
   * Método para eliminar completamente a un profesional de la base de datos
   * @param uid UID del profesional que vamos a eliminar
   * @returns Promesa que se resuelve al completar la operación
   */
  deleteProfesional (uid : string) : Promise <void>{
    const profesionalRef = child (ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return remove (profesionalRef);
  }

  /**
   * Método para guardar los datos de un nuevo profesional dentro de la base de datos
   * @param uid UID asignado al profesional
   * @param profesional Objeto con los datos del profesional que deseamos guardar (puede estar tipado o no)
   * @returns Promesa que se resuelve una vez haya finalizado el guardado
   */
  saveProfesional (uid : string, profesional : any) : Promise <void>{
    const profesionalRef = child (ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return set (profesionalRef, profesional);
  }


}
