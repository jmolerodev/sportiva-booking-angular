import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, switchMap, of, forkJoin } from 'rxjs';
import { SportCentreService } from '../../services/sport-centre-service';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { MembershipService } from '../../services/membershipservice';
import { ISportCentre, IHorarioSemana } from '../../interfaces/Sport-Centre-Interface';
import { IMembership } from '../../interfaces/Membresia-Interface';
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

  /* Centros donde el cliente tiene membresía activa */
  public centrosConMembresia: ISportCentre[] = [];

  /* Centros donde el cliente aún no tiene membresía activa */
  public centrosSinMembresia: ISportCentre[] = [];

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

  /* Flag booleano que determina si el usuario en sesión posee el rol de Root */
  public esRoot: boolean = false;

  /* Flag booleano que indica si hay una sesión activa en la plataforma */
  public sesionIniciada: boolean = false;

  /* Recurso gráfico de respaldo para centros que no cuentan con una fotografía subida */
  public readonly imagenPorDefecto = 'centro-default.png';

  /* Flag de control para la gestión del estado de carga global (Spinner) */
  public loading: boolean = true;

  /* Flags de control para mostrar el spinner mientras la imagen del centro carga de forma individual */
  public imagenAdminCargada: boolean = false;
  public imagenProCargada: boolean = false;

  /* Flags de carga de imagen por cada centro del carousel */
  public imagenesCarouselCargadas: boolean[] = [];

  /* Flags de carga de imagen para centros con membresía */
  public imagenesConMembresiaCargadas: boolean[] = [];

  /* Flags de carga de imagen para centros sin membresía */
  public imagenesSinMembresiaCargadas: boolean[] = [];

  /* Controladores de estado para la carga asíncrona de datos */
  private loadingCentros: boolean = true;
  private loadingUsuario: boolean = true;

  /* Lista de bloques de texto con icono que representan los diferentes tipos de usuario */
  public steps = [
    { visible: false, icon: 'bi-gear-fill', text: 'Gestiona tu centro Deportivo: añade horarios, añade y elimina profesionales, ¡Y muchas más opciones!' },
    { visible: false, icon: 'bi-person-video2', text: 'Crea y gestiona tus sesiones de Entrenamiento o Fisioterapia como Profesional adscrito a un centro.' },
    { visible: false, icon: 'bi-calendar-check-fill', text: 'Reserva sesiones como Cliente en centros donde tengas membresía activa. Además, consulta la oferta de otros centros.' }
  ];

  /* Variable booleana con la que controlamos la visibilidad del encabezado de la sección About */
  public showHeader: boolean = false;

  /* Variable booleana con la que controlamos la visibilidad del pie de página */
  public showFooter: boolean = false;

  private subscription: Subscription = new Subscription();

  /**
   * Constructor del componente con inyección de dependencias
   * @param sportCentreService Servicio para la gestión de centros deportivos
   * @param authService        Servicio encargado de la identidad y permisos del usuario
   * @param snackbarService    Servicio para el despliegue de alertas y confirmaciones
   * @param membershipService  Servicio para la gestión de membresías de clientes
   * @param router             Servicio para gestionar la navegación entre vistas
   * @param route              Servicio para capturar parámetros de la URL activa
   * @param cdr                Servicio para forzar la detección de cambios en el ciclo de Angular
   */
  constructor(
    private sportCentreService: SportCentreService,
    private authService: AuthService,
    private snackbarService: SnackbarService,
    private membershipService: MembershipService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  /**
   * Inicialización del componente: gestión de datos por parámetros, animaciones de presentación
   * y suscripciones reactivas.
   */
  ngOnInit(): void {

    /* ANIMACIONES DE PRESENTACIÓN */
    this.showHeader = false;
    this.showFooter = false;
    this.steps.forEach(step => step.visible = false);

    setTimeout(() => { this.showHeader = true; }, 300);
    this.steps.forEach((step, i) => {
      setTimeout(() => { step.visible = true; }, 800 + i * 400);
    });
    setTimeout(() => { this.showFooter = true; }, 800 + this.steps.length * 400 + 400);

    /* Capturamos la URL de la foto enviada desde el formulario de edición/creación */
    const fotoReciente = this.route.snapshot.queryParams['fotoReciente'];

    /* Recuperamos la lista global de centros deportivos con listener activo */
    this.subscription.add(
      this.sportCentreService.getAllSportCentres().subscribe({
        next: (centros) => {
          this.centros = centros ?? [];
          this.imagenesCarouselCargadas = new Array(this.centros.length).fill(false);
          this.loadingCentros = false;
          this.checkLoading();

          /* Si el cliente ya está identificado recalculamos sus listas al instante */
          if (this.esCliente && this.adminUid) {
            this.cargarCentrosCliente(this.adminUid);
          }

          this.cdr.detectChanges();
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
            this.centroAdmin = null;
            this.centroTrabajo = null;
            this.adminUid = null;
            this.esAdministrador = false;
            this.esProfesional = false;
            this.esCliente = false;
            this.esRoot = false;
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
        if (!data) return;

        this.esAdministrador = data.rol === Rol.ADMINISTRADOR;
        this.esProfesional = data.rol === Rol.PROFESIONAL;
        this.esCliente = data.rol === Rol.CLIENTE;
        this.esRoot = data.rol === Rol.ROOT;
        this.sesionIniciada = true;

        if (this.esAdministrador && data.uid) {
          this.subscription.add(
            this.sportCentreService.getSportCentreByAdminUid(data.uid).subscribe({
              next: (centro) => {
                if (centro) {
                  const fotoNueva = (fotoReciente !== undefined && fotoReciente !== null) ? fotoReciente : centro.foto;
                  this.centroAdmin = { ...centro, foto: fotoNueva };
                  this.imagenAdminCargada = false;

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
          this.subscription.add(
            this.sportCentreService.getSportCentreByProfessionalUid(data.uid).subscribe({
              next: (centro) => {
                this.centroTrabajo = centro;
                this.imagenProCargada = false;
                this.loadingUsuario = false;
                this.checkLoading();
                this.cdr.detectChanges();
              },
              error: (e) => {
                console.error('Error al obtener centro del profesional:', e);
                this.loadingUsuario = false;
                this.checkLoading();
                this.cdr.detectChanges();
              }
            })
          );

        } else if (this.esCliente && data.uid) {
          this.cargarCentrosCliente(data.uid);

        } else {
          this.loadingUsuario = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
  * Se suscribe en tiempo real a las membresías del cliente y separa los centros
  * en dos listas reactivas: con membresía activa y sin ella.
  * Conserva los flags de carga de imagen de los centros que ya estaban en la lista
  * para evitar que el spinner reaparezca en imágenes que ya habían cargado.
  * @param clienteUid UID del cliente autenticado
  */
  private cargarCentrosCliente(clienteUid: string): void {
    this.subscription.add(
      this.membershipService.getMembresiasByCliente(clienteUid).subscribe({
        next: (membresias) => {
          const ahora = Date.now();
          const centrosActivos = new Set(
            membresias
              .filter(m => m.estado === 'ACTIVA' && m.fechaFin > ahora)
              .map(m => m.centroId)
          );

          /* Guardamos las listas anteriores para conservar el estado de imagen */
          const prevConMembresia = this.centrosConMembresia;
          const prevSinMembresia = this.centrosSinMembresia;

          this.centrosConMembresia = this.centros.filter(c => centrosActivos.has(c.adminUid));
          this.centrosSinMembresia = this.centros.filter(c => !centrosActivos.has(c.adminUid));

          /* Conservamos el flag de imagen si el centro ya estaba en la lista anterior */
          this.imagenesConMembresiaCargadas = this.centrosConMembresia.map(c => {
            const idx = prevConMembresia.findIndex(p => p.adminUid === c.adminUid);
            return idx !== -1 ? this.imagenesConMembresiaCargadas[idx] : false;
          });

          this.imagenesSinMembresiaCargadas = this.centrosSinMembresia.map(c => {
            const idx = prevSinMembresia.findIndex(p => p.adminUid === c.adminUid);
            return idx !== -1 ? this.imagenesSinMembresiaCargadas[idx] : false;
          });

          this.loadingUsuario = false;
          this.checkLoading();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Error al cargar membresías del cliente:', e);
          this.loadingUsuario = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
   * Método de control interno para desactivar el spinner global.
   */
  private checkLoading(): void {
    if (!this.loadingCentros && !this.loadingUsuario) {
      this.loading = false;
    }
  }

  /**
   * Limpieza de suscripciones al destruir el componente.
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.centroAdmin = null;
    this.centroTrabajo = null;
  }

  /**
   * Resuelve la ruta de la imagen o devuelve la imagen por defecto.
   * @param foto URL del recurso almacenado
   */
  getFoto(foto: string): string {
    return (foto && foto.trim() !== '') ? foto : this.imagenPorDefecto;
  }

  /**
   * Devuelve los días del horario en orden de lunes a domingo.
   * @param horario Objeto horario semanal del centro
   */
  getDias(horario: IHorarioSemana): string[] {
    const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return orden.filter(dia => horario && horario[dia] !== undefined);
  }

  /**
   * Marca como cargada la imagen de un centro concreto del carousel.
   * @param index Índice del centro en el array
   */
  setImagenCarouselCargada(index: number): void {
    this.imagenesCarouselCargadas[index] = true;
  }

  /**
   * Marca como cargada la imagen de un centro con membresía.
   * @param index Índice del centro en el array
   */
  setImagenConMembresiaCargada(index: number): void {
    this.imagenesConMembresiaCargadas[index] = true;
  }

  /**
   * Marca como cargada la imagen de un centro sin membresía.
   * @param index Índice del centro en el array
   */
  setImagenSinMembresiaCargada(index: number): void {
    this.imagenesSinMembresiaCargadas[index] = true;
  }

  /**
   * Navegación hacia el formulario de creación.
   */
  navigateToAddSportCentre(): void {
    this.router.navigate(['/add-sport-centre']);
  }

  /**
   * Navegación hacia el formulario de edición enviando también la fotoReciente si existe.
   */
  navigateToEditSportCentre(): void {
    const fotoActual = this.centroAdmin ? this.centroAdmin.foto : '';
    this.router.navigate(['/add-sport-centre'], {
      queryParams: { editar: true, fotoReciente: fotoActual }
    });
  }

  /**
   * Proceso de borrado integral con limpieza manual inmediata para reactividad total.
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

  /**
   * Navega al detalle del centro deportivo seleccionado.
   * Valida sesión activa y rol de cliente antes de permitir la navegación.
   * @param adminUid UID del administrador del centro, usado como centroId en la ruta
   */
  navigateToCentroDetail(adminUid: string): void {
    if (!this.sesionIniciada) {
      this.snackbarService.showError('Por favor, inicia sesión para ver los detalles del centro deportivo');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.esCliente) {
      this.snackbarService.showError('Esta sección es exclusiva para clientes');
      return;
    }

    this.router.navigate(['/centre-detail', adminUid]);
  }
}