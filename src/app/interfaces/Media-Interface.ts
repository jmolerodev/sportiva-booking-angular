/**
 * Interfaz que define la estructura técnica del contenido multimedia en Firebase
 * @interface IMultimedia
 */
export interface IMedia {
    url: string;
    nombre: string;
    descripcion: string;
    fecha_subida: number;
    profesionalId: string;
    centroId: string; 
}