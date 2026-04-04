import { Especialidad } from "../enums/Especialidad";
import { Rol } from "../enums/Rol";
 
/*Interfaz que representa los datos de un Profesional tal y como se almacenan en Firebase RTDB.
  No incluye email ni password ya que esos campos son gestionados por Firebase Auth.*/
export interface IProfesional {
  nombre:            string;
  apellidos:         string;
  foto:              string;
  rol:               Rol;
  descripcion:       string;
  annos_experiencia: number;
  especialidad:      Especialidad;
  centroId?:         string; 
}