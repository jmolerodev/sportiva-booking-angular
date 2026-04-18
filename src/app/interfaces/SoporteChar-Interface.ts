import { EstadoChat } from "../enums/EstadoChat";

/**
 * Interfaz que define la estructura técnica de un chat de soporte en Firebase.
 * Cada nodo representa una conversación activa o histórica entre un cliente
 * y el administrador del centro al que pertenece su membresía.
 * @interface ISoporteChat
 */
export interface ISoporteChat {
    centroId:            string;
    clienteId:           string;
    adminId:             string;
    estado:              EstadoChat;
    fechaCreacion:       number;
    fechaUltimoMensaje:  number;
}