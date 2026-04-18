import { TipoMembresia }   from '../enums/TipoMembresia';
import { EstadoMembresia } from '../enums/EstadoMembresia';

/**
 * Interfaz que define la estructura técnica de una membresía en Firebase
 * @interface IMembership
 */
export interface IMembership {
  clienteId:     string;
  centroId:      string;
  tipo:          TipoMembresia;
  fechaInicio:   number;
  fechaFin:      number;
  estado:        EstadoMembresia;
  transactionId: string;
  importe:       number;
}