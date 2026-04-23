import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClienteService } from '../../services/cliente-service';
import { customEmailValidator, customPasswordValidator, passwordsMatchValidator, customDniValidator } from '../../validators/auth.validator';
import { Rol } from '../../enums/Rol';
import { ICliente } from '../../interfaces/Cliente-Interface';
import { SnackbarService } from '../../services/snackbar';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class SignUp implements OnInit {

  /*Formulario reactivo principal mediante el que controlaremos los datos del nuevo usuario*/
  signUpForm: FormGroup;

  /*Variable booleana para controlar la visibilidad de la contraseña*/
  showPassword: boolean = false;

  /*Variable booleana para controlar la visibilidad de la confirmación de contraseña*/
  showConfirmPassword: boolean = false;

  /*Variable booleana que nos indica si el formulario se está procesando (para deshabilitar el botón y evitar doble envío)*/
  isLoading: boolean = false;

  /*Exponemos el enum al template por coherencia, aunque ahora sea solo CLIENTE*/
  readonly Rol = Rol;

  /*Constructor del componente*/
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private clienteService: ClienteService,
    private router: Router,
    private snackbar: SnackbarService
  ) {

    /*Configuramos el formulario por defecto para un Cliente*/
    this.signUpForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, customPasswordValidator()]],
      confirmPassword: ['', Validators.required],
      dni: ['', [Validators.required, customDniValidator()]],
      direccion: ['', Validators.required],
    },
    {
      validators: passwordsMatchValidator()
    });

  }

  ngOnInit(): void { }

  /**
   * Método principal que gestiona el registro de un nuevo cliente en el sistema.
   * Antes de proceder con el registro, verifica que el DNI introducido no esté
   * ya asociado a otro cliente existente en la base de datos.
   */
  signUp(): void {

    if (this.signUpForm.invalid) {
      this.snackbar.showError("Debes completar correctamente todos los campos");
      this.signUpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const { nombre, apellidos, email, password, dni, direccion } = this.signUpForm.value;

    /*Comprobamos si el DNI ya está registrado antes de crear el usuario en Firebase Auth*/
    this.clienteService.isDniAlreadyRegistered(dni).subscribe({
      next: (dniExiste) => {

        if (dniExiste) {
          this.snackbar.showError("El DNI introducido ya está registrado en el sistema");
          this.isLoading = false;
          return;
        }

        /*Si el DNI es único, procedemos con el registro en Firebase Auth*/
        this.authService.register(email, password).subscribe({
          next: (userCredential) => {

            const uid = userCredential.user.uid;

            /*Construimos el objeto Cliente tipado con ICliente*/
            const nuevoCliente: ICliente = {
              nombre,
              apellidos,
              foto: '',
              rol: Rol.CLIENTE,
              dni,
              direccion,
              fecha_alta: new Date().getTime(),
            };

            this.clienteService.saveCliente(uid, nuevoCliente).then(() => {

              this.snackbar.showSuccess("Cuenta de Cliente creada con éxito");
              console.log('Cliente registrado correctamente:', nuevoCliente);
              this.isLoading = false;
              this.router.navigate(['/home']);

            }).catch((error) => {

              this.snackbar.showError("Error al guardar los datos del cliente");
              this.isLoading = false;

            });

          },
          error: (e) => {

            if (e.code === 'auth/email-already-in-use') {
              this.snackbar.showError("El correo electrónico ya está registrado");
            } else if (e.code === 'auth/invalid-email') {
              this.snackbar.showError("El correo electrónico no es válido");
            } else {
              this.snackbar.showError("Error al registrar el usuario");
            }

            this.isLoading = false;

          }
        });

      },
      error: () => {

        this.snackbar.showError("Error al verificar el DNI. Inténtalo de nuevo");
        this.isLoading = false;

      }
    });

  }

  /**
   * Mostrar contraseña
   */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Mostrar confirmación contraseña
   */
  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Navegar a login
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Navegar a home
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

}