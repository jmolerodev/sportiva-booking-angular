import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule }                                     from '@angular/common';
import { Router }                                           from '@angular/router';
import { Subscription, switchMap, of, Subject, takeUntil } from 'rxjs';
import { AuthService }        from '../../services/auth';
import { SessionService }     from '../../services/session-service';
import { BookingService }     from '../../services/booking-service';
import { SportCentreService } from '../../services/sport-centre-service';
import { SnackbarService }    from '../../services/snackbar';
import { ISportCentre }       from '../../interfaces/Sport-Centre-Interface';
import { ISession }           from '../../interfaces/Sesion-Interface';
import { IBooking }           from '../../interfaces/Reserva-Interface';
import { EstadoReserva }      from '../../enums/EstadoReserva';
import { Rol }                from '../../enums/Rol';

/**
 * Componente de historial y gestión de reservas desde la perspectiva del cliente.
 * Muestra un calendario navegable donde los días con reservas confirmadas quedan
 * marcados visualmente. Al seleccionar un día aparece la lista de sesiones reservadas
 * para esa fecha con opción de cancelación mientras la sesión no haya finalizado.
 * En la parte inferior se listan las reservas pendientes futuras y el historial
 * de sesiones pasadas o canceladas, con opción de eliminar permanentemente tanto
 * las canceladas como las finalizadas.
 * @class ClienteSessions
 */
@Component({
  selector:    'app-cliente-sessions',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './cliente-sessions.html',
  styleUrl:    './cliente-sessions.css'
})
export class ClienteSessions implements OnInit, OnDestroy {

  /* Estado de carga global hasta que reservas y sesiones estén disponibles */
  public loading: boolean = true;

  /* UID del cliente autenticado */
  public clienteUid: string | null = null;

  /* Fecha actualmente seleccionada en el calendario */
  public fechaSeleccionada: Date = new Date();

  /* Año y mes que se están visualizando en el calendario */
  public mesActual: Date = new Date();

  /* Matriz de semanas que componen la cuadrícula del mes */
  public semanas: (Date | null)[][] = [];

  /* Reservas del día seleccionado enriquecidas con datos de sesión */
  public reservasDelDia: (IBooking & { sesion?: ISession & { uid: string }; yaFinalizada?: boolean })[] = [];

  /* Reservas futuras confirmadas del cliente ordenadas por fecha ascendente */
  public reservasPendientes: (IBooking & { sesion?: ISession & { uid: string } })[] = [];

  /* Reservas pasadas o canceladas del cliente para el historial inferior */
  public reservasHistorial: (IBooking & { sesion?: ISession & { uid: string } })[] = [];

  /* Conjunto de claves YYYY-M-D de días con al menos una reserva confirmada */
  public diasConReserva: Set<string> = new Set();

  /* Lista de centros deportivos para resolver el nombre a partir del centroId */
  public centros: ISportCentre[] = [];

  /* Nombres de los días de la semana para la cabecera del calendario */
  public readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  /* Expone el enum al template para las comparaciones de estado */
  public EstadoReserva = EstadoReserva;

  /* Flags de carga asíncrona independiente para el control del spinner */
  private loadingReservas: boolean = true;
  private loadingSesiones: boolean = true;

  /* Cache reactiva de todas las sesiones para enriquecer reservas en tiempo real.
   * Listener activo para que los cambios de aforoActual se propaguen a la vista. */
  private todasLasSesiones: (ISession & { uid: string })[] = [];

  /* Cache local de todas las reservas del cliente */
  private todasLasReservas: IBooking[] = [];

  /* Subject que emite al destruir el componente para cancelar todas las suscripciones */
  private destroy$ = new Subject<void>();

  /* Contenedor único de suscripciones para limpieza centralizada */
  private subscription: Subscription = new Subscription();

  /**
   * Constructor del componente con inyección de dependencias
   * @param authService        Servicio encargado de la identidad y permisos del usuario
   * @param sessionService     Servicio para la gestión de sesiones deportivas
   * @param bookingService     Servicio para la gestión de reservas del cliente
   * @param sportCentreService Servicio para la resolución del nombre del centro en el historial
   * @param snackbarService    Servicio para el despliegue de alertas y confirmaciones
   * @param router             Servicio para gestionar la navegación entre vistas
   * @param cdr                Servicio para forzar la detección de cambios en el ciclo de Angular
   */
  constructor(
    private authService:        AuthService,
    private sessionService:     SessionService,
    private bookingService:     BookingService,
    private sportCentreService: SportCentreService,
    private snackbarService:    SnackbarService,
    private router:             Router,
    private cdr:                ChangeDetectorRef
  ) {}

