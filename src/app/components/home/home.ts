import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, switchMap, of } from 'rxjs';
import { SportCentreService } from '../../services/sport-centre-service';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { ISportCentre, IHorarioSemana } from '../../interfaces/Sport-Centre-Interface'; /* Importamos las interfaces */
import { Rol } from '../../enums/Rol';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {

  /* Lista global de todos los centros deportivos disponibles en la plataforma */
  public centros: ISportCentre[] = [];

  /* Instancia del centro deportivo vinculado al administrador autenticado */
  public centroAdmin: ISportCentre | null = null;

  /* Instancia del centro deportivo vinculado al profesional autenticado */
  public centroTrabajo: ISportCentre | null = null;

  /* Identificador único (UID) del administrador para consultas en tiempo real */
  public adminUid: string | null = null;

  /* Flag booleano que determina si el usuario en sesión posee el rol de Administrador */
  public esAdministrador: boolean = false;

  /* Flag booleano que determina si el usuario en sesión posee el rol de Profesional */
  public esProfesional: boolean = false;

  /* Flag booleano que determina si el usuario en sesión posee el rol de Cliente */
  public esCliente: boolean = false;

  /* Flag booleano que indica si hay una sesión activa en la plataforma */
  public sesionIniciada: boolean = false;

  /* Recurso gráfico de respaldo para centros que no cuentan con una fotografía subida */
  public readonly imagenPorDefecto = 'centro-default.png';

  /* Flag de control para la gestión del estado de carga global (Spinner) */
  public loading: boolean = true;

  /* Flag de control para mostrar el spinner mientras la imagen del centro admin carga */
  public imagenCargando: boolean = false;

  /* Controladores de estado para la carga asíncrona de datos */
  private loadingCentros: boolean = true;
  private loadingUsuario: boolean = true;

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
          /* Mapeamos los centros recibidos a nuestra interfaz */
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
            /* LIMPIEZA REACTIVA: Si no hay usuario (logout), reseteamos el estado local */
            this.centroAdmin = null;
            this.centroTrabajo = null;
            this.adminUid = null;
            this.esAdministrador = false;
            this.esProfesional = false;
            this.esCliente = false;
            this.sesionIniciada = false;
            this.loadingUsuario = false;
            this.checkLoading();
            return of(null);
          }
          this.adminUid = user.uid;
          return this.authService.getRol().pipe(
            switchMap(rol => of({ rol, uid: user.uid }))
          );
        })
      ).subscribe((data) => {
        if (!data) return; /* Si es null (logout), el switchMap de arriba ya hizo la limpieza */

        /* Asignamos los flags de rol y marcamos la sesión como activa */
        this.esAdministrador = data.rol === Rol.ADMINISTRADOR;
        this.esProfesional = data.rol === Rol.PROFESIONAL;
        this.esCliente = data.rol === Rol.CLIENTE;
        this.sesionIniciada = true;

        if (this.esAdministrador && data.uid) {
          this.subscription.add(
            this.sportCentreService.getSportCentreByAdminUid(data.uid).subscribe({
              next: (centro) => {
                if (centro) {
                  /* LÓGICA DE PRIORIDAD: Si recibimos una fotoReciente por QueryParams, la imponemos sobre el dato de Firebase. */
                  const fotoNueva = (fotoReciente !== undefined && fotoReciente !== null) ? fotoReciente : centro.foto;

                  /* Activamos el spinner de imagen solo si hay una foto que cargar */
                  this.imagenCargando = !!(fotoNueva && fotoNueva.trim() !== '');

                  this.centroAdmin = { ...centro, foto: fotoNueva };

                  /* LIMPIEZA DE URL: Una vez asignada, quitamos el parámetro para que no ensucie futuras sesiones */
                  if (fotoReciente !== undefined) {
                    this.router.navigate([], {
                      queryParams: { fotoReciente: null },
                      queryParamsHandling: 'merge',
                      replaceUrl: true
                    });
                  }
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
        } else if (this.esProfesional && data.uid) {
          /* Lógica para recuperar el centro donde trabaja el profesional */
          this.subscription.add(
            this.sportCentreService.getSportCentreByProfessionalUid(data.uid).subscribe({
              next: (centro) => {
                this.centroTrabajo = centro;
                this.loadingUsuario = false;
                this.checkLoading();
                this.cdr.detectChanges();
              },
              error: (e) => {
                console.error('Error al obtener centro del profesional:', e);
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
    /* Nos aseguramos de vaciar el centro al destruir el componente */
    this.centroAdmin = null;
    this.centroTrabajo = null;
  }

  /**
   * Resuelve la ruta de la imagen o devuelve la imagen por defecto
   * @param foto URL del recurso almacenado
   */
  getFoto(foto: string): string {
    return (foto && foto.trim() !== '') ? foto : this.imagenPorDefecto;
  }

  /**
   * Devuelve los días del horario en orden de lunes a domingo
   * @param horario Objeto horario semanal del centro
   */
  getDias(horario: IHorarioSemana): string[] {
    const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return orden.filter(dia => horario[dia] !== undefined);
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
    const fotoActual = this.centroAdmin ? this.centroAdmin.foto : '';
    this.router.navigate(['/add-sport-centre'], {
      queryParams: { editar: true, fotoReciente: fotoActual }
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