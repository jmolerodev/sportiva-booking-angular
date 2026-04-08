import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { SportCentreService } from '../../services/sport-centre-service';
import { ClienteService } from '../../services/cliente-service';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { ISportCentre } from '../../interfaces/Sport-Centre-Interface';


@Component({
  selector: 'app-management-clients',
  imports: [CommonModule, FormsModule],
  templateUrl: './management-clients.html',
  styleUrl: './management-clients.css',
})
export class ManagementClients implements OnInit, OnDestroy {

  /*Listado de clientes que pertenecen al centro actual*/
  public misClientes: any[] = [];

  /*Listado de clientes que no tienen ningún centro asignado*/
  public clientesLibres: any[] = [];

  /*Información del centro deportivo gestionado por el administrador*/
  public centroAdmin: ISportCentre | null = null;

  /*Flag para controlar el estado de carga de la página*/
  public loading: boolean = true;

  /*UID del administrador autenticado*/
  private adminUid: string | null = null;

  /*Suscripción para gestionar la liberación de memoria*/
  private subscription: Subscription = new Subscription();

  constructor(
    private sportCentreService: SportCentreService,
    private clienteService: ClienteService,
    private authService: AuthService,
    private snackbar: SnackbarService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  /**
   * Al inicializar el componente, obtenemos el usuario actual y cargamos los datos
   */
  ngOnInit(): void {
    this.subscription.add(
      this.authService.getCurrentUser().subscribe(user => {
        if (user) {
          this.adminUid = user.uid;
          this.loadData();
        }
      })
    );
  }

  /**
   * Carga reactiva de datos: obtiene el centro del admin y todos los clientes en paralelo
   */
  private loadData(): void {
    if (!this.adminUid) return;

    this.subscription.add(
      combineLatest([
        this.sportCentreService.getSportCentreByAdminUid(this.adminUid),
        this.clienteService.getAllClientes()
      ]).subscribe({
        next: ([centro, todos]) => {
          this.centroAdmin = centro;

          /* Filtramos los clientes que ya pertenecen a nuestro centro */
          this.misClientes = (todos ?? []).filter(c => (c as any).centroId === this.adminUid);

          /* Filtramos los clientes que aún no tienen centro asignado */
          this.clientesLibres = (todos ?? []).filter(c => !(c as any).centroId);

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.snackbar.showError('Error al sincronizar datos');
          this.loading = false;
        }
      })
    );
  }

  /**
   * Método para dar de alta a un cliente vinculándolo al centro actual
   * @param clienteUid UID del cliente a vincular
   */
  async darDeAlta(clienteUid: string): Promise<void> {
    if (!this.adminUid) return;

    try {
      await this.clienteService.vincularClienteACentro(clienteUid, this.adminUid);
      this.snackbar.showSuccess('¡Cliente dado de alta correctamente!');
    } catch (e) {
      this.snackbar.showError('No se pudo dar de alta al cliente');
    }
  }

  /**
   * Método para dar de baja a un cliente desvinculándolo del centro
   * @param clienteUid UID del cliente a desvincular
   */
  darDeBaja(clienteUid: string): void {
    this.snackbar.showConfirm('¿Estás seguro de que deseas dar de baja a este cliente?', 'Confirmar Baja', async () => {
      try {
        await this.clienteService.desvincularClienteDeCentro(clienteUid);
        this.snackbar.showSuccess('Cliente dado de baja correctamente');
      } catch (e) {
        this.snackbar.showError('Error al procesar la baja');
      }
    });
  }

  /**
   * Método para activar o desactivar manualmente la suscripción de un cliente
   * @param clienteUid UID del cliente
   * @param isActive Estado actual del switch
   */
  async toggleSuscripcion(clienteUid: string, isActive: boolean): Promise<void> {
    try {
      await this.clienteService.toggleIsActive(clienteUid, isActive);
      this.snackbar.showSuccess(isActive ? 'Suscripción activada' : 'Suscripción desactivada');
    } catch (e) {
      this.snackbar.showError('Error al actualizar la suscripción');
    }
  }

  /**
   * Navega de vuelta al panel principal
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  /**
   * Limpieza de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}