  /**
   * Ciclo de vida inicial: valida sesión y rol, carga la lista de centros
   * y arranca en paralelo los listeners de Firebase de sesiones y reservas.
   */
  ngOnInit(): void {
    this.generarCalendario();

    /* Cargamos la lista de centros una sola vez para resolver nombres en el historial */
    this.subscription.add(
      this.sportCentreService.getAllSportCentres().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: centros => { this.centros = centros ?? []; },
        error: e => console.error('Error al cargar centros:', e)
      })
    );

    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        switchMap(user => {
          if (!user) {
            this.router.navigate(['/home']);
            return of(null);
          }
          this.clienteUid = user.uid;
          return this.authService.getRol();
        }),
        takeUntil(this.destroy$)
      ).subscribe(rol => {
        if (!rol) return;
        if (rol !== Rol.CLIENTE) {
          this.router.navigate(['/home']);
          return;
        }
        this.escucharSesiones();
        this.escucharReservas();
      })
    );
  }

  /**
   * Limpieza centralizada: completa el Subject destroy$ para cancelar todos
   * los observables activos y libera las suscripciones del contenedor.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.subscription.unsubscribe();
  }

  /**
   * Se suscribe en tiempo real a la lista completa de sesiones de Firebase.
   * Mantener el listener activo garantiza que los cambios de aforoActual
   * se propaguen a la vista inmediatamente tras una reserva o cancelación.
   */
  private escucharSesiones(): void {
    this.subscription.add(
      this.sessionService.getAllSessions().pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: sesiones => {
          this.todasLasSesiones = sesiones;
          this.reconstruirVistas();
          this.loadingSesiones = false;
          this.checkLoading();
          this.cdr.detectChanges();
        },
        error: e => {
          console.error('Error al cargar sesiones:', e);
          this.loadingSesiones = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
   * Se suscribe en tiempo real a todas las reservas del cliente.
   * Cada vez que Firebase emite reconstruye todas las vistas derivadas.
   */
  private escucharReservas(): void {
    if (!this.clienteUid) return;

    this.subscription.add(
      this.bookingService.getReservasByCliente(this.clienteUid).pipe(
        takeUntil(this.destroy$)
      ).subscribe({
        next: reservas => {
          this.todasLasReservas = reservas;
          this.reconstruirVistas();
          this.loadingReservas = false;
          this.checkLoading();
          this.cdr.detectChanges();
        },
        error: e => {
          console.error('Error al cargar reservas:', e);
          this.loadingReservas = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
   * Reconstruye de forma centralizada todas las vistas derivadas de los datos.
   * Se invoca cada vez que Firebase emite nuevos datos de sesiones o reservas.
   */
  private reconstruirVistas(): void {
    this.reconstruirDiasConReserva();
    this.reconstruirReservasDelDia();
    this.reconstruirPendientesEHistorial();
  }

  /**
   * Reconstruye el Set de claves YYYY-M-D de días que tienen al menos
   * una reserva CONFIRMADA para pintar los indicadores en el calendario.
   */
  private reconstruirDiasConReserva(): void {
    this.diasConReserva = new Set(
      this.todasLasReservas
        .filter(r => r.estado === EstadoReserva.CONFIRMADA)
        .map(r => this.claveDia(new Date(r.fecha)))
    );
  }

  /**
   * Filtra y enriquece las reservas CONFIRMADAS del día actualmente seleccionado.
   * Añade el flag yaFinalizada para controlar la visibilidad del botón cancelar
   * cuando la hora de fin de la sesión ya ha pasado aunque sea el mismo día.
   */
  private reconstruirReservasDelDia(): void {
    const ahora                = Date.now();
    const claveDiaSeleccionado = this.claveDia(this.fechaSeleccionada);

    this.reservasDelDia = this.todasLasReservas
      .filter(r =>
        r.estado === EstadoReserva.CONFIRMADA &&
        this.claveDia(new Date(r.fecha)) === claveDiaSeleccionado
      )
      .map(r => {
        const enriquecida  = this.enriquecer(r);
        const yaFinalizada = this.getFechaFin(r, enriquecida.sesion) <= ahora;
        return { ...enriquecida, yaFinalizada };
      })
      .sort((a, b) => {
        const hA = a.sesion?.horaInicio ?? '';
        const hB = b.sesion?.horaInicio ?? '';
        return hA.localeCompare(hB);
      });
  }

  /**
   * Separa las reservas del cliente en pendientes (futuras confirmadas)
   * e historial (pasadas o canceladas), enriquecidas con datos de sesión.
   * Utiliza la hora de fin real de la sesión viva para determinar si ha finalizado,
   * evitando que sesiones del día en curso caigan prematuramente al historial.
   * Las reservas del historial reciben el estado FINALIZADA si la sesión ya
   * concluyó sin haber sido cancelada, o CANCELADA si el cliente la canceló.
   */
  private reconstruirPendientesEHistorial(): void {
    const ahora = Date.now();

    this.reservasPendientes = this.todasLasReservas
      .filter(r => {
        if (r.estado !== EstadoReserva.CONFIRMADA) return false;
        const sesion = this.todasLasSesiones.find(s => s.uid === r.sesionId);
        return this.getFechaFin(r, sesion) > ahora;
      })
      .map(r => this.enriquecer(r))
      .sort((a, b) => a.fecha - b.fecha);

    this.reservasHistorial = this.todasLasReservas
      .filter(r => {
        if (r.estado === EstadoReserva.CANCELADA) return true;
        const sesion = this.todasLasSesiones.find(s => s.uid === r.sesionId);
        return this.getFechaFin(r, sesion) <= ahora;
      })
      .map(r => {
        const enriquecida = this.enriquecer(r);
        /* Si la reserva no fue cancelada explícitamente la marcamos como FINALIZADA */
        if (r.estado !== EstadoReserva.CANCELADA) {
          return { ...enriquecida, estado: EstadoReserva.FINALIZADA };
        }
        return enriquecida;
      })
      .sort((a, b) => b.fecha - a.fecha);
  }

  /**
   * Calcula el timestamp real de fin de sesión usando la hora de fin de la sesión viva.
   * Si la sesión ya no existe en Firebase se toma el final del día como fallback conservador,
   * evitando que reservas sin sesión caigan al historial de forma prematura.
   * @param reserva  Objeto IBooking de la reserva
   * @param sesion   Sesión viva obtenida desde la cache reactiva (puede ser undefined)
   * @returns Timestamp en milisegundos del momento de fin de la sesión
   */
  private getFechaFin(reserva: IBooking, sesion?: ISession): number {
    const horaFin      = sesion?.horaFin ?? '23:59';
    const [hFin, mFin] = horaFin.split(':').map(Number);
    const fechaFin     = new Date(reserva.fecha);
    fechaFin.setHours(hFin, mFin, 0, 0);
    return fechaFin.getTime();
  }

  /**
   * Enriquece una reserva con los datos de la sesión en vivo desde la cache reactiva.
   * Sin sesionSnapshot, si la sesión fue eliminada de Firebase la reserva queda sin datos
   * de sesión pero se mantiene en el historial para no perder el registro.
   * @param reserva Objeto IBooking a enriquecer
   * @returns Reserva con la propiedad sesion populada desde la cache o undefined
   */
  private enriquecer(reserva: IBooking): IBooking & { sesion?: ISession & { uid: string } } {
    const sesionViva = this.todasLasSesiones.find(s => s.uid === reserva.sesionId);
    return { ...reserva, sesion: sesionViva };
  }

  /**
   * Resuelve el nombre del centro deportivo a partir de su centroId.
   * Se usa en el historial para que el cliente identifique a qué centro pertenece cada sesión.
   * @param centroId UID del administrador que actúa como clave del centro
   * @returns Nombre del centro o guión si no se encuentra
   */
  getNombreCentro(centroId: string): string {
    return this.centros.find(c => c.adminUid === centroId)?.nombre ?? '—';
  }

  /**
   * Cancela una reserva confirmada con confirmación previa del usuario.
   * Decrementa el aforoActual de la sesión de forma atómica para liberar la plaza.
   * @param reserva Reserva a cancelar con su sesión enriquecida
   */
  cancelarReserva(reserva: IBooking & { sesion?: ISession & { uid: string } }): void {
    if (!reserva.uid || !reserva.sesion) return;

    this.snackbarService.showConfirm(
      '¿Confirmas la cancelación de esta reserva? La plaza quedará libre para otros clientes.',
      'CANCELAR',
      () => {
        const aforoNuevo = Math.max(0, reserva.sesion!.aforoActual - 1);
        this.bookingService
          .cancelarReserva(reserva.uid!, reserva.sesionId, aforoNuevo)
          .then(() => this.snackbarService.showSuccess('Reserva cancelada correctamente'))
          .catch(e => {
            console.error('Error al cancelar la reserva:', e);
            this.snackbarService.showError('Error al cancelar la reserva');
          });
      }
    );
  }

  /**
   * Elimina permanentemente una reserva del historial con confirmación previa.
   * Disponible tanto para reservas CANCELADA como FINALIZADA: las canceladas
   * las gestiona el cliente voluntariamente; las finalizadas son registros históricos
   * que el cliente puede limpiar una vez la sesión ha concluido.
   * @param reserva Reserva a eliminar permanentemente
   */
  eliminarReserva(reserva: IBooking): void {
    if (!reserva.uid) return;
    if (reserva.estado !== EstadoReserva.CANCELADA && reserva.estado !== EstadoReserva.FINALIZADA) return;

    this.snackbarService.showConfirm(
      '¿Eliminar este registro del historial? Esta acción no se puede deshacer.',
      'ELIMINAR',
      () => {
        this.bookingService
          .eliminarReserva(reserva.uid!)
          .then(() => this.snackbarService.showSuccess('Registro eliminado'))
          .catch(e => {
            console.error('Error al eliminar la reserva:', e);
            this.snackbarService.showError('Error al eliminar el registro');
          });
      }
    );
  }

  /**
   * Comprueba si un día del calendario tiene al menos una reserva confirmada.
   * @param dia Objeto Date a comprobar
   */
  tieneReserva(dia: Date): boolean {
    return this.diasConReserva.has(this.claveDia(dia));
  }

  /**
   * Genera la clave de identificación única de un día en formato YYYY-M-D.
   * @param dia Objeto Date del que extraer la clave
   */
  private claveDia(dia: Date): string {
    return `${dia.getFullYear()}-${dia.getMonth()}-${dia.getDate()}`;
  }

  /**
   * Método de control interno para desactivar el spinner global
   * una vez que ambas cargas asíncronas han finalizado.
   */
  private checkLoading(): void {
    if (!this.loadingReservas && !this.loadingSesiones) {
      this.loading = false;
    }
  }

  /**
   * Genera la cuadrícula del calendario para el mes actualmente visualizado.
   * Rellena con null las celdas vacías anteriores al primer día de la semana.
   */
  generarCalendario(): void {
    const año       = this.mesActual.getFullYear();
    const mes       = this.mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);

    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const dias: (Date | null)[] = [
      ...Array(offsetInicio).fill(null),
      ...Array.from({ length: ultimoDia.getDate() }, (_, i) => new Date(año, mes, i + 1))
    ];

    this.semanas = [];
    for (let i = 0; i < dias.length; i += 7) {
      this.semanas.push(dias.slice(i, i + 7));
    }
  }

  /**
   * Retrocede al mes anterior en el calendario, actualiza la fecha seleccionada
   * al día 1 del nuevo mes y regenera la cuadrícula y las reservas del día.
   */
  mesAnterior(): void {
    this.mesActual         = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.fechaSeleccionada = new Date(this.mesActual);
    this.generarCalendario();
    this.reconstruirReservasDelDia();
    this.cdr.detectChanges();
  }

  /**
   * Avanza al mes siguiente en el calendario, actualiza la fecha seleccionada
   * al día 1 del nuevo mes y regenera la cuadrícula y las reservas del día.
   */
  mesSiguiente(): void {
    this.mesActual         = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.fechaSeleccionada = new Date(this.mesActual);
    this.generarCalendario();
    this.reconstruirReservasDelDia();
    this.cdr.detectChanges();
  }

  /**
   * Gestiona la selección de un día en el calendario, actualiza la fecha
   * seleccionada y recarga las reservas del nuevo día seleccionado.
   * Permite seleccionar cualquier día incluyendo pasados para consultar el historial.
   * @param dia Objeto Date del día pulsado por el usuario
   */
  seleccionarDia(dia: Date): void {
    this.fechaSeleccionada = dia;
    this.reconstruirReservasDelDia();
    this.cdr.detectChanges();
  }

  /**
   * Comprueba si una fecha del calendario corresponde al día de hoy.
   * @param dia Objeto Date a comprobar
   */
  esHoy(dia: Date): boolean {
    const hoy = new Date();
    return dia.getDate()     === hoy.getDate()     &&
           dia.getMonth()    === hoy.getMonth()    &&
           dia.getFullYear() === hoy.getFullYear();
  }

  /**
   * Comprueba si una fecha del calendario corresponde al día actualmente seleccionado.
   * @param dia Objeto Date a comprobar
   */
  esSeleccionado(dia: Date): boolean {
    return dia.getDate()     === this.fechaSeleccionada.getDate()     &&
           dia.getMonth()    === this.fechaSeleccionada.getMonth()    &&
           dia.getFullYear() === this.fechaSeleccionada.getFullYear();
  }

  /**
   * Comprueba si una fecha del calendario es anterior al día de hoy.
   * @param dia Objeto Date a comprobar
   */
  esPasado(dia: Date): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return dia < hoy;
  }

  /**
   * Devuelve el nombre del mes y año en español para la cabecera del calendario.
   * @param fecha Objeto Date del que extraer el nombre del mes
   */
  getNombreMes(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  /**
   * Parsea un timestamp epoch a una cadena de fecha legible en formato español.
   * @param timestamp Milisegundos epoch a convertir
   */
  parsearFecha(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  /**
   * Redirección al panel principal de la aplicación.
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}