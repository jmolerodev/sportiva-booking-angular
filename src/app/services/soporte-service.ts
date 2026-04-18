import { inject, Injectable } from '@angular/core';
import { Database, equalTo, listVal, onValue, orderByChild, push, query, ref, set, update } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { ISoporteChat } from '../interfaces/SoporteChar-Interface';
import { IMensaje } from '../interfaces/Mensaje-Interface';
import { EstadoChat } from '../enums/EstadoChat';

@Injectable({
  providedIn: 'root',
})
export class SoporteService {

  /* Nombre del nodo principal de soporte en Firebase RTDB */
  private COLLECTION_NAME = 'Supports';
  private database = inject(Database);

  /**
   * Obtiene en tiempo real todos los chats de soporte asociados a un cliente.
   * @param clienteId UID del cliente autenticado
   * @returns Observable con la lista de chats del cliente
   */
  getChatsByCliente(clienteId: string): Observable<ISoporteChat[] | null> {
    const chatQuery = query(
      ref(this.database, `/${this.COLLECTION_NAME}`),
      orderByChild('clienteId'),
      equalTo(clienteId)
    );
    return listVal(chatQuery, { keyField: 'uid' }) as Observable<ISoporteChat[] | null>;
  }

  /**
   * Obtiene en tiempo real todos los chats de soporte vinculados a un centro deportivo.
   * @param centroId UID del centro deportivo administrado
   * @returns Observable con la lista de chats del centro
   */
  getChatsByCentro(centroId: string): Observable<ISoporteChat[] | null> {
    const chatQuery = query(
      ref(this.database, `/${this.COLLECTION_NAME}`),
      orderByChild('centroId'),
      equalTo(centroId)
    );
    return listVal(chatQuery, { keyField: 'uid' }) as Observable<ISoporteChat[] | null>;
  }

  /**
   * Escucha en tiempo real los mensajes de un chat concreto.
   * Usa un Observable manual con onValue para reaccionar al instante
   * ante cualquier nuevo mensaje sin necesidad de recargar.
   * @param chatId UID del nodo SoporteChat en Firebase
   * @returns Observable con la lista de mensajes ordenados cronológicamente
   */
  getMensajesByChat(chatId: string): Observable<IMensaje[]> {
    return new Observable(observer => {
      const mensajesRef = ref(this.database, `/${this.COLLECTION_NAME}/${chatId}/mensajes`);
      const unsubscribe = onValue(mensajesRef, snapshot => {
        const mensajes: IMensaje[] = [];
        snapshot.forEach(child => {
          mensajes.push({ uid: child.key, ...child.val() } as any);
        });
        observer.next(mensajes);
      }, error => observer.error(error));

      /* Cancelamos la suscripción de Firebase cuando el Observable se destruye */
      return () => unsubscribe();
    });
  }

  /**
 * Crea una nueva solicitud de chat de soporte por parte del cliente.
 * El chat se inicializa en estado PENDIENTE hasta que el admin lo gestione.
 * Se separan las escrituras en dos operaciones para evitar el conflicto de
 * rutas ancestro/descendiente que Firebase no permite en un único update().
 * @param data Objeto con centroId, clienteId, adminId y el primer mensaje
 * @returns Promesa que se resuelve cuando el nodo queda creado en Firebase
 */
async solicitarChat(data: {
  centroId:      string;
  clienteId:     string;
  adminId:       string;
  primerMensaje: string;
}): Promise<void> {
  const collectionRef = ref(this.database, `/${this.COLLECTION_NAME}`);
  const newChatRef    = push(collectionRef);
  const chatId        = newChatRef.key!;
  const ahora         = Date.now();

  const chatData: ISoporteChat = {
    centroId:           data.centroId,
    clienteId:          data.clienteId,
    adminId:            data.adminId,
    estado:             EstadoChat.PENDIENTE,
    fechaCreacion:      ahora,
    fechaUltimoMensaje: ahora,
  };

  /* 1.- Escribimos la cabecera del chat */
  await set(newChatRef, chatData);

  /* 2.- Escribimos el primer mensaje como subárbol ya existente */
  const mensajesRef       = ref(this.database, `/${this.COLLECTION_NAME}/${chatId}/mensajes`);
  const primerMensajeRef  = push(mensajesRef);

  const primerMensajeData: IMensaje = {
    emisorId: data.clienteId,
    texto:    data.primerMensaje,
    fecha:    ahora,
  };

  return set(primerMensajeRef, primerMensajeData);
}

  /**
   * Envía un mensaje de texto dentro de un chat de soporte ya existente.
   * Actualiza simultáneamente el subárbol de mensajes y el timestamp
   * del nodo raíz para facilitar ordenaciones por actividad reciente.
   * @param chatId   UID del chat de soporte
   * @param emisorId UID del usuario que envía el mensaje (cliente o admin)
   * @param texto    Contenido textual del mensaje
   * @returns Promesa que se resuelve cuando el mensaje queda persistido
   */
  async enviarMensaje(chatId: string, emisorId: string, texto: string): Promise<void> {
    const mensajesRef = ref(this.database, `/${this.COLLECTION_NAME}/${chatId}/mensajes`);
    const newMsgRef = push(mensajesRef);
    const ahora = Date.now();

    const mensajeData: IMensaje = { emisorId, texto, fecha: ahora };

    /* Escritura atómica: nuevo mensaje + timestamp del chat actualizado */
    const updates: Record<string, any> = {};
    updates[`/${this.COLLECTION_NAME}/${chatId}/mensajes/${newMsgRef.key}`] = mensajeData;
    updates[`/${this.COLLECTION_NAME}/${chatId}/fechaUltimoMensaje`] = ahora;

    return update(ref(this.database), updates);
  }

  /**
   * Acepta una solicitud de chat pendiente cambiando su estado a ACTIVO.
   * A partir de este momento ambos participantes pueden intercambiar mensajes.
   * @param chatId UID del chat de soporte a activar
   * @returns Promesa que se resuelve cuando el estado queda actualizado
   */
  async aceptarChat(chatId: string): Promise<void> {
    const updates: Record<string, any> = {};
    updates[`/${this.COLLECTION_NAME}/${chatId}/estado`] = EstadoChat.ACTIVO;
    return update(ref(this.database), updates);
  }

  /**
   * Rechaza una solicitud de chat pendiente marcándola como CERRADO.
   * @param chatId UID del chat de soporte a rechazar
   * @returns Promesa que se resuelve cuando el estado queda actualizado
   */
  async rechazarChat(chatId: string): Promise<void> {
    const updates: Record<string, any> = {};
    updates[`/${this.COLLECTION_NAME}/${chatId}/estado`] = EstadoChat.CERRADO;
    return update(ref(this.database), updates);
  }

  /**
   * Cierra un chat activo una vez que el asunto ha sido resuelto.
   * @param chatId UID del chat de soporte a cerrar
   * @returns Promesa que se resuelve cuando el estado queda actualizado
   */
  async cerrarChat(chatId: string): Promise<void> {
    const updates: Record<string, any> = {};
    updates[`/${this.COLLECTION_NAME}/${chatId}/estado`] = EstadoChat.CERRADO;
    return update(ref(this.database), updates);
  }
}