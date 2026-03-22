import { Rol } from "../enums/Rol";
import { Person } from "./Person";

export class Cliente extends Person {

    /*Atributos de la Clase*/
    dni: string;
    direccion: string;
    fecha_alta: number;
    is_active: boolean;

    /*Constructor de la Clase*/
    constructor(id: string, email: string, password: string, nombre: string, apellidos: string, foto: string, rol: Rol, dni: string, direccion: string, fecha_alta: number, is_active: boolean) {
        super(id, email, password, nombre, apellidos, foto, rol);
        this.dni = dni;
        this.direccion = direccion;
        this.fecha_alta = fecha_alta;
        this.is_active = is_active;
    }

}