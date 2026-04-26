import { DomainEntity } from './DomainEntity';
import { EstadoReserva } from '../enums/EstadoReserva';


export class Booking extends DomainEntity {

  /*Atributos de la Clase*/
  sesionId: string;
  clienteId: string;
  centroId: string;
  fecha: number;
  estado: EstadoReserva;


  /*Constructor de la Close*/
  constructor(
    id: string,
    sesionId: string,
    clienteId: string,
    centroId: string,
    fecha: number,
    estado: EstadoReserva,

  ) {
    super(id);
    this.sesionId = sesionId;
    this.clienteId = clienteId;
    this.centroId = centroId;
    this.fecha = fecha;
    this.estado = estado;

  }
}
