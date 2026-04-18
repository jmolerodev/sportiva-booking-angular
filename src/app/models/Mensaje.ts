import { DomainEntity } from "./DomainEntity";

export class Mensaje extends DomainEntity {

    /* Atributos de la Clase */
    emisorId: string;
    texto: string;
    fecha: number;

    /* Constructor de la Clase */
    constructor(id: string, emisorId: string, texto: string, fecha: number) {
        super(id);
        this.emisorId = emisorId;
        this.texto = texto;
        this.fecha = fecha;
    }
}