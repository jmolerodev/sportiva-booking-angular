import { EstadoSesion } from "../enums/EstadoSesion";
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