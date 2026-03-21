import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClienteService } from '../../services/cliente-service';
import { ProfesionalService } from '../../services/profesional-service';
import { customEmailValidator, customPasswordValidator } from '../../validators/auth.validator';
import { Rol } from '../../enums/Rol';
import { Especialidad } from '../../enums/Especialidad';

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

  /*Exponemos los enums al template para poder usarlos en los @if y en los bucles*/
  readonly Rol = Rol;
  readonly Especialidad = Especialidad;

  /*Lista de especialidades disponibles para el selector del Profesional*/
  readonly especialidades = Object.values(Especialidad);

  /*Constructor del componente*/
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private clienteService: ClienteService,
    private profesionalService: ProfesionalService,
    private router: Router
  ) {

    /*Inicializamos el formulario con los campos comunes a todos los usuarios*/
    this.signUpForm = this.fb.group({
      rol:              ['', Validators.required],
      nombre:           ['', Validators.required],
      apellidos:        ['', Validators.required],
      email:            ['', [Validators.required, customEmailValidator()]],
      password:         ['', [Validators.required, customPasswordValidator()]],
      confirmPassword:  ['', Validators.required],

      /*Campos exclusivos del Cliente — serán requeridos solo cuando el rol sea CLIENTE*/
      dni:              [''],
      direccion:        [''],

      /*Campos exclusivos del Profesional — serán requeridos solo cuando el rol sea PROFESIONAL*/
      descripcion:      [''],
      annos_experiencia:[''],
      especialidad:     [''],
    });

  }

  ngOnInit(): void {
    /*Escuchamos el cambio de rol para actualizar los validadores dinámicamente*/
    this.signUpForm.get('rol')?.valueChanges.subscribe((rolSeleccionado: Rol) => {
      this.actualizarValidadoresPorRol(rolSeleccionado);
    });
  }

   
  /**
   * Método privado que actualiza los validadores de los campos específicos
   * según el rol seleccionado por el usuario en el formulario
   * @param rol Rol seleccionado (CLIENTE o PROFESIONAL)
   */
  private actualizarValidadoresPorRol(rol: Rol): void {

    /*Campos del Cliente*/
    const camposCliente = ['dni', 'direccion'];

    /*Campos del Profesional*/
    const camposProfesional = ['descripcion', 'annos_experiencia', 'especialidad'];

    if (rol === Rol.CLIENTE) {
      camposCliente.forEach(campo => {
        this.signUpForm.get(campo)?.setValidators(Validators.required);
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });
      camposProfesional.forEach(campo => {
        this.signUpForm.get(campo)?.clearValidators();
        this.signUpForm.get(campo)?.setValue('');
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });
    } else if (rol === Rol.PROFESIONAL) {
      camposProfesional.forEach(campo => {
        this.signUpForm.get(campo)?.setValidators(Validators.required);
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });
      camposCliente.forEach(campo => {
        this.signUpForm.get(campo)?.clearValidators();
        this.signUpForm.get(campo)?.setValue('');
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });
    }

  }

  /**
   * Método privado que comprueba si las contraseñas introducidas coinciden
   * @returns true si coinciden, false en caso contrario
   */
  private passwordsCoinciden(): boolean {
    return this.signUpForm.get('password')?.value === this.signUpForm.get('confirmPassword')?.value;
  }

  
  /**
   * Método principal que gestiona el registro de un nuevo usuario en el sistema.
   * Registra al usuario en Firebase Auth y a continuación guarda sus datos
   * en Firebase Realtime Database bajo la colección 'Persons'.
   */
  signUp(): void {

    if (this.signUpForm.invalid) return;

    if (!this.passwordsCoinciden()) {
      this.signUpForm.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return;
    }

    this.isLoading = true;

    const { rol, nombre, apellidos, email, password, dni, direccion,
            descripcion, annos_experiencia, especialidad } = this.signUpForm.value;

    /*Registramos al usuario en Firebase Authentication*/
    this.authService.register(email, password).subscribe({
      next: (userCredential) => {

        const uid = userCredential.user.uid;

        if (rol === Rol.CLIENTE) {

          /*Construimos el objeto Cliente que se guardará en la BBDD*/
          const nuevoCliente = {
            id:          uid,
            email,
            password:    '',           // No almacenamos la contraseña en texto plano
            nombre,
            apellidos,
            foto:        '',           // La foto se añadirá desde Mi Perfil
            rol:         Rol.CLIENTE,
            dni,
            direccion,
            fecha_alta:  new Date().toISOString(),
            is_active:   true,
          };

          this.clienteService.saveCliente(uid, nuevoCliente).then(() => {
            console.log('Cliente registrado correctamente:', nuevoCliente);
            this.isLoading = false;
          }).catch((error) => {
            console.error('Error al guardar el cliente en la BBDD:', error);
            this.isLoading = false;
          });

        } else if (rol === Rol.PROFESIONAL) {

          /*Construimos el objeto Profesional que se guardará en la BBDD*/
          const nuevoProfesional = {
            id:                uid,
            email,
            password:          '',     // No almacenamos la contraseña en texto plano
            nombre,
            apellidos,
            foto:              '',     // La foto se añadirá desde Mi Perfil
            rol:               Rol.PROFESIONAL,
            descripcion,
            annos_experiencia: Number(annos_experiencia),
            especialidad,
          };

          this.profesionalService.saveProfesional(uid, nuevoProfesional).then(() => {
            console.log('Profesional registrado correctamente:', nuevoProfesional);
            this.isLoading = false;
          }).catch((error) => {
            console.error('Error al guardar el profesional en la BBDD:', error);
            this.isLoading = false;
          });

        }

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
   * Getter de conveniencia para obtener el rol actualmente seleccionado en el formulario
   */
  get rolSeleccionado(): Rol {
    return this.signUpForm.get('rol')?.value;
  }

  /**
   * Método mediante el cual navegaremos de vuelta a la pantalla de Login
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

}