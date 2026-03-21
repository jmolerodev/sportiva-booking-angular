import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { customEmailValidator, customPasswordValidator } from '../../validators/auth.validator';

@Component({
  selector: 'app-login',
  standalone: true,
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
    private router: Router
  ) {

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, customPasswordValidator()]]
    });

  }

  /**
   * Metodo mediante el cual iniciaremos sesión en la aplicación
   */
  login(): void {

    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (user) => {
        console.log('Login correcto:', user);
        this.router.navigate(['/home']);
      },
      error: (e) => {
        console.error('Error, login incorrecto', e);
      }
    });

  }

  /**
   * Metodo mediante el cual navegaremos a la pestaña de About (¿Quiénes Somos?)
   */
  navigateToAbout() {
    this.router.navigate(['/about']);
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

}