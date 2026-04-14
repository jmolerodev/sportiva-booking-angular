import { EstadoSesion } from "../enums/EstadoSesion";
import { ModalidadSesion } from "../enums/ModalidadSesion";
import { TipoSesion } from "../enums/TipoSesion";
import { DomainEntity } from "./DomainEntity";



export class Sesion extends DomainEntity {

    /*Atributos de la Clase*/
    tipo: TipoSesion;
    fecha: number;
    horaInicio: string;
    horaFin: string;
    modalidad: ModalidadSesion;
    aforoMax: number;
    aforoActual: number;
    titulo: string;
    descripcion: string;
    estado: EstadoSesion;


    /*Constructor de la Clase*/
    constructor(id: string, tipo: TipoSesion, fecha: number, horaInicio: string, horaFin: string, modalidad: ModalidadSesion,
        aforoMax: number, aforoActual: number, titulo: string, descripcion: string, estado: EstadoSesion) {

        super(id);
        this.tipo = tipo;
        this.fecha = fecha;
        this.horaInicio = horaInicio;
        this.horaFin = horaFin;
        this.modalidad = modalidad;
        this.aforoMax = aforoMax;
        this.aforoActual = aforoActual;
        this.titulo = titulo;
        this.descripcion = descripcion;
        this.estado = estado;
    }




}