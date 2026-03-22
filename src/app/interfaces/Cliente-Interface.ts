import { Rol } from "../enums/Rol";
 
/*Interfaz que representa los datos de un Cliente tal y como se almacenan en Firebase RTDB.
  No incluye email ni password ya que esos campos son gestionados por Firebase Auth.*/
export interface ICliente {
  nombre:     string;
  apellidos:  string;
  foto:       string;
  rol:        Rol;
  dni:        string;
  direccion:  string;
  fecha_alta: number;
  is_active:  boolean;
}