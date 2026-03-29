import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ClienteService } from '../../services/cliente-service';
import { ProfesionalService } from '../../services/profesional-service';
import { AdminService } from '../../services/admin-service';
import { customEmailValidator, customPasswordValidator, passwordsMatchValidator } from '../../validators/auth.validator';
import { Rol } from '../../enums/Rol';
import { Especialidad } from '../../enums/Especialidad';
import { ICliente } from '../../interfaces/Cliente-Interface';
import { IProfesional } from '../../interfaces/Profesional-Interface';
import { IAdministrador } from '../../interfaces/Administrador-Interface';
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

  /*Exponemos los enums al template para poder usarlos en los @if y en los bucles*/
  readonly Rol = Rol;
  readonly Especialidad = Especialidad;

  /*Lista de especialidades disponibles para el selector del Profesional*/
  readonly especialidades = Object.values(Especialidad);

  /*Constructor del componente*/
  constructor(private fb: FormBuilder, private authService: AuthService, private clienteService: ClienteService, private profesionalService: ProfesionalService,
  private adminService: AdminService, private router: Router, private snackbar: SnackbarService) {

    /*Aplicamos passwordsMatchValidator al FormGroup completo para validación en tiempo real*/
    this.signUpForm = this.fb.group({
      rol: ['', Validators.required],
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, customPasswordValidator()]],
      confirmPassword: ['', Validators.required],

      /*Campos exclusivos del Cliente — serán requeridos solo cuando el rol sea CLIENTE*/
      dni: [''],
      direccion: [''],

      /*Campos exclusivos del Profesional — serán requeridos solo cuando el rol sea PROFESIONAL*/
      descripcion: [''],
      annos_experiencia: [''],
      especialidad: [''],
    },
    { 
      validators: passwordsMatchValidator()
    });

  }

  ngOnInit(): void {
    this.signUpForm.get('rol')?.valueChanges.subscribe((rolSeleccionado: Rol) => {
      this.actualizarValidadoresPorRol(rolSeleccionado);
    });
  }

  /**
   * Método privado que actualiza los validadores de los campos específicos
   * según el rol seleccionado por el usuario en el formulario.
   * @param rol Rol seleccionado (CLIENTE, PROFESIONAL o ADMINISTRADOR)
   */
  private actualizarValidadoresPorRol(rol: Rol): void {

    const camposCliente = ['dni', 'direccion'];
    const camposProfesional = ['descripcion', 'annos_experiencia', 'especialidad'];

    if (rol == Rol.CLIENTE) {
      camposCliente.forEach(campo => {
        this.signUpForm.get(campo)?.setValidators(Validators.required);
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });
      camposProfesional.forEach(campo => {
        this.signUpForm.get(campo)?.clearValidators();
        this.signUpForm.get(campo)?.setValue('');
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });

    } else if (rol == Rol.PROFESIONAL) {
      camposProfesional.forEach(campo => {
        this.signUpForm.get(campo)?.setValidators(Validators.required);
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });
      camposCliente.forEach(campo => {
        this.signUpForm.get(campo)?.clearValidators();
        this.signUpForm.get(campo)?.setValue('');
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });

    } else if (rol == Rol.ADMINISTRADOR) {
      [...camposCliente, ...camposProfesional].forEach(campo => {
        this.signUpForm.get(campo)?.clearValidators();
        this.signUpForm.get(campo)?.setValue('');
        this.signUpForm.get(campo)?.updateValueAndValidity();
      });
    }

  }

  /**
   * Método principal que gestiona el registro de un nuevo usuario en el sistema.
   * Registra al usuario en Firebase Auth y guarda el resto de datos en RTDB.
   * El email y la password NO se almacenan en RTDB ya que son gestionados por Firebase Auth.
   */
  signUp(): void {

    if (this.signUpForm.invalid) return;

    this.isLoading = true;

    const { rol, nombre, apellidos, email, password, dni, direccion,
      descripcion, annos_experiencia, especialidad } = this.signUpForm.value;

    this.authService.register(email, password).subscribe({
      next: (userCredential) => {

        const uid = userCredential.user.uid;

        if (rol == Rol.CLIENTE) {

          /*Construimos el objeto Cliente tipado con ICliente*/
          const nuevoCliente: ICliente = {
            nombre,
            apellidos,
            foto: '',
            rol: Rol.CLIENTE,
            dni,
            direccion,
            fecha_alta: new Date().getTime(),
            is_active: true,
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

        } else if (rol == Rol.PROFESIONAL) {

          /*Construimos el objeto Profesional tipado con IProfesional*/
          const nuevoProfesional: IProfesional = {
            nombre,
            apellidos,
            foto: '',
            rol: Rol.PROFESIONAL,
            descripcion,
            annos_experiencia: Number(annos_experiencia),
            especialidad,
          };

          this.profesionalService.saveProfesional(uid, nuevoProfesional).then(() => {
            this.snackbar.showSuccess("Cuenta de Profesional creada con éxito");
            console.log('Profesional registrado correctamente:', nuevoProfesional);
            this.isLoading = false;
            this.router.navigate(['/home']);
          }).catch((error) => {
            console.error('Error al guardar el profesional en la BBDD:', error);
            this.isLoading = false;
          });

        } else if (rol == Rol.ADMINISTRADOR) {

          /*Construimos el objeto Administrador tipado con IAdministrador*/
          const nuevoAdministrador: IAdministrador = {
            nombre,
            apellidos,
            foto: '',
            rol: Rol.ADMINISTRADOR,
          };

          this.adminService.saveAdministrador(uid, nuevoAdministrador).then(() => {
            this.snackbar.showSuccess("Cuenta de Administrador creada con éxito");
            console.log('Administrador registrado correctamente:', nuevoAdministrador);
            this.isLoading = false;
            this.router.navigate(['/home']);
          }).catch((error) => {
            console.error('Error al guardar el administrador en la BBDD:', error);
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