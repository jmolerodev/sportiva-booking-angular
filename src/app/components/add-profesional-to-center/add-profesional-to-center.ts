import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { SportCentreService } from '../../services/sport-centre-service';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { ISportCentre } from '../../interfaces/Sport-Centre-Interface';

@Component({
  selector: 'app-add-profesional-to-center',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-profesional-to-center.html',
  styleUrl: './add-profesional-to-center.css',
})
export class AddProfesionalToCenter implements OnInit, OnDestroy {

  /* Listado de profesionales que pertenecen al centro actual */
  public misProfesionales: any[] = [];
  /* Listado de profesionales que no tienen ningún centro asignado */
  public profesionalesLibres: any[] = [];
  /* Información del centro deportivo gestionado por el administrador */
  public centroAdmin: ISportCentre | null = null;
  /* Flag para controlar el estado de carga de la página */
  public loading: boolean = true;
  
  /* UID del administrador autenticado */
  private adminUid: string | null = null;
  /* Suscripción para gestionar la liberación de memoria */
  private subscription: Subscription = new Subscription();

  constructor(
    private sportCentreService: SportCentreService,
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
   * Carga reactiva de datos: Filtra por centroId para exclusividad
   */
  private loadData(): void {
    if (!this.adminUid) return;

    this.subscription.add(
      combineLatest([
        this.sportCentreService.getSportCentreByAdminUid(this.adminUid),
        this.sportCentreService.getAllProfessionals()
      ]).subscribe({
        next: ([centro, todos]) => {
          this.centroAdmin = centro;
          
          /* Filtramos los profesionales que ya tienen el ID de nuestro centro */
          this.misProfesionales = todos.filter(p => p.centroId === this.adminUid);

          /* Filtramos los profesionales que no tienen ningún centroId asignado */
          this.profesionalesLibres = todos.filter(p => !p.centroId);

          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.snackbar.showError("Error al sincronizar datos");
          this.loading = false;
        }
      })
    );
  }

  /**
   * Método para asignar (fichar) un profesional al centro actual
   * @param proUid Identificador único del profesional a asignar
   */
  async asignarProfesional(proUid: string): Promise<void> {
    if (!this.adminUid || !this.centroAdmin) return;

    try {
      const nuevaListaUids = [...(this.centroAdmin.profesionalesUids || []), proUid];
      
      await Promise.all([
        this.sportCentreService.updateSportCentre(this.adminUid, { profesionalesUids: nuevaListaUids }),
        this.sportCentreService.vincularProfesionalACentro(proUid, this.adminUid)
      ]);

      this.snackbar.showSuccess("¡Profesional fichado correctamente!");
    } catch (e) {
      this.snackbar.showError("No se pudo fichar al profesional");
    }
  }

  /**
   * Método para desvincular (dar de baja) a un profesional del centro
   * @param proUid Identificador único del profesional a eliminar
   */
  quitarProfesional(proUid: string): void {
    this.snackbar.showConfirm("¿Estás seguro de que deseas dar de baja a este profesional?", "Confirmar Baja", async () => {
      if (!this.adminUid || !this.centroAdmin) return;

      try {
        const nuevaListaUids = (this.centroAdmin.profesionalesUids || []).filter(id => id !== proUid);

        await Promise.all([
          this.sportCentreService.updateSportCentre(this.adminUid!, { profesionalesUids: nuevaListaUids }),
          this.sportCentreService.desvincularProfesionalDeCentro(proUid)
        ]);

        this.snackbar.showSuccess("Profesional liberado");
      } catch (e) {
        this.snackbar.showError("Error al procesar la baja");
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