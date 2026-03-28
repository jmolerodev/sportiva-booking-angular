import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root',
})
export class SnackbarService {

  private snackBar = inject(MatSnackBar);

  /**
   * Método mediante el cual mostraremos una notificación de éxito 
   * en la parte inferior de la pantalla.
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
   * persistente para advertir al usuario.
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

}