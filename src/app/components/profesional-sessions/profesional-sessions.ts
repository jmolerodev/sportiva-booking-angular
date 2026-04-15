import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, switchMap, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import { SessionService } from '../../services/session-service';
import { SportCentreService } from '../../services/sport-centre-service';
import { ProfesionalService } from '../../services/profesional-service';
import { SnackbarService } from '../../services/snackbar';
import { ISportCentre } from '../../interfaces/Sport-Centre-Interface';
import { TipoSesion } from '../../enums/TipoSesion';
import { ModalidadSesion } from '../../enums/ModalidadSesion';
import { EstadoSesion } from '../../enums/EstadoSesion';
import { Rol } from '../../enums/Rol';
import { IFormSesion, ISession } from '../../interfaces/Sesion-Interface';
import { ISlotHorario } from '../../interfaces/Sesion-Interface'
import { EstadoSlot } from '../../enums/EstadoSlot';


@Component({
  selector: 'app-session-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profesional-sessions.html',
  styleUrl: './profesional-sessions.css'
})
export class ProfesionalSessions implements OnInit, OnDestroy {

  /*Centro deportivo al que está vinculado el profesional autenticado*/
  public centro: ISportCentre | null = null;

  /*UID del profesional autenticado en sesión*/
  public profesionalUid: string | null = null;

  /*Especialidad del profesional: determina qué tipos de sesión puede crear*/
  public especialidad: string | null = null;

  /*Fecha actualmente seleccionada en el calendario (objeto Date)*/
  public fechaSeleccionada: Date = new Date();

  /*Año y mes que se están visualizando en el calendario*/
  public mesActual: Date = new Date();

  /*Matriz de semanas que componen la cuadrícula del calendario del mes actual*/
  public semanas: (Date | null)[][] = [];

  /*Sesiones del centro en el día seleccionado (propias y de otros profesionales)*/
  public sesionesDelDia: ISession[] = [];

  /*Slots horarios generados a partir del horario del centro para el día seleccionado*/
  public slotsDelDia: ISlotHorario[] = [];

  /*Historial de sesiones pasadas del profesional ordenadas de más reciente a más antigua*/
  public sesionesHistorial: ISession[] = [];

  /*Flag de control para la gestión del estado de carga global (Spinner)*/
  public loading: boolean = true;

  /*Flag de control para mostrar u ocultar el modal de creación de sesión*/
  public modalVisible: boolean = false;

  /*Slot seleccionado sobre el que se va a crear una sesión nueva*/
  public slotSeleccionado: ISlotHorario | null = null;

  /*Modelo de datos del formulario de creación enlazado con ngModel*/
  public formSesion: IFormSesion = this.getFormVacio();

  /*Enums expuestos al template para su uso en directivas y comparaciones*/
  public readonly TipoSesion = TipoSesion;
  public readonly ModalidadSesion = ModalidadSesion;
  public readonly EstadoSesion = EstadoSesion;

  /*Nombres de los días de la semana para la cabecera del calendario*/
  public readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  /*Flags de control para la carga asíncrona independiente de centro e historial*/
  private loadingCentro: boolean = true;
  private loadingHistorial: boolean = true;

  private subscription: Subscription = new Subscription();

