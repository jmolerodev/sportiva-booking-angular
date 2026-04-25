import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin-service';
import { ProfesionalService } from '../../services/profesional-service';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { IProfesional } from '../../interfaces/Profesional-Interface';
import { take } from 'rxjs';

@Component({
  selector: 'app-profesional-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profesional-list.html',
  styleUrl: './profesional-list.css',
})
export class ProfesionalList implements OnInit {

  /* Lista de profesionales vinculados al administrador actual */
  profesionales: { uid: string; data: IProfesional }[] = [];

  /* Controla el spinner global durante la carga de datos */
  isLoading = true;

  /* UID del profesional que se está eliminando para mostrar el spinner de fila */
  deletingUid: string | null = null;

  constructor(
    private adminService: AdminService,
    private profesionalService: ProfesionalService,
    private authService: AuthService,
    private snackbar: SnackbarService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.inicializarCarga();
  }

  /**
   * Inicializa la carga de datos esperando a que Firebase restaure la sesión.
   */
  private inicializarCarga(): void {
    this.authService.authState$
      .pipe(take(1))
      .subscribe(user => {
        if (user) {
          this.cargarProfesionales(user.uid);
        } else {
          this.snackbar.showError('Error: No se ha detectado una sesión de administrador activa');
          this.isLoading = false;
        }
      });
  }

  /**
   * Obtiene la lista de profesionales vinculados al administrador.
   * @param adminUid UID del administrador propietario
   */
  private cargarProfesionales(adminUid: string): void {
    this.isLoading = true;
    this.adminService.getProfesionalesByAdmin(adminUid).subscribe({
      next: (profs) => {
        this.profesionales = profs;
        this.isLoading = false;
      },
      error: () => {
        this.snackbar.showError('Error al recuperar la lista de profesionales');
        this.isLoading = false;
      }
    });
  }

  /**
   * Elimina un profesional junto con todas sus sesiones y reservas asociadas.
   * Tras la eliminación, si otro administrador necesita sus servicios deberá
   * darlo de alta nuevamente en el sistema.
   * La eliminación se delega en {@link ProfesionalService.deleteProfesionalCompleto}
   * que orquesta el borrado en cascada: sesiones → reservas → nodo del profesional.
   * @param uid UID del profesional a eliminar
   */
  eliminarProfesional(uid: string): void {
    this.snackbar.showConfirm(
      '¿Deseas eliminar a este profesional? Se borrarán todas sus sesiones, reservas y datos del sistema.',
      'ELIMINAR',
      () => {
        this.deletingUid = uid;
        this.profesionalService.deleteProfesionalCompleto(uid)
          .then(() => {
            this.snackbar.showSuccess('Profesional eliminado correctamente');
            this.profesionales = this.profesionales.filter(p => p.uid !== uid);
          })
          .catch(() => {
            this.snackbar.showError('Hubo un error al intentar eliminar el registro');
          })
          .finally(() => {
            this.deletingUid = null;
          });
      }
    );
  }

  /**
   * Navegación de vuelta al inicio.
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}