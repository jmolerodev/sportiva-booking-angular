import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {

  private snackBar = inject(MatSnackBar);

  /**
   * Método mediante el cual mostraremos una notificación de éxito 
   * @param message Mensaje descriptivo del éxito
   */
  showSuccess(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }

  /**
   * Método mediante el cual mostraremos una notificación de error 
   * @param message Mensaje de error a mostrar
   */
  showError(message: string): void {
    this.snackBar.open(message, 'Entendido', {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  /**
   * Método para mostrar una confirmación antes de realizar una acción crítica.
   * @param message Mensaje de advertencia
   * @param actionText Texto del botón de acción (ej: 'ELIMINAR')
   * @param callback Función que se ejecutará si el usuario confirma
   */
  showConfirm(message: string, actionText: string, callback: () => void): void {
    const snackRef = this.snackBar.open(message, actionText, {
      duration: 5000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['warning-snackbar'], // Podrías darle un estilo naranja/rojo en CSS
    });

    /* Si el usuario pulsa el botón de acción (ej: ELIMINAR), ejecutamos el callback */
    snackRef.onAction().subscribe(() => {
      callback();
    });
  }
}