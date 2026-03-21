import { Injectable } from '@angular/core';
import { Database, objectVal,child, ref, remove, set, update } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { Cliente } from '../models/Cliente';

@Injectable({
  providedIn: 'root',
})
export class PersonService {


  /*Nombre la Colección Principal donde almacenamos a todos los usuarios, de forma independiente a su Rol*/
  private COLLECTION_NAME = 'Persons';


  /*Constructor del Servicio*/
  constructor(private database: Database) {

  }

  /**
   * Método para obtener los datos de un cliente a través de su UID
   * @param uid Identificador único del cliente
   * @returns Observable con los datos del cliente (o null si no existe)
   */
  getClienteByUid(uid: string): Observable<Cliente | null> {
    const clienteRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(clienteRef);
  }

  /**
   * Método para actualizar la información de un cliente ya existente
   * @param uid UID del cliente
   * @param data Objeto parcial con los campos del cliente a modificar
   * @returns Promesa que se resuelve una vez se actualicen los datos
   */
  updateCliente(uid: string, data: Partial<Cliente>): Promise<void> {
    const clienteRef = ref(this.database, `/${this.COLLECTION_NAME}/${uid}`);
    return update(clienteRef, data);
  }

  /**
   * Método para eliminar completamente a un cliente de la base de datos
   * @param uid UID del cliente a eliminar
   * @returns Promesa que se resuelve al completar la operación
   */
  deleteCliente(uid: string): Promise<void> {
    const clienteRef = ref(this.database, `/${this.COLLECTION_NAME}/${uid}`);
    return remove(clienteRef);
  }

  /**
   * Método para guardar los datos de un nuevo cliente en la base de datos
   * @param uid UID asignado al cliente
   * @param cliente Objeto con los datos del cliente (puede estar tipado o no)
   * @returns Promesa que se resuelve al finalizar el guardado
   */
  saveCliente(uid: string, cliente: any): Promise<void> {
    const clienteRef = ref(this.database, `/${this.COLLECTION_NAME}/${uid}`);
    return set(clienteRef, cliente);
  }


}
