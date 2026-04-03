import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { customEmailValidator } from '../../validators/auth.validator';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {

  /*Variable de formulario mediante la que controlaremos el correo introducido por el usuario para restablecer su contraseña*/
  resetForm: FormGroup;

  /*Variable booleana para controlar si el correo ya fue enviado correctamente*/
  emailSent: boolean = false;

  /*Constructor del componente*/
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackbar: SnackbarService
  ) {

    this.resetForm = this.fb.group({
      email: ['', [Validators.required, customEmailValidator()]]
    });

  }

  /**
   * Metodo mediante el cual enviaremos el correo de restablecimiento de contraseña via Firebase Auth
   */
  sendResetEmail(): void {

    /* Si el formulario es invalido, mostramos el error correspondiente segun el fallo */
    if (this.resetForm.invalid) {
      
      this.resetForm.markAllAsTouched(); 
      const emailControl = this.resetForm.get('email');

      if (emailControl?.hasError('required')) {
        this.snackbar.showError("Por favor, rellena todos los campos para continuar");
      } else {
        this.snackbar.showError("El formato del correo electrónico no es válido");
      }
      
      return;
    }

    const { email } = this.resetForm.value;

    this.authService.sendPasswordResetEmail(email).subscribe({
      next: () => {
        this.emailSent = true;
        this.snackbar.showSuccess("Correo de restablecimiento enviado correctamente");
      },
      error: () => {
        this.snackbar.showError("No se encontró ninguna cuenta con ese correo electrónico");
      }
    });

  }

  /**
   * Metodo mediante el cual navegaremos de vuelta al Login
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

}