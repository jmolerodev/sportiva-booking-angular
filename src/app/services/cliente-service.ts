import { inject, Injectable } from '@angular/core';
import { child, Database, equalTo, listVal, objectVal, orderByChild, query, ref, remove, set, update } from '@angular/fire/database';
import { map, Observable, take } from 'rxjs';
import { Cliente } from '../models/Cliente';
import { ICliente } from '../interfaces/Cliente-Interface';
import { FunctionsService } from './functions-service';

@Injectable({
  providedIn: 'root',
})
export class ClienteService {

  /* Nombre de la Colección Principal donde almacenamos a todos los usuarios, de forma independiente a su Rol */
  private COLLECTION_NAME = 'Persons';

  private database         = inject(Database);
  private functionsService = inject(FunctionsService);

  /**
   * Método mediante el cual obtenemos los datos de un cliente a través de su UID
   * @param uid Identificador único del cliente
   * @returns Observable con los datos del cliente (o null si no existe)
   */
  getClienteByUid(uid: string): Observable<Cliente | null> {
    const clienteRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return objectVal(clienteRef);
  }

  /**
   * Método para obtener todos los clientes registrados en la plataforma
   * @returns Observable con la lista de clientes
   */
  getAllClientes(): Observable<Cliente[] | null> {
    const clientesRef = query(ref(this.database, `/${this.COLLECTION_NAME}`), orderByChild('rol'), equalTo('CLIENTE'));
    return listVal(clientesRef, { keyField: 'uid' }) as Observable<Cliente[] | null>;
  }

  /**
   * Método para comprobar si un DNI ya está registrado en la base de datos
   * @param dni DNI a verificar
   * @returns Observable booleano: true si el DNI ya existe, false si está disponible
   */
  isDniAlreadyRegistered(dni: string): Observable<boolean> {
    const dniQuery = query(
      ref(this.database, `/${this.COLLECTION_NAME}`),
      orderByChild('dni'),
      equalTo(dni)
    );

    return listVal(dniQuery).pipe(
      take(1),
      map((results) => results.length > 0)
    );
  }

  /**
   * Método para vincular un cliente a un centro deportivo activando su suscripción
   * @param clienteUid UID del cliente a vincular
   * @param centroUid UID del centro deportivo
   * @returns Promesa que se resuelve al completar la vinculación
   */
  vincularClienteACentro(clienteUid: string, centroUid: string): Promise<void> {
    const clienteRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${clienteUid}`);
    return update(clienteRef, { centroId: centroUid, is_active: true });
  }

  /**
   * Método para desvincular un cliente de su centro deportivo desactivando su suscripción
   * @param clienteUid UID del cliente a desvincular
   * @returns Promesa que se resuelve al completar la desvinculación
   */
  desvincularClienteDeCentro(clienteUid: string): Promise<void> {
    const clienteRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${clienteUid}`);
    return update(clienteRef, { centroId: null, is_active: false });
  }

  /**
   * Método para activar o desactivar manualmente la suscripción de un cliente
   * @param clienteUid UID del cliente
   * @param isActive Nuevo estado de la suscripción
   * @returns Promesa que se resuelve al completar la actualización
   */
  toggleIsActive(clienteUid: string, isActive: boolean): Promise<void> {
    const clienteRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${clienteUid}`);
    return update(clienteRef, { is_active: isActive });
  }

  /**
   * Actualizar la información de un cliente utilizando la interfaz ICliente
   * @param uid UID del cliente
   * @param data Objeto parcial con los campos de ICliente a modificar
   * @returns Promesa que se resuelve una vez se actualicen los datos
   */
  updateCliente(uid: string, data: Partial<ICliente>): Promise<void> {
    const clienteRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return update(clienteRef, data);
  }

  /**
   * Eliminar completamente a un cliente de la base de datos y de Firebase Authentication
   * @param uid UID del cliente a eliminar
   * @returns Promesa que se resuelve al completar la operación
   */
  async deleteCliente(uid: string): Promise<void> {
    const clienteRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);

    /* Eliminamos el nodo del cliente en Realtime Database y simultáneamente en Auth */
    await Promise.all([
      remove(clienteRef),
      this.functionsService.deleteUserFromAuth(uid)
    ]);
  }

  /**
   * Guardar los datos de un nuevo cliente en la base de datos
   * @param uid UID asignado al cliente
   * @param cliente Objeto con los datos del cliente
   * @returns Promesa que se resuelve al finalizar el guardado
   */
  saveCliente(uid: string, cliente: any): Promise<void> {
    const clienteRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return set(clienteRef, cliente);
  }
}