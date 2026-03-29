import { DomainEntity } from "./DomainEntity";

export class Sport_Centre extends DomainEntity {

    /*Atributos de la Clase*/
    nombre:    string;
    direccion: string;
    telefono:  string;
    foto:      string;
    adminUid:  string;

    /*Constructor de la clase*/
    constructor(id: string, nombre: string, direccion: string, telefono: string, foto: string, adminUid: string) {
        super(id);
        this.nombre    = nombre;
        this.direccion = direccion;
        this.telefono  = telefono;
        this.foto      = foto;
        this.adminUid  = adminUid;
    }

}