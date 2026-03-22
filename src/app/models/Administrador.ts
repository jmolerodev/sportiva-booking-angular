import { Rol } from "../enums/Rol";
import { Person } from "./Person";



export class Administrador extends Person {



    /*Constructor de la Clase*/
    constructor(id: string, email: string, password: string, nombre: string, apellidos: string,
        foto: string, rol: Rol) {
        super(id, email, password, nombre, apellidos, foto, rol);
    }


}