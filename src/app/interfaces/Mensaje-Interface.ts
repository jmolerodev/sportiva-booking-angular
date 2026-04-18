/**
 * Interfaz que define la estructura técnica de un mensaje individual
 * dentro de un chat de soporte. Los mensajes se almacenan como subárbol
 * del nodo SoporteChat correspondiente en Firebase RTDB.
 * @interface IMensaje
 */
export interface IMensaje {
    emisorId: string;
    texto:    string;
    fecha:    number;
}