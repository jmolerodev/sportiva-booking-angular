import { Rol } from "../enums/Rol";
 
/*Interfaz que representa los datos de un Administrador tal y como se almacenan en Firebase RTDB.
  No incluye email ni password ya que esos campos son gestionados por Firebase Auth.*/
export interface IAdministrador {
  nombre:   string;
  apellidos: string;
  foto:     string;
  rol:      Rol;
}