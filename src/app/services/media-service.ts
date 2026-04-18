import { inject, Injectable } from '@angular/core';
import { child, Database, equalTo, get, listVal, orderByChild, push, query, ref, remove, set, update } from '@angular/fire/database';
import { Storage, ref as stRef, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Observable } from 'rxjs';
import { IMedia } from '../interfaces/Media-Interface';

@Injectable({
  providedIn: 'root',
})
export class MediaService {

  /* Nombre de la Colección Principal en la base de datos */
  private COLLECTION_NAME = 'Media';

  /* Ruta de acceso al bucket de Storage para videos */
  private STORAGE_PATH = 'Profesional-Media';

  private database = inject(Database);
  private storage  = inject(Storage);

  /**
   * Método para obtener todos los vídeos subidos exclusivamente por un profesional
   * @param profesionalId Identificador único del profesional (UID)
   * @returns Observable con la lista de vídeos del profesional
   */
  getMediaByProfesional(profesionalId: string): Observable<IMedia[] | null> {
    const mediaQuery = query(
      ref(this.database, `/${this.COLLECTION_NAME}`),
      orderByChild('profesionalId'),
      equalTo(profesionalId)
    );
    return listVal(mediaQuery, { keyField: 'uid' }) as Observable<IMedia[] | null>;
  }

  /**
   * Obtiene todos los vídeos vinculados a un centro deportivo concreto.
   * Permite mostrar la galería multimedia del centro en la vista de detalle
   * independientemente del profesional que los subió.
   * @param centroId Identificador único del centro deportivo
   * @returns Observable con la lista de vídeos del centro
   */
  getMediaByCentro(centroId: string): Observable<IMedia[] | null> {
    const mediaQuery = query(
      ref(this.database, `/${this.COLLECTION_NAME}`),
      orderByChild('centroId'),
      equalTo(centroId)
    );
    return listVal(mediaQuery, { keyField: 'uid' }) as Observable<IMedia[] | null>;
  }

  /**
   * Método integral para subir un vídeo al Storage y registrar su metadata en Database.
   * Firebase push() genera un UID alfanumérico real y ordenado cronológicamente.
   * @param file Archivo de vídeo (Blob/File)
   * @param data Objeto con la información del vídeo (nombre, descripción, etc.)
   * @returns Promesa que se resuelve al finalizar todo el proceso de guardado
   */
  async uploadAndSaveMedia(file: File, data: IMedia): Promise<void> {

    /* 1.- Generamos una referencia con push() para obtener un UID real de Firebase */
    const collectionRef = ref(this.database, `/${this.COLLECTION_NAME}`);
    const newNodeRef    = push(collectionRef);
    const firebaseUid   = newNodeRef.key!;

    /* 2.- Subimos el archivo a Storage usando el UID de Firebase como prefijo del nombre */
    const filePath         = `${this.STORAGE_PATH}/${firebaseUid}_${file.name}`;
    const storageReference = stRef(this.storage, filePath);
    const snapshot         = await uploadBytes(storageReference, file);
    const downloadURL      = await getDownloadURL(snapshot.ref);

    /* 3.- Guardamos el registro en el nodo exacto que push() ya reservó en la Database */
    const finalData: IMedia = { ...data, url: downloadURL, fecha_subida: Date.now() };
    return set(newNodeRef, finalData);
  }

  /**
   * Eliminación en cascada: primero borra el archivo físico de Storage y después
   * elimina el nodo de metadatos en RTDB. Este orden garantiza que nunca quede
   * un registro huérfano apuntando a un archivo ya inexistente.
   * La ruta de Storage se extrae decodificando el segmento '/o/' presente en la URL
   * de descarga de Firebase, que contiene el path URL-encoded del archivo.
   * @param url URL de descarga del vídeo en Firebase Storage
   * @returns Promesa de borrado completo
   */
  async deleteMediaByUrl(url: string): Promise<void> {
    const mediaQuery = query(
      ref(this.database, `/${this.COLLECTION_NAME}`),
      orderByChild('url'),
      equalTo(url)
    );

    const snapshot = await get(mediaQuery);

    if (snapshot.exists()) {

      /* 1.- Extraemos la ruta del archivo desde la URL de Firebase Storage.
       * Las URLs de descarga tienen el formato: .../o/RUTA_ENCODED?...
       * Decodificamos el segmento entre '/o/' y '?' para obtener el path real */
      try {
        const urlObj      = new URL(url);
        const encodedPath = urlObj.pathname.split('/o/')[1];
        if (encodedPath) {
          const filePath         = decodeURIComponent(encodedPath);
          const storageReference = stRef(this.storage, filePath);
          await deleteObject(storageReference);
        }
      } catch (storageError) {
        /* Registramos el error de Storage pero continuamos con el borrado de RTDB
         * para no dejar el nodo de metadatos huérfano si el archivo ya no existe */
        console.warn('MediaService: El archivo de Storage no pudo eliminarse o ya no existe.', storageError);
      }

      /* 2.- Construimos el mapa de updates con null para eliminar cada nodo encontrado */
      const updates: Record<string, null> = {};
      snapshot.forEach(child => {
        updates[`/${this.COLLECTION_NAME}/${child.key}`] = null;
      });
      return update(ref(this.database), updates) as Promise<void>;
    }
  }
}