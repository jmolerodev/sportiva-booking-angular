import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { customEmailValidator, customPasswordValidator } from '../../validators/auth.validator';
import { SnackbarService } from '../../services/snackbar';
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from '@angular/fire/auth';
import { take } from 'rxjs';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  /*Variable de formulario mediante la que controlaremos los datos introducidos por el usuario para iniciar sesión*/
  loginForm: FormGroup;

  /*Variable booleana mediante la cual vamos a controlar que nuestra contraseña se muestre y se oculte*/
  showPassword: boolean = false;

  /*Constructor del componente*/
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackbar : SnackbarService
  ) {

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, customPasswordValidator()]],
      remember: [false]
    });

  }

  /**
   * Metodo mediante el cual iniciaremos sesión en la aplicación
   */
  login(): void {

    /* Si el formulario es inválido, mostramos el snackbar y marcamos los errores visualmente */
    if (this.loginForm.invalid) {
      this.snackbar.showError("Por favor, rellena los campos correctamente para iniciar sesión");
      this.loginForm.markAllAsTouched();
      return;
    }

    const { email, password, remember } = this.loginForm.value;

    /* Configuramos la persistencia según el checkbox */
    const persistence = remember ? browserLocalPersistence : browserSessionPersistence;

    setPersistence(this.authService.auth, persistence).then(() => {
      
      /* Ejecutamos el login */
      this.authService.login(email, password).subscribe({
        next: () => {
          
          /*Nos suscribimos para confirmar que el usuario está autenticado realmente*/
          this.authService.getUserAuthenticated().pipe(take(1)).subscribe((user) => {
            if (user) {
              this.snackbar.showSuccess("Bienvenido a Sportiva Booking");
              this.router.navigate(['/home']);
            }
          });

        },
        error: (e) => {
          this.snackbar.showError("Lo sentimos, pero las credenciales son incorrectas");
        }
      });

    });

  }

  /**
   * Metodo mediante el cual navegaremos a la pestaña de Sign Up (Registro)
   */
  navigateToSignUp() {
    this.router.navigate(['/signup']);
  }

  /**
   * Metodo mediante el cual vamos a poder mostrar y ocultar nuestra contraseña en el formulario al iniciar sesión
   */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
  * Metodo mediante el cual navegaremos a la pestaña de Reset Password (Restablecer contraseña)
  */
  navigateToResetPassword() {
    this.router.navigate(['/reset-password']);
  }

  /**
   * Metodo mediante el que navegaremos a la pestaña de 'Home'
   */
  navigateToHome() : void {
    this.router.navigate(['/home']);
  }

}