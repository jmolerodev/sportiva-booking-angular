import { DomainEntity } from './DomainEntity';
import { TipoMembresia } from '../enums/TipoMembresia';
import { EstadoMembresia } from '../enums/EstadoMembresia';

export class Membership extends DomainEntity {
  /* Atributos de la Clase */
  clienteId: string;
  centroId: string;
  tipo: TipoMembresia;
  fechaInicio: number;
  fechaFin: number;
  estado: EstadoMembresia;
  transactionId: string;
  importe: number;

  /* Constructor de la Clase */
  constructor(id: string, clienteId: string, centroId: string, tipo: TipoMembresia, fechaInicio: number, fechaFin: number,
    estado: EstadoMembresia, transactionId: string, importe: number) {
    super(id);
    this.clienteId = clienteId;
    this.centroId = centroId;
    this.tipo = tipo;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.estado = estado;
    this.transactionId = transactionId;
    this.importe = importe;
  }
}
