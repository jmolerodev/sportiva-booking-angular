import { EstadoSesion } from "../enums/EstadoSesion";
import { EstadoSlot } from "../enums/EstadoSlot";
import { ModalidadSesion } from "../enums/ModalidadSesion";
import { TipoSesion } from "../enums/TipoSesion";


export interface ISession {
    centroId : string;
    profesionalId : string;
    tipo : TipoSesion;
    fecha : number;
    horaInicio : string;
    horaFin : string;
    modalidad : ModalidadSesion;
    aforoMax : number;
    aforoActual : number;
    titulo : string;
    descripcion : string;
    estado : EstadoSesion;

}

export interface ISlotHorario {
  horaInicio: string;
  horaFin:    string;
  estado:     EstadoSlot;
  sesion:     ISession | null;
}

export interface IFormSesion {
  titulo:      string;
  descripcion: string;
  tipo:        TipoSesion | null;
  modalidad:   ModalidadSesion | null;
  aforoMax:    number;
}
