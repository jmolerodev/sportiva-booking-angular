import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule }                                     from '@angular/common';
import { Router, ActivatedRoute }                           from '@angular/router';
import { Subscription, switchMap, of }                      from 'rxjs';
import { AuthService }          from '../../services/auth';
import { SportCentreService }   from '../../services/sport-centre-service';
import { SessionService }       from '../../services/session-service';
import { MediaService }         from '../../services/media-service';
import { MembershipService }    from '../../services/membershipservice';
import { SnackbarService }      from '../../services/snackbar';
import { ISportCentre }         from '../../interfaces/Sport-Centre-Interface';
import { ISession, ISlotHorario } from '../../interfaces/Sesion-Interface';
import { IMedia }               from '../../interfaces/Media-Interface';
import { IMembership }          from '../../interfaces/Membresia-Interface';
import { EstadoSlot }           from '../../enums/EstadoSlot';
import { EstadoSesion }         from '../../enums/EstadoSesion';
import { Rol }                  from '../../enums/Rol';

@Component({
  selector:    'app-sport-centre-detail',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './sportcentredetail.html',
  styleUrl:    './sportcentredetail.css'
})
export class SportCentreDetail implements OnInit, OnDestroy {

  /* Centro deportivo cargado a partir del parámetro de ruta */
  public centro: ISportCentre | null = null;

  /* UID del cliente autenticado en sesión */
  public clienteUid: string | null = null;

  /* Membresía activa del cliente con este centro (null si no tiene) */
  public membresiaActiva: IMembership | null = null;

  /* Colección de vídeos vinculados al centro para la galería multimedia */
  public videos: IMedia[] = [];

  /* Vídeo actualmente seleccionado para reproducción en el modal */
  public videoReproduciendo: IMedia | null = null;

  /* Fecha actualmente seleccionada en el calendario */
  public fechaSeleccionada: Date = new Date();

  /* Año y mes que se están visualizando en el calendario */
  public mesActual: Date = new Date();

  /* Matriz de semanas que componen la cuadrícula del calendario */
  public semanas: (Date | null)[][] = [];

  /* Sesiones del centro en el día seleccionado */
  public sesionesDelDia: ISession[] = [];

  /* Slots horarios generados para el día seleccionado */
  public slotsDelDia: ISlotHorario[] = [];

  /* Sesión seleccionada para mostrar su detalle en el panel lateral */
  public sesionSeleccionada: ISession | null = null;

  /* Flag de control para el estado de carga global */
  public loading: boolean = true;

  /* Flag de control para la carga independiente de la imagen hero */
  public imagenHeroCargada: boolean = false;

  /* Flag que indica si el cliente puede reservar en este centro */
  public puedeReservar: boolean = false;

  /* Nombres de los días de la semana para la cabecera del calendario */
  public readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  /* Flags de carga asíncrona independiente para el control del spinner */
  private loadingCentro:    boolean = true;
  private loadingMembresia: boolean = true;
  private loadingMedia:     boolean = true;

  /* UID del centro extraído de los parámetros de ruta */
  private centroId: string | null = null;

  private subscription: Subscription = new Subscription();

  /**
   * Constructor del componente con inyección de dependencias
   * @param authService         Servicio encargado de la identidad y permisos del usuario
   * @param sportCentreService  Servicio para la gestión de centros deportivos
   * @param sessionService      Servicio para la gestión de sesiones deportivas
   * @param mediaService        Servicio para la gestión del contenido multimedia
   * @param membershipService   Servicio para la verificación y gestión de membresías
   * @param snackbarService     Servicio para el despliegue de alertas y confirmaciones
   * @param router              Servicio para gestionar la navegación entre vistas
   * @param route               Servicio para capturar parámetros de la URL activa
   * @param cdr                 Servicio para forzar la detección de cambios en el ciclo de Angular
   */
  constructor(
    private authService:        AuthService,
    private sportCentreService: SportCentreService,
    private sessionService:     SessionService,
    private mediaService:       MediaService,
    private membershipService:  MembershipService,
    private snackbarService:    SnackbarService,
    private router:             Router,
    private route:              ActivatedRoute,
    private cdr:                ChangeDetectorRef
  ) { }

