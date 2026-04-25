import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ProfesionalService } from '../../services/profesional-service';
import { AdminService } from '../../services/admin-service';
import { SportCentreService } from '../../services/sport-centre-service';
import { customEmailValidator, customPasswordValidator, passwordsMatchValidator } from '../../validators/auth.validator';
import { Rol } from '../../enums/Rol';
import { Especialidad } from '../../enums/Especialidad';
import { IProfesional } from '../../interfaces/Profesional-Interface';
import { IAdministrador } from '../../interfaces/Administrador-Interface';
import { SnackbarService } from '../../services/snackbar';
import { take } from 'rxjs';


@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-user-management.html',
  styleUrl: './admin-user-management.css',
})
export class AdminUserManagement implements OnInit {

  /* Formulario reactivo principal para la gestión de usuarios de nivel alto */
  managementForm: FormGroup;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  rolUsuarioLogueado: Rol | null = null;

  /* UID del centro deportivo del admin actual; null si aún no tiene centro registrado */
  centroIdActual: string | null = null;

  /* Indica si la verificación inicial del centro ha terminado */
  cargandoCentro = true;

  readonly Rol = Rol;
  readonly Especialidad = Especialidad;
  readonly especialidades = Object.values(Especialidad);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profesionalService: ProfesionalService,
    private adminService: AdminService,
    private sportCentreService: SportCentreService,
    private router: Router,
    private snackbar: SnackbarService
  ) {
    this.managementForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, customPasswordValidator()]],
      confirmPassword: ['', Validators.required],
      descripcion: [''],
      annos_experiencia: [''],
      especialidad: [''],
    }, { validators: passwordsMatchValidator() });
  }

  ngOnInit(): void {
    this.authService.getRol().subscribe(rol => {
      this.rolUsuarioLogueado = rol;
      this.configurarValidadoresSegunRol();
    });

    this.verificarCentroDeportivo();
  }

  /* El Admin solo crea Profesionales (requiere campos extra), el Root Administradores */
  private configurarValidadoresSegunRol(): void {
    if (this.rolUsuarioLogueado == Rol.ADMINISTRADOR) {
      const camposPro = ['descripcion', 'annos_experiencia', 'especialidad'];
      camposPro.forEach(c => {
        this.managementForm.get(c)?.setValidators(Validators.required);
        this.managementForm.get(c)?.updateValueAndValidity();
      });
    }
  }

  /**
   * Verifica si el administrador actual tiene un centro deportivo registrado.
   * Almacena el UID del centro en {@link centroIdActual} para usarlo al crear profesionales.
   * Si el rol es ROOT no necesita centro, por lo que se omite la comprobación.
   */
  private verificarCentroDeportivo(): void {
    this.authService.authState$.pipe(take(1)).subscribe(user => {
      if (!user) {
        this.cargandoCentro = false;
        return;
      }

      /* El ROOT no necesita centro deportivo para crear administradores */
      if (this.rolUsuarioLogueado === Rol.ROOT) {
        this.cargandoCentro = false;
        return;
      }

      this.sportCentreService.getSportCentreByAdminUid(user.uid).subscribe(centre => {
        this.centroIdActual = centre ? user.uid : null;
        this.cargandoCentro = false;
      });
    });
  }

  /**
   * Método que gestiona la creación de usuarios administrativos o profesionales.
   * Valida el formulario, verifica si el email ya está en uso mediante el catch de Firebase
   * y en caso de ser un profesional lo vincula directamente al centro del administrador.
   */
  createUser(): void {
    /* Marcamos todo como tocado para activar los estilos visuales de error en los inputs */
    this.managementForm.markAllAsTouched();

    if (this.managementForm.invalid) {
      this.snackbar.showError("Revisa los errores en el formulario antes de continuar");
      return;
    }

    /* Bloqueamos si el admin no tiene centro registrado (no debería llegar aquí por la UI) */
    if (this.rolUsuarioLogueado === Rol.ADMINISTRADOR && !this.centroIdActual) {
      this.snackbar.showError("Debes registrar tu Centro Deportivo antes de dar de alta profesionales");
      return;
    }

    this.isLoading = true;
    const { nombre, apellidos, email, password, descripcion, annos_experiencia, especialidad } = this.managementForm.value;

    const adminIdActual = this.authService.auth.currentUser?.uid;

    /* Intentamos el registro; Firebase lanzará error si el email ya existe */
    this.authService.registerByAdmin(email, password).subscribe({
      next: (userCredential) => {
        const uid = userCredential.user.uid;

        if (this.rolUsuarioLogueado == Rol.ADMINISTRADOR) {
          const nuevoPro: IProfesional = {
            nombre,
            apellidos,
            foto: '',
            rol: Rol.PROFESIONAL,
            descripcion,
            annos_experiencia: Number(annos_experiencia),
            especialidad,
            adminId: adminIdActual,
            /* Vinculamos directamente al centro del administrador en el momento del alta */
            centroId: this.centroIdActual!
          };
          this.profesionalService.saveProfesional(uid, nuevoPro).then(() => {
            this.snackbar.showSuccess("Profesional registrado y vinculado al centro con éxito");
            this.finalizarYRedirigir();
          }).catch(() => {
            this.snackbar.showError("Error al guardar los datos del profesional");
            this.isLoading = false;
          });
        } else {
          const nuevoAdmin: IAdministrador = { nombre, apellidos, foto: '', rol: Rol.ADMINISTRADOR };
          this.adminService.saveAdministrador(uid, nuevoAdmin).then(() => {
            this.snackbar.showSuccess("Administrador registrado con éxito");
            this.finalizarYRedirigir();
          }).catch(() => {
            this.snackbar.showError("Error al guardar los datos del administrador");
            this.isLoading = false;
          });
        }
      },
      error: (err) => {
        /* Replicamos la lógica de control de errores de SignUp */
        if (err.code == 'auth/email-already-in-use') {
          this.snackbar.showError("El correo electrónico ya está registrado. Pruebe de nuevo con una nueva dirección");
        } else {
          this.snackbar.showError("Error en el registro: " + err.message);
        }
        this.isLoading = false;
      }
    });
  }

  private finalizarYRedirigir(): void {
    this.isLoading = false;
    this.managementForm.reset();
    this.router.navigate(['/home']);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}