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

/**
 * Verifica si un correo electrónico está registrado en Firebase Auth.
 * No requiere autenticación previa ya que se usa en el flujo de
 * recuperación de contraseña.
 * @param email Correo electrónico a verificar
 * @returns exists: true si el correo existe en Auth, false en caso contrario
 */
export const checkEmailExists = onCall(async (request) => {
  const {email} = request.data as {email: string};

  /* Validamos que el email recibido es válido */
  if (!email || typeof email !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "Se debe proporcionar un correo electrónico válido"
    );
  }

  try {
    /* Intentamos obtener el usuario por email usando el SDK Admin */
    await admin.auth().getUserByEmail(email);
    return {exists: true};
  } catch (error: unknown) {
    /* Si el error es auth/user-not-found el correo no existe */
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as {code: string}).code === "auth/user-not-found"
    ) {
      return {exists: false};
    }
    throw new HttpsError(
      "internal",
      "Error al verificar el correo electrónico"
    );
  }
});

