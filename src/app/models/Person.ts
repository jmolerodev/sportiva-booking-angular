import { Rol } from "../enums/Rol";
import { UserAccount } from "./UserAccount";

export abstract class Person extends UserAccount {

    /*Atributos de la Clase*/
    nombre: string;
    apellidos: string;
    foto: string;
    rol: Rol

    /*Constructor de la Clase*/
    constructor(id: string, email: string, password: string, nombre: string, apellidos: string, foto: string, rol: Rol) {
        super(id, email, password);
        this.nombre = nombre;
        this.apellidos = apellidos;
        this.foto = foto;
        this.rol = rol;
    }

}