  /**
   * Inicialización del componente: extrae el centroId de la ruta, valida
   * que el usuario es un cliente autenticado y orquesta las cargas en paralelo.
   * Si no hay sesión activa muestra un aviso informativo y redirige al login
   * en lugar de petardear la aplicación silenciosamente.
   */
  ngOnInit(): void {
    this.generarCalendario();

    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        switchMap(user => {
          if (!user) {
            /* Usuario no autenticado: informamos y redirigimos al login */
            this.snackbarService.showError('Inicia sesión para ver los detalles de este centro');
            this.router.navigate(['/login']);
            return of(null);
          }
          this.clienteUid = user.uid;
          return this.authService.getRol();
        })
      ).subscribe(rol => {
        if (!rol) return;

        /* Solo los clientes pueden acceder a la vista de detalle de centro */
        if (rol !== Rol.CLIENTE) {
          this.snackbarService.showError('Esta sección es exclusiva para clientes');
          this.router.navigate(['/home']);
          return;
        }

        this.centroId = this.route.snapshot.paramMap.get('centroId');

        if (!this.centroId) {
          this.router.navigate(['/home']);
          return;
        }

        this.cargarCentro();
        this.cargarMedia();
        this.verificarMembresia();
      })
    );
  }

  /**
   * Carga los datos del centro a partir del centroId extraído de la ruta
   */
  private cargarCentro(): void {
    if (!this.centroId) return;

    this.subscription.add(
      this.sportCentreService.getSportCentreByUid(this.centroId).subscribe({
        next: centro => {
          this.centro = centro;
          if (centro) this.cargarSesionesDelDia();
          this.loadingCentro = false;
          this.checkLoading();
          this.cdr.detectChanges();
        },
        error: e => {
          console.error('Error al cargar el centro:', e);
          this.loadingCentro = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
   * Carga el contenido multimedia vinculado al centro para la galería
   */
  private cargarMedia(): void {
    if (!this.centroId) return;

    this.subscription.add(
      this.mediaService.getMediaByCentro(this.centroId).subscribe({
        next: videos => {
          this.videos = videos ?? [];
          this.loadingMedia = false;
          this.checkLoading();
          this.cdr.detectChanges();
        },
        error: e => {
          console.error('Error al cargar la multimedia del centro:', e);
          this.loadingMedia = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
   * Verifica si el cliente tiene una membresía activa y vigente con este centro.
   * El resultado determina si puede acceder a la reserva de sesiones o es
   * redirigido al flujo de pago de membresía.
   */
  private verificarMembresia(): void {
    if (!this.clienteUid || !this.centroId) return;

    this.subscription.add(
      this.membershipService.getMembresiaActivaByClienteYCentro(
        this.clienteUid,
        this.centroId
      ).subscribe({
        next: membresia => {
          this.membresiaActiva  = membresia;
          this.puedeReservar    = membresia !== null;
          this.loadingMembresia = false;
          this.checkLoading();
          this.cdr.detectChanges();
        },
        error: e => {
          console.error('Error al verificar la membresía:', e);
          this.loadingMembresia = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
   * Método de control interno para desactivar el spinner global
   * una vez que todas las cargas asíncronas han finalizado
   */
  private checkLoading(): void {
    if (!this.loadingCentro && !this.loadingMembresia && !this.loadingMedia) {
      this.loading = false;
    }
  }

  /**
   * Genera la cuadrícula del calendario para el mes actualmente visualizado.
   * Rellena con null las celdas vacías anteriores al primer día de la semana
   */
  generarCalendario(): void {
    const año       = this.mesActual.getFullYear();
    const mes       = this.mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);

    /* Ajustamos el offset para que la semana arranque en Lunes (0=Lun ... 6=Dom) */
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const dias: (Date | null)[] = [
      ...Array(offsetInicio).fill(null),
      ...Array.from({ length: ultimoDia.getDate() }, (_, i) => new Date(año, mes, i + 1))
    ];

    /* Agrupamos los días en filas de 7 celdas */
    this.semanas = [];
    for (let i = 0; i < dias.length; i += 7) {
      this.semanas.push(dias.slice(i, i + 7));
    }
  }

  /**
   * Retrocede al mes anterior en el calendario y regenera la cuadrícula
   */
  mesAnterior(): void {
    this.mesActual         = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.fechaSeleccionada = new Date(this.mesActual);
    this.generarCalendario();
    this.cargarSesionesDelDia();
  }

  /**
   * Avanza al mes siguiente en el calendario y regenera la cuadrícula
   */
  mesSiguiente(): void {
    this.mesActual         = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
    this.fechaSeleccionada = new Date(this.mesActual);
    this.generarCalendario();
    this.cargarSesionesDelDia();
  }

  /**
   * Gestiona la selección de un día en el calendario: actualiza la fecha
   * seleccionada, limpia la sesión en detalle y recarga los slots del nuevo día
   * @param dia Objeto Date del día pulsado por el usuario
   */
  seleccionarDia(dia: Date): void {
    this.fechaSeleccionada  = dia;
    this.sesionSeleccionada = null;
    this.cargarSesionesDelDia();
  }

  /**
   * Carga las sesiones activas del centro para el día seleccionado y
   * construye la lista de slots horarios con su estado correspondiente
   */
  cargarSesionesDelDia(): void {
    if (!this.centro) return;

    const centroId  = this.centro.adminUid;
    const inicioDia = new Date(this.fechaSeleccionada);
    inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(this.fechaSeleccionada);
    finDia.setHours(23, 59, 59, 999);

    this.subscription.add(
      this.sessionService.getSessionsByCentroAndFecha(
        centroId,
        inicioDia.getTime(),
        finDia.getTime()
      ).subscribe({
        next: sesiones => {
          this.sesionesDelDia = sesiones ?? [];
          this.slotsDelDia    = this.generarSlots();
          this.cdr.detectChanges();
        },
        error: e => console.error('Error al cargar sesiones del día:', e)
      })
    );
  }

  /**
   * Genera los slots horarios hora a hora a partir del horario del centro
   * para el día seleccionado en modo lectura (sin EstadoSlot.PROPIO).
   * Los slots con sesión activa muestran la info de la sesión disponible.
   * @returns Array de slots con hora, estado y sesión asociada si la hay
   */
  private generarSlots(): ISlotHorario[] {
    if (!this.centro?.horario) return [];
    if (this.esPasado(this.fechaSeleccionada)) return [];

    const nombreDia  = this.getNombreDia(this.fechaSeleccionada);
    const horarioDia = this.centro.horario[nombreDia];

    /* Si el centro está cerrado ese día no generamos ningún slot */
    if (!horarioDia?.abierto) return [];

    const slots: ISlotHorario[] = [];
    const [hApertura] = horarioDia.apertura.split(':').map(Number);
    const [hCierre]   = horarioDia.cierre.split(':').map(Number);

    const ahora             = new Date();
    const esHoySeleccionado = this.esHoy(this.fechaSeleccionada);

    /* Si es hoy pero el centro ya ha cerrado no mostramos slots */
    if (esHoySeleccionado && ahora.getHours() >= hCierre) return [];

    for (let h = hApertura; h < hCierre; h++) {

      /* Si es hoy, ignoramos horas que ya han pasado */
      if (esHoySeleccionado && h <= ahora.getHours()) continue;

      const horaInicio = `${String(h).padStart(2, '0')}:00`;
      const horaFin    = `${String(h + 1).padStart(2, '0')}:00`;

      const sesion = this.sesionesDelDia.find(
        s => s.horaInicio === horaInicio && s.estado === EstadoSesion.ACTIVA
      ) ?? null;

      /* En la vista de cliente solo distinguimos LIBRE (sin sesión) u OCUPADO (con sesión) */
      const estado: EstadoSlot = sesion ? EstadoSlot.OCUPADO : EstadoSlot.LIBRE;

      slots.push({ horaInicio, horaFin, estado, sesion });
    }

    return slots;
  }

  /**
   * Gestiona el click sobre un slot con sesión disponible.
   * Si el cliente tiene membresía activa muestra el detalle de la sesión.
   * Si no tiene membresía lo redirige al flujo de contratación.
   * @param slot Slot horario pulsado por el cliente
   */
  seleccionarSlot(slot: ISlotHorario): void {
    if (slot.estado === EstadoSlot.LIBRE || !slot.sesion) return;

    if (!this.puedeReservar) {
      this.snackbarService.showConfirm(
        'Necesitas una membresía activa para reservar sesiones en este centro. ¿Deseas contratar una ahora?',
        'CONTRATAR',
        () => this.router.navigate(['/membership-payment', this.centroId])
      );
      return;
    }

    this.sesionSeleccionada = slot.sesion;
  }

  /**
   * Cierra el panel de detalle de la sesión seleccionada
   */
  cerrarDetalleSesion(): void {
    this.sesionSeleccionada = null;
  }

  /**
   * Abre el modal reproductor cargando el vídeo seleccionado de la galería
   * @param video Objeto IMedia con la URL y metadatos del vídeo a reproducir
   */
  abrirReproductor(video: IMedia): void {
    this.videoReproduciendo = video;
  }

  /**
   * Cierra el modal reproductor y libera la referencia al vídeo activo
   */
  cerrarReproductor(): void {
    this.videoReproduciendo = null;
  }

  /**
   * Redirige al cliente al flujo de contratación de membresía del centro actual
   */
  irAContratarMembresia(): void {
    this.router.navigate(['/membership-payment', this.centroId]);
  }

  /**
   * Devuelve el nombre del día de la semana en español para un objeto Date dado
   * @param fecha Objeto Date del que extraer el nombre del día
   */
  private getNombreDia(fecha: Date): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[fecha.getDay()];
  }

  /**
   * Comprueba si una fecha del calendario corresponde al día de hoy
   * @param dia Objeto Date a comprobar
   */
  esHoy(dia: Date): boolean {
    const hoy = new Date();
    return dia.getDate()     === hoy.getDate()     &&
           dia.getMonth()    === hoy.getMonth()    &&
           dia.getFullYear() === hoy.getFullYear();
  }

  /**
   * Comprueba si una fecha del calendario corresponde al día actualmente seleccionado
   * @param dia Objeto Date a comprobar
   */
  esSeleccionado(dia: Date): boolean {
    return dia.getDate()     === this.fechaSeleccionada.getDate()     &&
           dia.getMonth()    === this.fechaSeleccionada.getMonth()    &&
           dia.getFullYear() === this.fechaSeleccionada.getFullYear();
  }

  /**
   * Comprueba si una fecha del calendario es anterior al día de hoy
   * @param dia Objeto Date a comprobar
   */
  esPasado(dia: Date): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return dia < hoy;
  }

  /**
   * Devuelve el nombre del mes y año en español para la cabecera del calendario
   * @param fecha Objeto Date del que extraer el nombre del mes
   */
  getNombreMes(fecha: Date): string {
    return fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  }

  /**
   * Parsea un timestamp epoch a una cadena de fecha legible en formato español
   * @param timestamp Milisegundos epoch a convertir
   */
  parsearFecha(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
  }

  /**
   * Resuelve la ruta de la imagen o devuelve la imagen por defecto si no existe
   * @param foto URL del recurso almacenado en Firebase Storage
   */
  getFoto(foto: string): string {
    return (foto && foto.trim() !== '') ? foto : 'centro-default.png';
  }

  /**
   * Devuelve los días del horario en orden de lunes a domingo
   * @param horario Objeto horario semanal del centro
   */
  getDias(horario: any): string[] {
    const orden = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return orden.filter(dia => horario && horario[dia] !== undefined);
  }

  /**
   * Redirección al panel principal de la aplicación
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

  /**
   * Limpieza de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.centro = null;
  }
}