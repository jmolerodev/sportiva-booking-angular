import { Person } from "./Person";
import { Rol } from "../enums/Rol";
import { Especialidad } from "../enums/Especialidad";

export class Profesional extends Person {

    /*Atributos de la Clase*/
    descripcion : string;
    annos_experiencia : number;
    especialidad : Especialidad;

    /*Constructor de la Clase*/
    constructor (id : string, email : string, password: string, nombre : string, apellidos : string, 
        foto : string, rol : Rol, descripcion : string, annos_experiencia : number, especialidad : Especialidad){
            super (id, email, password, nombre, apellidos, foto, rol);
            this.descripcion = descripcion;
            this.annos_experiencia = annos_experiencia;
            this.especialidad = especialidad;
        }

    /*Getters y Setters de la Clase Profesional*/

    getDescripcion() {
        return this.descripcion;
    }

    setDescripcion(descripcion: string) {
        this.descripcion = descripcion;
    }

    getAnnosExperiencia() {
        return this.annos_experiencia;
    }

    setAnnosExperiencia(annos_experiencia: number) {
        this.annos_experiencia = annos_experiencia;
    }

    getEspecialidad() {
        return this.especialidad;
    }

    setEspecialidad(especialidad: Especialidad) {
        this.especialidad = especialidad;
    }

}