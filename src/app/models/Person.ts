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

    /* Getters y Setters de la Clase */

    getNombre() {
        return this.nombre;
    }

    setNombre(nombre: string) {
        this.nombre = nombre;
    }

    getApellidos() {
        return this.apellidos;
    }

    setApellidos(apellidos: string) {
        this.apellidos = apellidos;
    }

    getFoto() {
        return this.foto;
    }

    setFoto(foto: string) {
        this.foto = foto;
    }

    getRol() {
        return this.rol;
    }

    setRol(rol: Rol) {
        this.rol = rol;
    }


}