  /**
   * Constructor del componente con inyección de dependencias
   * @param authService Servicio encargado de la identidad y permisos del usuario
   * @param sessionService Servicio para la gestión de sesiones deportivas
   * @param sportCentreService Servicio para la gestión de centros deportivos
   * @param profesionalService Servicio para la gestión de profesionales y su especialidad
   * @param snackbarService Servicio para el despliegue de alertas y confirmaciones
   * @param router Servicio para gestionar la navegación entre vistas
   * @param cdr Servicio para forzar la detección de cambios en el ciclo de Angular
   */
  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private sportCentreService: SportCentreService,
    private profesionalService: ProfesionalService,
    private snackbarService: SnackbarService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  /**
   * Inicialización del componente: carga del profesional autenticado, su especialidad,
   * su centro vinculado y el historial de sesiones pasadas en paralelo
   */
  ngOnInit(): void {
    this.generarCalendario();

    /*Flujo principal: validamos sesión, rol, cargamos especialidad y centro del profesional*/
    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        switchMap(user => {
          if (!user) {
            this.router.navigate(['/home']);
            return of(null);
          }
          this.profesionalUid = user.uid;
          return this.authService.getRol().pipe(
            switchMap(rol => {
              if (rol !== Rol.PROFESIONAL) {
                this.router.navigate(['/home']);
                return of(null);
              }
              /*Cargamos la especialidad en paralelo al centro sin bloquear el flujo*/
              this.subscription.add(
                this.profesionalService.getEspecialidadByUid(user.uid).subscribe({
                  next: (esp) => {
                    this.especialidad = esp;
                    this.cdr.detectChanges();
                  },
                  error: (e) => console.error('Error al cargar la especialidad:', e)
                })
              );
              return this.sportCentreService.getSportCentreByProfessionalUid(user.uid);
            })
          );
        })
      ).subscribe({
        next: (centro) => {
          if (!centro) {
            this.loadingCentro = false;
            this.checkLoading();
            return;
          }
          this.centro = centro;
          this.cargarSesionesDelDia();
          this.loadingCentro = false;
          this.checkLoading();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Error al cargar el centro del profesional:', e);
          this.loadingCentro = false;
          this.checkLoading();
        }
      })
    );

    /*Flujo paralelo: historial de sesiones pasadas del profesional*/
    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        switchMap(user => {
          if (!user) return of([]);
          return this.sessionService.getSessionsByProfesional(user.uid);
        })
      ).subscribe({
        next: (sesiones) => {
          const ahora = Date.now();
          this.sesionesHistorial = (sesiones ?? [])
            .filter(s => {
              /*
               * Una sesión es pasada cuando su fecha + hora de fin ya han transcurrido.
               * Construimos el timestamp exacto del fin de la sesión combinando fecha y horaFin
               * para que aparezca en el historial en el minuto exacto en que termina
               */
              const [hFin, mFin] = s.horaFin.split(':').map(Number);
              const fechaFin = new Date(s.fecha);
              fechaFin.setHours(hFin, mFin, 0, 0);
              return fechaFin.getTime() < ahora;
            })
            .sort((a, b) => b.fecha - a.fecha);
          this.loadingHistorial = false;
          this.checkLoading();
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Error al cargar historial de sesiones:', e);
          this.loadingHistorial = false;
          this.checkLoading();
        }
      })
    );
  }

  /**
   * Método de control interno para desactivar el spinner global
   * una vez que ambas cargas asíncronas han finalizado
   */
  private checkLoading(): void {
    if (!this.loadingCentro && !this.loadingHistorial) {
      this.loading = false;
    }
  }

  /**
   * Genera la cuadrícula del calendario para el mes actualmente visualizado.
   * Rellena con null las celdas vacías anteriores al primer día de la semana
   */
  generarCalendario(): void {
    const año = this.mesActual.getFullYear();
    const mes = this.mesActual.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);

    /*Ajustamos el offset para que la semana arranque en Lunes (0=Lun ... 6=Dom)*/
    const offsetInicio = (primerDia.getDay() + 6) % 7;

    const dias: (Date | null)[] = [
      ...Array(offsetInicio).fill(null),
      ...Array.from({ length: ultimoDia.getDate() }, (_, i) => new Date(año, mes, i + 1))
    ];

    /*Agrupamos los días en filas de 7 celdas*/
    this.semanas = [];
    for (let i = 0; i < dias.length; i += 7) {
      this.semanas.push(dias.slice(i, i + 7));
    }
  }

  /**
   * Retrocede al mes anterior en el calendario y regenera la cuadrícula
   */
  mesAnterior(): void {
    this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() - 1, 1);
    this.fechaSeleccionada = new Date(this.mesActual); 
    this.generarCalendario();
    this.cargarSesionesDelDia(); 
  }

  /**
   * Avanza al mes siguiente en el calendario y regenera la cuadrícula
   */
  mesSiguiente(): void {
  this.mesActual = new Date(this.mesActual.getFullYear(), this.mesActual.getMonth() + 1, 1);
  this.fechaSeleccionada = new Date(this.mesActual); 
  this.generarCalendario();
  this.cargarSesionesDelDia(); 
}

  /**
   * Gestiona la selección de un día en el calendario: actualiza la fecha
   * seleccionada y recarga los slots horarios del nuevo día
   * @param dia Objeto Date del día pulsado por el usuario
   */
  seleccionarDia(dia: Date): void {
    this.fechaSeleccionada = dia;
    this.cargarSesionesDelDia();
  }

  /**
   * Carga las sesiones activas del centro para el día seleccionado y
   * construye la lista de slots horarios con su estado correspondiente
   */
  cargarSesionesDelDia(): void {
    if (!this.centro) return;

    const centroId = this.centro.adminUid;
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
        next: (sesiones) => {
          this.sesionesDelDia = sesiones ?? [];
          this.slotsDelDia = this.generarSlots();
          this.cdr.detectChanges();
        },
        error: (e) => console.error('Error al cargar sesiones del día:', e)
      })
    );
  }

  /**
   * Genera los slots horarios hora a hora a partir del horario del centro
   * para el día seleccionado, asignando el estado de cada franja horaria
   * @returns Array de slots con hora, estado y sesión asociada si la hay
   */
  private generarSlots(): ISlotHorario[] {
    if (!this.centro?.horario) return [];


    if (this.esPasado(this.fechaSeleccionada)) return [];

    const nombreDia = this.getNombreDia(this.fechaSeleccionada);
    const horarioDia = this.centro.horario[nombreDia];

    /*Si el centro está cerrado ese día no generamos ningún slot*/
    if (!horarioDia?.abierto) return [];

    const slots: ISlotHorario[] = [];
    const [hApertura] = horarioDia.apertura.split(':').map(Number);
    const [hCierre] = horarioDia.cierre.split(':').map(Number);

    /* Referencia temporal para validar horas pasadas */
    const ahora = new Date();
    const esHoySeleccionado = this.esHoy(this.fechaSeleccionada);

    /* 🔥 NUEVO: si es hoy pero el centro ya ha cerrado no mostramos slots */
    if (esHoySeleccionado && ahora.getHours() >= hCierre) return [];

    for (let h = hApertura; h < hCierre; h++) {

      /* Si es hoy, ignoramos horas que ya han pasado */
      if (esHoySeleccionado && h <= ahora.getHours()) {
        continue;
      }

      const horaInicio = `${String(h).padStart(2, '0')}:00`;
      const horaFin = `${String(h + 1).padStart(2, '0')}:00`;

      const sesion = this.sesionesDelDia.find(
        s => s.horaInicio == horaInicio && s.estado == EstadoSesion.ACTIVA
      ) ?? null;

      let estado: EstadoSlot;
      if (!sesion) {
        estado = EstadoSlot.LIBRE;
      } else if (sesion.profesionalId == this.profesionalUid) {
        estado = EstadoSlot.PROPIO;
      } else {
        estado = EstadoSlot.OCUPADO;
      }

      slots.push({ horaInicio, horaFin, estado, sesion });
    }

    return slots;
  }

  /**
   * Devuelve el nombre del día de la semana en español para un objeto Date dado.
   * Necesario para indexar el horario del centro almacenado en Firebase
   * @param fecha Objeto Date del que extraer el nombre del día
   */
  private getNombreDia(fecha: Date): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return dias[fecha.getDay()];
  }

  /**
   * Abre el modal de creación posicionándolo sobre el slot libre seleccionado.
   * Pre-carga el tipo de sesión según la especialidad del profesional y fija
   * la modalidad a INDIVIDUAL si es fisioterapeuta
   * @param slot Slot horario libre pulsado por el profesional
   */
  abrirModal(slot: ISlotHorario): void {
    if (slot.estado !== EstadoSlot.LIBRE) return;
    this.slotSeleccionado = slot;
    this.formSesion = this.getFormVacio();

    /*Pre-seleccionamos tipo y modalidad según la especialidad del profesional*/
    if (this.especialidad == 'ENTRENADOR') {
      this.formSesion.tipo = TipoSesion.ENTRENAMIENTO;
    } else if (this.especialidad == 'FISIOTERAPEUTA') {
      this.formSesion.tipo = TipoSesion.FISIOTERAPIA;
      this.formSesion.modalidad = ModalidadSesion.INDIVIDUAL;
    }

    this.modalVisible = true;
  }

  /**
   * Cierra el modal de creación y limpia el estado del formulario y slot seleccionado
   */
  cerrarModal(): void {
    this.modalVisible = false;
    this.slotSeleccionado = null;
    this.formSesion = this.getFormVacio();
  }

  /**
   * Persiste la nueva sesión en Firebase con estado ACTIVA usando los datos
   * del formulario y el slot horario seleccionado.
   * Aplica las restricciones de especialidad como capa de seguridad adicional
   */
  guardarSesion(): void {
    if (!this.slotSeleccionado || !this.centro || !this.profesionalUid) return;
    if (!this.formSesion.titulo || !this.formSesion.tipo || !this.formSesion.modalidad) {
      this.snackbarService.showError('Por favor, completa todos los campos obligatorios');
      return;
    }

    /*Capa de seguridad: verificamos que el tipo coincide con la especialidad del profesional*/
    const tipoValido =
      (this.especialidad == 'ENTRENADOR' && this.formSesion.tipo == TipoSesion.ENTRENAMIENTO) ||
      (this.especialidad == 'FISIOTERAPEUTA' && this.formSesion.tipo == TipoSesion.FISIOTERAPIA);

    if (!tipoValido) {
      this.snackbarService.showError('El tipo de sesión no corresponde con tu especialidad');
      return;
    }

    /*Los fisioterapeutas solo pueden crear sesiones individuales*/
    if (this.especialidad == 'FISIOTERAPEUTA' && this.formSesion.modalidad !== ModalidadSesion.INDIVIDUAL) {
      this.snackbarService.showError('Las sesiones de fisioterapia deben ser individuales');
      return;
    }

    /*Si la modalidad es INDIVIDUAL el aforo queda fijo en 1*/
    const aforoMax = this.formSesion.modalidad == ModalidadSesion.INDIVIDUAL
      ? 1
      : this.formSesion.aforoMax;

    const fechaTimestamp = new Date(this.fechaSeleccionada);
    fechaTimestamp.setHours(0, 0, 0, 0);

    const nuevaSesion: ISession = {
      centroId: this.centro.adminUid,
      profesionalId: this.profesionalUid,
      tipo: this.formSesion.tipo,
      fecha: fechaTimestamp.getTime(),
      horaInicio: this.slotSeleccionado.horaInicio,
      horaFin: this.slotSeleccionado.horaFin,
      modalidad: this.formSesion.modalidad,
      aforoMax: aforoMax,
      aforoActual: 0,
      titulo: this.formSesion.titulo.trim(),
      descripcion: this.formSesion.descripcion.trim(),
      estado: EstadoSesion.ACTIVA
    };

    this.subscription.add(
      this.sessionService.createSession(nuevaSesion).subscribe({
        next: () => {
          this.snackbarService.showSuccess('Sesión creada correctamente');
          this.cerrarModal();
          this.cargarSesionesDelDia();
        },
        error: (e) => {
          console.error('Error al crear la sesión:', e);
          this.snackbarService.showError('Error al crear la sesión');
        }
      })
    );
  }

  /**
   * Proceso de eliminación física de una sesión propia con confirmación previa.
   * Elimina directamente el nodo en Firebase sin pasar por estado CANCELADA
   * @param sesion Sesión a eliminar, debe incluir el uid del nodo de Firebase
   */
  eliminarSesion(sesion: ISession & { uid?: string }): void {
    if (!sesion?.uid) return;

    this.snackbarService.showConfirm('¿Deseas eliminar esta sesión permanentemente?', 'Confirmar', () => {
      this.subscription.add(
        this.sessionService.deleteSession(sesion.uid!).subscribe({
          next: () => {
            this.snackbarService.showSuccess('Sesión eliminada correctamente');
            this.cargarSesionesDelDia();
          },
          error: (e) => {
            console.error('Error al eliminar la sesión:', e);
            this.snackbarService.showError('Error al eliminar la sesión');
          }
        })
      );
    });
  }

  /**
   * Comprueba si una fecha del calendario corresponde al día de hoy
   * @param dia Objeto Date a comprobar
   */
  esHoy(dia: Date): boolean {
    const hoy = new Date();
    return dia.getDate() == hoy.getDate() &&
      dia.getMonth() == hoy.getMonth() &&
      dia.getFullYear() == hoy.getFullYear();
  }

  /**
   * Comprueba si una fecha del calendario corresponde al día actualmente seleccionado
   * @param dia Objeto Date a comprobar
   */
  esSeleccionado(dia: Date): boolean {
    return dia.getDate() == this.fechaSeleccionada.getDate() &&
      dia.getMonth() == this.fechaSeleccionada.getMonth() &&
      dia.getFullYear() == this.fechaSeleccionada.getFullYear();
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
   * Devuelve un objeto IFormSesion vacío para inicializar o resetear el formulario
   */
  private getFormVacio(): IFormSesion {
    return {
      titulo: '',
      descripcion: '',
      tipo: null,
      modalidad: null,
      aforoMax: 2
    };
  }

  /**
   * Limpieza de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.centro = null;
  }
}