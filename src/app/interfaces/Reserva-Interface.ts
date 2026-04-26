import { EstadoReserva } from '../enums/EstadoReserva';

/**
 * Interfaz que define la estructura técnica de una reserva de sesión en Firebase.
 * El nodo se almacena bajo Bookings/{uid} y referencia la sesión reservada,
 * el cliente que la realizó y el centro deportivo al que pertenece.
 * @interface IBooking
 */
export interface IBooking {
  uid?:      string;
  sesionId:  string;
  clienteId: string;
  centroId:  string;
  fecha:     number;
  estado:    EstadoReserva;
}