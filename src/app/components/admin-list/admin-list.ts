import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin-service';
import { SnackbarService } from '../../services/snackbar';
import { Administrador } from '../../models/Administrador';

@Component({
  selector: 'app-admin-list',
  standalone: true,
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

  /**
   * Gancho de ciclo de vida que inicializa el componente cargando los administradores.
   */
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
   * Gestiona el proceso de eliminación de un administrador y su centro asociado.
   * Lanza un diálogo de confirmación y, en caso positivo, procede al borrado atómico
   * a través del servicio, actualizando la interfaz tras el éxito.
   * @param uid Identificador único del administrador a eliminar.
   */
  eliminarAdministrador(uid: string): void {
    this.snackbar.showConfirm(
      '¿Deseas eliminar este administrador y su centro deportivo? Los cambios serán permanentes.',
      'ELIMINAR',
      () => {
        this.deletingUid = uid;
        this.adminService.deleteAdministrador(uid)
          .then(() => {
            this.snackbar.showSuccess('Administrador y Centro deportivo eliminados');
            this.administradores = this.administradores.filter(a => a.uid !== uid);
          })
          .catch(() => {
            this.snackbar.showError('Error al procesar la eliminación en la base de datos');
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