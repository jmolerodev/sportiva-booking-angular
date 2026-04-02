import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, switchMap, of } from 'rxjs';
import { SportCentreService } from '../../services/sport-centre-service';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { Sport_Centre } from '../../models/Sport_Centre';
import { Rol } from '../../enums/Rol';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {

  /* Lista global de todos los centros deportivos disponibles en la plataforma */
  public centros: Sport_Centre[] = [];

  /* Instancia del centro deportivo vinculado al administrador autenticado */
  public centroAdmin: Sport_Centre | null = null;

  /* Identificador único (UID) del administrador para consultas en tiempo real */
  public adminUid: string | null = null;

  /* Flag booleano que determina si el usuario en sesión posee el rol de Administrador */
  public esAdministrador: boolean = false;

  /* Recurso gráfico de respaldo para centros que no cuentan con una fotografía subida */
  public readonly imagenPorDefecto = 'centro-default.png';

  /* Flag de control para la gestión del estado de carga global (Spinner) */
  public loading: boolean = true;

  /* Flag de control para mostrar el spinner mientras la imagen del centro admin carga */
  public imagenCargando: boolean = false;

  /* Controladores de estado para la carga asíncrona de datos */
  private loadingCentros: boolean = true;
  private loadingUsuario: boolean = true;

  /* Manejador de suscripciones para centralizar la limpieza y evitar fugas de memoria */
  private subscription: Subscription = new Subscription();

  /**
   * Constructor del componente con inyección de dependencias
   * @param sportCentreService Servicio para la gestión de centros deportivos
   * @param authService Servicio encargado de la identidad y permisos del usuario
   * @param snackbarService Servicio para el despliegue de alertas y confirmaciones
   * @param router Servicio para gestionar la navegación entre vistas
   * @param route Servicio para capturar parámetros de la URL activa
   * @param cdr Servicio para forzar la detección de cambios en el ciclo de Angular
   */
  constructor(
    private sportCentreService: SportCentreService,
    private authService: AuthService,
    private snackbarService: SnackbarService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  /**
   * Inicialización del componente: gestión de datos por parámetros y suscripciones reactivas
   */
  ngOnInit(): void {

    /* Capturamos la URL de la foto enviada desde el formulario de edición/creación */
    const fotoReciente = this.route.snapshot.queryParams['fotoReciente'];

    /* Recuperamos la lista global de centros deportivos */
    this.subscription.add(
      this.sportCentreService.getAllSportCentres().subscribe({
        next: (centros) => {
          this.centros = centros ?? [];
          this.loadingCentros = false;
          this.checkLoading();
        },
        error: (e) => {
          console.error('Error al obtener centros:', e);
          this.loadingCentros = false;
          this.checkLoading();
        }
      })
    );

    /* Validamos sesión y activamos la escucha del centro del administrador */
    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        switchMap(user => {
          if (!user) {
            this.loadingUsuario = false;
            this.checkLoading();
            return of({ rol: null, uid: null });
          }
          this.adminUid = user.uid;
          return this.authService.getRol().pipe(
            switchMap(rol => of({ rol, uid: user.uid }))
          );
        })
      ).subscribe(({ rol, uid }) => {
        this.esAdministrador = rol === Rol.ADMINISTRADOR;

        if (this.esAdministrador && uid) {
          this.subscription.add(
            this.sportCentreService.getSportCentreByAdminUid(uid).subscribe({
              next: (centro) => {
                if (centro) {
                  /* LÓGICA DE PRIORIDAD:
                     Si recibimos una fotoReciente por QueryParams, la imponemos sobre el dato de Firebase.
                  */
                  const fotoNueva = (fotoReciente !== undefined) ? fotoReciente : centro.foto;

                  /* Activamos el spinner de imagen solo si hay una foto que cargar */
                  this.imagenCargando = !!(fotoNueva && fotoNueva.trim() !== '');

                  this.centroAdmin = {
                    ...centro,
                    foto: fotoNueva
                  };
                } else {
                  this.centroAdmin = null;
                }

                this.loadingUsuario = false;
                this.checkLoading();
                this.cdr.detectChanges();
              },
              error: (e) => {
                console.error('Error al obtener centro admin:', e);
                this.loadingUsuario = false;
                this.checkLoading();
              }
            })
          );
        } else {
          this.loadingUsuario = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
   * Método de control interno para desactivar el spinner global
   */
  private checkLoading(): void {
    if (!this.loadingCentros && !this.loadingUsuario) {
      this.loading = false;
    }
  }

  /**
   * Limpieza de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Resuelve la ruta de la imagen o devuelve la imagen por defecto
   * @param foto URL del recurso almacenado
   */
  getFoto(foto: string): string {
    return (foto && foto.trim() !== '') ? foto : this.imagenPorDefecto;
  }

  /**
   * Navegación hacia el formulario de creación
   */
  navigateToAddSportCentre(): void {
    this.router.navigate(['/add-sport-centre']);
  }

  /**
   * Navegación hacia el formulario de edición enviando también la fotoReciente si existe
   */
  navigateToEditSportCentre(): void {
    /* PASO DE TESTIGO: Si el Home ya sabe que hay una foto nueva, se la pasamos al Add de vuelta */
    const fotoActual = this.route.snapshot.queryParams['fotoReciente'] || (this.centroAdmin ? this.centroAdmin.foto : '');

    this.router.navigate(['/add-sport-centre'], {
      queryParams: {
        editar: true,
        fotoReciente: fotoActual
      }
    });
  }

  /**
   * Proceso de borrado integral con limpieza manual inmediata para reactividad total
   */
  deleteSportCentre(): void {
    if (!this.adminUid) return;

    this.snackbarService.showConfirm('¿Deseas eliminar permanentemente tu centro deportivo?', 'Confirmar', () => {
      this.loading = true;
      const fotoUrl = this.centroAdmin ? this.centroAdmin.foto : null;

      this.subscription.add(
        this.sportCentreService.deleteSportCentreComplete(this.adminUid!, fotoUrl).subscribe({
          next: () => {
            this.snackbarService.showSuccess('Centro eliminado correctamente');
            this.centroAdmin = null;
            this.imagenCargando = false;
            /* Limpiamos la URL para que no quede rastro del parámetro de la foto borrada */
            this.router.navigate([], { queryParams: { fotoReciente: null }, queryParamsHandling: 'merge' });
            this.loading = false;
            this.cdr.detectChanges();
          },
          error: (e) => {
            console.error('Error en borrado:', e);
            this.snackbarService.showError('Error al eliminar el centro');
            this.loading = false;
          }
        })
      );
    });
  }
}