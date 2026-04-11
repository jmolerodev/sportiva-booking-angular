import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClienteService } from '../../services/cliente-service';
import { customEmailValidator, customPasswordValidator, passwordsMatchValidator } from '../../validators/auth.validator';
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
  constructor(private fb: FormBuilder, private authService: AuthService, private clienteService: ClienteService, 
  private router: Router, private snackbar: SnackbarService) {

    /*Configuramos el formulario por defecto para un Cliente, eliminando la lógica de otros roles*/
    this.signUpForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, customPasswordValidator()]],
      confirmPassword: ['', Validators.required],
      dni: ['', Validators.required],
      direccion: ['', Validators.required],
    },
    { 
      validators: passwordsMatchValidator()
    });

  }

  ngOnInit(): void { }

  /**
   * Método principal que gestiona el registro de un nuevo cliente en el sistema.
   * Registra al usuario en Firebase Auth y guarda los datos en la colección de Clientes.
   */
  signUp(): void {

    if (this.signUpForm.invalid) return;

    this.isLoading = true;

    const { nombre, apellidos, email, password, dni, direccion } = this.signUpForm.value;

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
          is_active: false,
        };

        this.clienteService.saveCliente(uid, nuevoCliente).then(() => {
          this.snackbar.showSuccess("Cuenta de Cliente creada con éxito");
          console.log('Cliente registrado correctamente:', nuevoCliente);
          this.isLoading = false;
          this.router.navigate(['/home']);
        }).catch((error) => {
          console.error('Error al guardar el cliente en la BBDD:', error);
          this.isLoading = false;
        });

      },
      error: (e) => {
        console.error('Error al registrar el usuario en Firebase Auth:', e);
        this.isLoading = false;
      }
    });

  }

  /**
   * Método para mostrar y ocultar la contraseña principal en el formulario
   */
  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Método para mostrar y ocultar la confirmación de contraseña en el formulario
   */
  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  /**
   * Método mediante el cual navegaremos de vuelta a la pantalla de Login
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

}