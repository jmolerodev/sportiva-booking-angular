import { EstadoChat } from "../enums/EstadoChat";
import { DomainEntity } from "./DomainEntity";

export class SoporteChat extends DomainEntity {

    /* Atributos de la Clase */
    centroId : string;
    clienteId : string;
    adminId : string;
    estado : EstadoChat;
    fechaCreacion : number;
    fechaUltimoMensaje : number;

    /* Constructor de la Clase */
    constructor(id: string, centroId:string, clienteId:string, adminId:string, estado: EstadoChat, fechaCreacion:number,
    fechaUltimoMensaje: number) {
        super(id);
        this.centroId = centroId;
        this.clienteId = clienteId;
        this.adminId = adminId;
        this.estado = estado;
        this.fechaCreacion = fechaCreacion;
        this.fechaUltimoMensaje = fechaUltimoMensaje;
    }
}