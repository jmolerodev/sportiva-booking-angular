import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin-service';
import { SnackbarService } from '../../services/snackbar';
import { Administrador } from '../../models/Administrador';

@Component({
  selector: 'app-admin-list',
  imports: [CommonModule],
  templateUrl: './admin-list.html',
  styleUrl: './admin-list.css',
})
export class AdminList implements OnInit {

  /* Lista de administradores cargados desde la Base de Datos */
  administradores: { uid: string; data: Administrador }[] = [];

  /* Controla el spinner global mientras se realiza la carga inicial */
  isLoading = true;

  /* UID del administrador que está siendo eliminado en este momento (spinner individual por fila) */
  deletingUid: string | null = null;

  constructor(
    private adminService: AdminService,
    private snackbar: SnackbarService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.cargarAdministradores();
  }

  /**
   * Método que obtiene del servicio la lista completa de administradores
   * y la almacena en el array local para su representación en la vista
   */
  private cargarAdministradores(): void {
    this.isLoading = true;
    this.adminService.getAllAdministradores().subscribe({
      next: (admins) => {
        this.administradores = admins;
        this.isLoading = false;
      },
      error: () => {
        this.snackbar.showError('Error al cargar los administradores');
        this.isLoading = false;
      }
    });
  }

/**
 * Método que gestiona la eliminación de un Administrador tras confirmación del usuario.
 * Utiliza el SnackbarService para mostrar una confirmación visual antes de proceder.
 * Muestra un spinner individual en la fila afectada durante el proceso
 * y actualiza el array local eliminando el registro una vez completada la operación
 * @param uid UID del Administrador que se desea eliminar
 */
eliminarAdministrador(uid: string): void {
  this.snackbar.showConfirm(
    '¿Eliminar este administrador? Esta acción no se puede deshacer.',
    'ELIMINAR',
    () => {
      this.deletingUid = uid;
      this.adminService.deleteAdministrador(uid)
        .then(() => {
          this.snackbar.showSuccess('Administrador eliminado correctamente');
          this.administradores = this.administradores.filter(a => a.uid !== uid);
        })
        .catch(() => {
          this.snackbar.showError('Error al eliminar el administrador');
        })
        .finally(() => {
          this.deletingUid = null;
        });
    }
  );
}
  /**
   * Redirige al usuario a la vista principal del Panel
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }


}