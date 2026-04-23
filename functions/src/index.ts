import * as admin from "firebase-admin";
import {onCall, HttpsError} from "firebase-functions/v2/https";

/* Inicialización única del SDK Admin */
admin.initializeApp();

/**
 * Elimina un usuario de Firebase Auth. Válida para cualquier rol.
 * Solo ejecutable por usuarios autenticados.
 * @param uid UID del usuario a eliminar
 */
export const deleteUserFromAuth = onCall(async (request) => {
  /* Verificamos que quien llama está autenticado */
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Solo usuarios autenticados pueden ejecutar esta acción"
    );
  }

  const {uid} = request.data as {uid: string};

  /* Validamos que el UID recibido es válido */
  if (!uid || typeof uid !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "Se debe proporcionar un UID válido"
    );
  }

  /* Eliminamos el usuario de Authentication */
  await admin.auth().deleteUser(uid);
});
