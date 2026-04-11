import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { ProfesionalService } from '../../services/profesional-service';
import { AdminService } from '../../services/admin-service';
import { customEmailValidator, customPasswordValidator, passwordsMatchValidator } from '../../validators/auth.validator';
import { Rol } from '../../enums/Rol';
import { Especialidad } from '../../enums/Especialidad';
import { IProfesional } from '../../interfaces/Profesional-Interface';
import { IAdministrador } from '../../interfaces/Administrador-Interface';
import { SnackbarService } from '../../services/snackbar';

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

  readonly Rol = Rol;
  readonly Especialidad = Especialidad;
  readonly especialidades = Object.values(Especialidad);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profesionalService: ProfesionalService,
    private adminService: AdminService,
    private router: Router,
    private snackbar: SnackbarService
  ) {
    this.managementForm = this.fb.group({
      nombre: ['', Validators.required],
      apellidos: ['', Validators.required],
      email: ['', [Validators.required, customEmailValidator()]],
      password: ['', [Validators.required, customPasswordValidator()]],
      confirmPassword: ['', Validators.required],
      /* Campos pro (se validan dinámicamente según el rol) */
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
  }

  /* El Admin solo crea Profesionales (requiere campos extra), el Root Administradores */
  private configurarValidadoresSegunRol(): void {
    if (this.rolUsuarioLogueado === Rol.ADMINISTRADOR) {
      const camposPro = ['descripcion', 'annos_experiencia', 'especialidad'];
      camposPro.forEach(c => {
        this.managementForm.get(c)?.setValidators(Validators.required);
        this.managementForm.get(c)?.updateValueAndValidity();
      });
    }
  }

  /**
   * Método que gestiona la creación de usuarios administrativos o profesionales.
   * Valida el formulario y muestra snackbar de error si algo falta.
   */
  createUser(): void {
    /* Marcamos todo como tocado para activar los estilos visuales de error en los inputs */
    this.managementForm.markAllAsTouched();

    if (this.managementForm.invalid) {
      this.snackbar.showError("Revisa los errores en el formulario antes de continuar");
      return;
    }

    this.isLoading = true;
    const { nombre, apellidos, email, password, descripcion, annos_experiencia, especialidad } = this.managementForm.value;

    this.authService.register(email, password).subscribe({
      next: (userCredential) => {
        const uid = userCredential.user.uid;

        if (this.rolUsuarioLogueado === Rol.ADMINISTRADOR) {
          const nuevoPro: IProfesional = {
            nombre, apellidos, foto: '', rol: Rol.PROFESIONAL,
            descripcion, annos_experiencia: Number(annos_experiencia), especialidad
          };
          this.profesionalService.saveProfesional(uid, nuevoPro).then(() => {
            this.snackbar.showSuccess("Profesional registrado con éxito");
            this.finalizarYRedirigir();
          });
        } else {
          const nuevoAdmin: IAdministrador = { nombre, apellidos, foto: '', rol: Rol.ADMINISTRADOR };
          this.adminService.saveAdministrador(uid, nuevoAdmin).then(() => {
            this.snackbar.showSuccess("Administrador registrado con éxito");
            this.finalizarYRedirigir();
          });
        }
      },
      error: (err) => {
        this.snackbar.showError("Error en el registro: " + err.message);
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

  navigateToHome() : void {
    this.router.navigate(['/home']);
  }
}