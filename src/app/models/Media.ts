import { DomainEntity } from "./DomainEntity";


export class Media extends DomainEntity {

    /*Atributos de la Clase*/
    url : string;
    nombre : string;
    descripcion : string;
    fecha_subida : number;

    /*Constructor de la Clase*/
    constructor (id : string, url : string, nombre  :string, descripcion : string, fecha_subida : number){
        super (id);
        this.url = url;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.fecha_subida = fecha_subida;
    }

}