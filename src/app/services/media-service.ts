import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
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
  private injector = inject(Injector);

  /**
   * Método para obtener todos los vídeos subidos exclusivamente por un profesional
   * @param profesionalId Identificador único del profesional (UID)
   * @returns Observable con la lista de vídeos del profesional
   */
  getMediaByProfesional(profesionalId: string): Observable<IMedia[] | null> {
    return runInInjectionContext(this.injector, () => {
      const mediaQuery = query(
        ref(this.database, `/${this.COLLECTION_NAME}`),
        orderByChild('profesionalId'),
        equalTo(profesionalId)
      );
      return listVal(mediaQuery, { keyField: 'uid' }) as Observable<IMedia[] | null>;
    });
  }

  /**
   * Obtiene todos los vídeos vinculados a un centro deportivo concreto.
   * Permite mostrar la galería multimedia del centro en la vista de detalle
   * independientemente del profesional que los subió.
   * @param centroId Identificador único del centro deportivo
   * @returns Observable con la lista de vídeos del centro
   */
  getMediaByCentro(centroId: string): Observable<IMedia[] | null> {
    return runInInjectionContext(this.injector, () => {
      const mediaQuery = query(
        ref(this.database, `/${this.COLLECTION_NAME}`),
        orderByChild('centroId'),
        equalTo(centroId)
      );
      return listVal(mediaQuery, { keyField: 'uid' }) as Observable<IMedia[] | null>;
    });
  }

/**
   * Método integral para subir un vídeo al Storage y registrar su metadata en Database.
   * Firebase push() genera un UID alfanumérico real y ordenado cronológicamente.
   * @param file Archivo de vídeo (Blob/File)
   * @param data Objeto con la información del vídeo (nombre, descripción, etc.)
   * @returns Promesa que se resuelve al finalizar todo el proceso de guardado
   */
  async uploadAndSaveMedia(file: File, data: IMedia): Promise<void> {
    return runInInjectionContext(this.injector, async () => {

      /* 1.- Generamos una referencia con push() para obtener un UID real de Firebase */
      const collectionRef = ref(this.database, `/${this.COLLECTION_NAME}`);
      const newNodeRef    = push(collectionRef);
      const firebaseUid   = newNodeRef.key!;

      /* 2.- Subimos el archivo a Storage usando el UID de Firebase como prefijo del nombre */
      const filePath         = `${this.STORAGE_PATH}/${firebaseUid}_${file.name}`;
      const storageReference = stRef(this.storage, filePath);
      
      const snapshot    = await uploadBytes(storageReference, file);
      
      /* Obtenemos la URL asegurando el contexto tras el await de la subida */
      const downloadURL = await runInInjectionContext(this.injector, () => getDownloadURL(snapshot.ref));

      /* 3.- Guardamos el registro en el nodo exacto que push() ya reservó en la Database */
      const finalData: IMedia = { ...data, url: downloadURL, fecha_subida: Date.now() };

      /* IMPORTANTE: Envolvemos el set final porque el hilo de ejecución ha perdido el contexto tras los awaits previos */
      return runInInjectionContext(this.injector, () => set(newNodeRef, finalData));
    });
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
    return runInInjectionContext(this.injector, async () => {

      /* 1.- Localizamos el registro en la base de datos para obtener su clave */
      const snapshot = await runInInjectionContext(this.injector, () => {
        const mediaQuery = query(
          ref(this.database, `/${this.COLLECTION_NAME}`),
          orderByChild('url'),
          equalTo(url)
        );
        return get(mediaQuery);
      });

      if (snapshot.exists()) {

        try {
          const urlObj      = new URL(url);
          const encodedPath = urlObj.pathname.split('/o/')[1];
          if (encodedPath) {
            const filePath = decodeURIComponent(encodedPath);
            
            /* 2.- Borramos el archivo físico de Storage protegiendo la llamada asíncrona */
            await runInInjectionContext(this.injector, () => {
              const storageReference = stRef(this.storage, filePath);
              return deleteObject(storageReference);
            });
          }
        } catch (storageError) {
          console.warn('MediaService: El archivo de Storage no pudo eliminarse o ya no existe.', storageError);
        }

        /* 3.- Preparamos la eliminación en la base de datos */
        const updates: Record<string, null> = {};
        snapshot.forEach(child => {
          updates[`/${this.COLLECTION_NAME}/${child.key}`] = null;
        });

        /* 4.- Ejecutamos la actualización final blindando el contexto de nuevo */
        return runInInjectionContext(this.injector, () => {
          return update(ref(this.database), updates) as Promise<void>;
        });
      }
    });
  }
}