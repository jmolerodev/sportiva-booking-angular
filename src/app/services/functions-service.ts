import { inject, Injectable } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';

@Injectable({
  providedIn: 'root',
})
export class FunctionsService {

  private functions = inject(Functions);

  /**
   * Invoca la Cloud Function que elimina un usuario de Firebase Authentication.
   * Es genérica por diseño — funciona para cualquier rol (Administrador, Profesional, Cliente).
   * El borrado en Realtime Database se gestiona por separado desde cada servicio.
   * @param uid UID del usuario a eliminar de Authentication
   * @returns Promesa que se resuelve al completarse la eliminación en Auth
   */
  deleteUserFromAuth(uid: string): Promise<void> {
    const fn = httpsCallable(this.functions, 'deleteUserFromAuth');
    return fn({ uid }).then(() => void 0);
  }

}