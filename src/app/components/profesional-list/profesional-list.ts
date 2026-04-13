import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin-service';
import { ProfesionalService } from '../../services/profesional-service';
import { SportCentreService } from '../../services/sport-centre-service';
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

  /* Almacena el ID del centro deportivo si el administrador posee uno */
  myCentreId: string | null = null;

  constructor(
    private adminService: AdminService,
    private profesionalService: ProfesionalService,
    private sportCentreService: SportCentreService,
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
          const adminUid = user.uid;

          this.verificarCentroDeportivo(adminUid);
          this.cargarProfesionales(adminUid);

        } else {
          this.snackbar.showError('Error: No se ha detectado una sesión de administrador activa');
          this.isLoading = false;
        }

      });
  }

  /**
   * Comprueba si el administrador actual tiene un centro deportivo registrado
   */
  private verificarCentroDeportivo(adminUid: string): void {
    this.sportCentreService.getSportCentreByAdminUid(adminUid).subscribe(centre => {
      this.myCentreId = centre ? adminUid : null;
    });
  }

  /**
   * Obtiene la lista de profesionales
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
   * Gestiona la vinculación o desvinculación de un profesional
   */
  toggleCentro(uid: string): void {

    const prof = this.profesionales.find(p => p.uid === uid);

    if (!this.myCentreId) {
      this.snackbar.showError('Primero debes registrar tu Centro Deportivo en el sistema');
      return;
    }

    const estaVinculado = prof?.data.centroId === this.myCentreId;

    this.snackbar.showConfirm(
      estaVinculado
        ? '¿Deseas desvincular a este profesional de tu centro deportivo?'
        : '¿Deseas vincular a este profesional a tu centro deportivo?',
      estaVinculado ? 'DESVINCULAR' : 'VINCULAR',
      () => {

        this.sportCentreService.vincularProfesionalACentro(
          uid,
          estaVinculado ? null : this.myCentreId!
        )
          .then(() => {

            this.snackbar.showSuccess(
              estaVinculado
                ? 'Profesional desvinculado correctamente'
                : 'Profesional vinculado correctamente al centro'
            );

            if (prof) {
              prof.data.centroId = estaVinculado ? null as any : this.myCentreId!;
            }

          })
          .catch(() => {
            this.snackbar.showError('Error al realizar la operación');
          });

      }
    );
  }

  /**
   * Elimina un profesional
   */
  eliminarProfesional(uid: string): void {

    this.snackbar.showConfirm(
      '¿Deseas eliminar a este profesional? Se borrarán todos sus datos del sistema.',
      'ELIMINAR',
      () => {

        this.deletingUid = uid;

        this.profesionalService.deleteProfesional(uid)
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
   * Navegación de vuelta al inicio
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}