import { devNull } from "os";
import { Rol } from "../enums/Rol";
import { Person } from "./Person";

export class Cliente extends Person {

    /*Atributos de la Clase*/
    dni: string;
    direccion: string;
    fecha_alta: Date;
    is_active: boolean;

    /*Constructor de la Clase*/
    constructor(id: string, email: string, password: string, nombre: string, apellidos: string, foto: string, rol: Rol, dni: string, direccion: string, fecha_alta: Date, is_active: boolean) {
        super(id, email, password, nombre, apellidos, foto, rol);
        this.dni = dni;
        this.direccion = direccion;
        this.fecha_alta = fecha_alta;
        this.is_active = is_active;
    }

    /*Getters y Setters de la Clase Cliente*/

    getDni() {
        return this.dni;
    }

    setDni(dni: string) {
        this.dni = dni;
    }

    getDireccion() {
        return this.direccion;
    }

    setDireccion(direccion: string) {
        this.direccion = direccion;
    }

    getFechaAlta() {
        return this.fecha_alta;
    }

    setFechaAlta(fecha_alta: Date) {
        this.fecha_alta = fecha_alta;
    }

    getIsActive() {
        return this.is_active;
    }

    setIsActive(is_active: boolean) {
        this.is_active = is_active;
    }

}