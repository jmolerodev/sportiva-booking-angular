import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { SportCentreService } from '../../services/sport-centre-service';
import { ClienteService } from '../../services/cliente-service';
import { MembershipService } from '../../services/membershipservice';
import { BookingService } from '../../services/booking-service';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { ISportCentre } from '../../interfaces/Sport-Centre-Interface';
import { IMembership } from '../../interfaces/Membresia-Interface';

@Component({
  selector: 'app-management-clients',
  imports: [CommonModule, FormsModule],
  templateUrl: './management-clients.html',
  styleUrl: './management-clients.css',
})
export class ManagementClients implements OnInit, OnDestroy {

  /*Listado de clientes que tienen membresía activa en el centro actual*/
  public misClientes: any[] = [];

  /*Información del centro deportivo gestionado por el administrador*/
  public centroAdmin: ISportCentre | null = null;

  /*Flag para controlar el estado de carga de la página*/
  public loading: boolean = true;

  /*UID del administrador autenticado*/
  private adminUid: string | null = null;

  /*Caché de membresías activas del centro, usada en el proceso de baja*/
  private membresiasCentro: IMembership[] = [];

  /*Suscripción para gestionar la liberación de memoria*/
  private subscription: Subscription = new Subscription();

  constructor(
    private sportCentreService: SportCentreService,
    private clienteService: ClienteService,
    private membershipService: MembershipService,
    private bookingService: BookingService,
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
   * Carga reactiva de datos: obtiene el centro del admin, sus membresías activas
   * y cruza con Persons para obtener los datos completos de cada cliente.
   * El filtrado se realiza a través de Memberships (centroId) → Persons (uid),
   * ya que los clientes no almacenan centroId directamente en su nodo de Persons.
   */
  private loadData(): void {
    if (!this.adminUid) return;

    this.subscription.add(
      combineLatest([
        this.sportCentreService.getSportCentreByAdminUid(this.adminUid),
        this.membershipService.getMembresiasByCentro(this.adminUid),
        this.clienteService.getAllClientes()
      ]).subscribe({
        next: ([centro, membresias, todosLosClientes]) => {
          this.centroAdmin      = centro;
          this.membresiasCentro = membresias;

          /* Extraemos los UIDs únicos de clientes con membresía activa en este centro */
          const uidsConMembresia = new Set(membresias.map(m => m.clienteId));

          /* Cruzamos con Persons para obtener los datos completos de cada cliente */
          this.misClientes = (todosLosClientes ?? []).filter(c =>
            uidsConMembresia.has((c as any).uid)
          );

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
 * Proceso completo de baja de un cliente:
 * 1. Elimina todas sus reservas (Bookings) vinculadas al centro
 * 2. Elimina su membresía activa en el centro (Memberships)
 * 3. Elimina su nodo de Persons de Firebase
 * @param clienteUid UID del cliente a dar de baja
 */
darDeBaja(clienteUid: string): void {
  this.snackbar.showConfirm('¿Estás seguro de que deseas dar de baja a este cliente? Esta acción no se puede deshacer.', 'Confirmar Baja', async () => {
    try {
      /* Paso 1: eliminamos todas sus reservas */
      await this.bookingService.eliminarReservasByCliente(clienteUid);

      /* Paso 2: buscamos la membresía en caché y accedemos al uid inyectado por keyField en runtime */
      const membresia = this.membresiasCentro.find(m => m.clienteId === clienteUid);
      const membresiaUid = membresia ? (membresia as any)['uid'] : null;
      if (membresiaUid) {
        await this.membershipService.eliminarMembresia(membresiaUid);
      }

      /* Paso 3: eliminamos el nodo Persons del cliente */
      await this.clienteService.deleteCliente(clienteUid);

      this.snackbar.showSuccess('Cliente dado de baja correctamente');
    } catch (e) {
      this.snackbar.showError('Error al procesar la baja del cliente');
    }
  });
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