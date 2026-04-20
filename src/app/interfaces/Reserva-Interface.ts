import { EstadoReserva } from '../enums/EstadoReserva';

/**
 * Interfaz que define la estructura técnica de una reserva de sesión en Firebase.
 * El nodo se almacena bajo Bookings/{uid} y referencia la sesión reservada,
 * el cliente que la realizó y el centro deportivo al que pertenece.
 * El campo sesionSnapshot persiste los datos clave de la sesión en el momento
 * de la reserva para garantizar que el historial siempre muestre información
 * completa aunque la sesión sea eliminada posteriormente de Firebase.
 * @interface IBooking
 */
export interface IBooking {
  uid?:            string;
  sesionId:        string;
  clienteId:       string;
  centroId:        string;
  fecha:           number;
  estado:          EstadoReserva;
  sesionSnapshot?: ISesionSnapshot;
}

/**
 * Snapshot con los datos esenciales de la sesión en el momento de la reserva.
 * Se persiste junto al nodo Booking para garantizar la integridad del historial
 * aunque la sesión sea eliminada posteriormente de Firebase.
 * @interface ISesionSnapshot
 */
export interface ISesionSnapshot {
  titulo:     string;
  horaInicio: string;
  horaFin:    string;
  tipo:       string;
  modalidad:  string;
  aforoMax:   number;
}