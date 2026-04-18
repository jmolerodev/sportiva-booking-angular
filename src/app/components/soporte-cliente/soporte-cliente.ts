import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { of, Subscription, switchMap } from 'rxjs';
import { AuthService } from '../../services/auth';
import { SoporteService } from '../../services/soporte-service';
import { MembershipService } from '../../services/membershipservice';
import { SnackbarService } from '../../services/snackbar';
import { ISoporteChat } from '../../interfaces/SoporteChar-Interface';
import { IMensaje } from '../../interfaces/Mensaje-Interface';
import { EstadoChat } from '../../enums/EstadoChat';
import { EstadoMembresia } from '../../enums/EstadoMembresia';
import { SportCentreService } from '../../services/sport-centre-service';

/**
 * Componente para la gestión del chat de soporte desde la perspectiva del cliente.
 * Permite solicitar un chat con el administrador del centro, visualizar el estado
 * de la solicitud y mantener la conversación una vez aceptada.
 * @class SoporteCliente
 */
@Component({
  selector: 'app-soporte-cliente',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soporte-cliente.html',
  styleUrl: './soporte-cliente.css',
})
export class SoporteCliente implements OnInit, OnDestroy {

  /* Formulario reactivo para el primer mensaje de la solicitud de chat */
  public solicitudForm: FormGroup;

  /* Formulario reactivo para el envío de mensajes dentro del chat activo */
  public mensajeForm: FormGroup;

  /* Estado de carga durante la hidratación inicial de datos */
  public isLoadingProfile: boolean = true;

  /* Estado de carga durante el envío de una solicitud */
  public isLoading: boolean = false;

  /* Chat de soporte vigente del cliente con el centro (si existe) */
  public chatActual: (ISoporteChat & { uid: string }) | null = null;

  /* Lista de mensajes del chat activo en tiempo real */
  public mensajes: (IMensaje & { uid: string })[] = [];

  /* Expone el enum al template para las comparaciones de estado */
  public EstadoChat = EstadoChat;

  /* UID del cliente autenticado */
  public clienteUid: string | null = null;

  /* ID del centro al que pertenece la membresía activa del cliente */
  public centroId: string | null = null;

  /* UID del administrador del centro (necesario para crear el nodo del chat) */
  private adminId: string | null = null;

  /* Contenedor único de suscripciones para una limpieza centralizada */
  private subscription: Subscription = new Subscription();

  /**
   * Constructor: inicialización de dependencias y estructura de formularios
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private soporteService: SoporteService,
    private membershipService: MembershipService,
    private snackbarService: SnackbarService,
    private sportCentreService: SportCentreService,
    private router: Router
  ) {
    this.solicitudForm = this.fb.group({
      primerMensaje: ['', [Validators.required, Validators.maxLength(500)]]
    });

    this.mensajeForm = this.fb.group({
      texto: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  /**
   * Ciclo de vida inicial: recupera la identidad del usuario, su membresía activa
   * y el chat de soporte vigente si ya existe uno con el centro.
   */
  ngOnInit(): void {
    this.subscription.add(
      this.authService.getCurrentUser().subscribe(user => {
        if (user) {
          this.clienteUid = user.uid;
          this.cargarMembresiaYChat();
        } else {
          this.isLoadingProfile = false;
        }
      })
    );
  }

  /**
   * Limpieza centralizada de todas las suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Consulta la membresía activa del cliente para extraer centroId y adminId,
   * y a continuación inicia la escucha en tiempo real de sus chats de soporte.
   */
  /**
 * Consulta todas las membresías del cliente, filtra la primera que esté activa
 * y vigente para extraer centroId y adminId, e inicia la escucha de chats.
 * Se usa getMembresiasByCliente porque aún no conocemos el centroId en este punto.
 */
  private cargarMembresiaYChat(): void {
    if (!this.clienteUid) return;

    this.subscription.add(
      this.membershipService.getMembresiasByCliente(this.clienteUid).pipe(
        switchMap(membresias => {
          const ahora = Date.now();
          const activa = membresias.find(m =>
            m.estado === EstadoMembresia.ACTIVA && m.fechaFin > ahora
          ) ?? null;

          if (!activa) return of(null);

          this.centroId = activa.centroId;
          return this.sportCentreService.getSportCentreByUid(activa.centroId);
        })
      ).subscribe(centro => {
        if (centro) {
          this.adminId = centro.adminUid;
          this.escucharChats();
        } else {
          this.centroId = null;
          this.adminId = null;
        }
        this.isLoadingProfile = false;
      })
    );
  }

  /**
   * Se suscribe en tiempo real a los chats del cliente y selecciona el más reciente
   * que no esté cerrado, o el último cerrado si no hay ninguno activo o pendiente.
   * Si el chat está ACTIVO inicia automáticamente la escucha de mensajes.
   */
  private escucharChats(): void {
    if (!this.clienteUid) return;

    this.subscription.add(
      this.soporteService.getChatsByCliente(this.clienteUid).subscribe(chats => {
        const lista = (chats || []) as (ISoporteChat & { uid: string })[];

        /* Priorizamos PENDIENTE o ACTIVO sobre CERRADO */
        const abierto = lista.find(
          c => c.estado === EstadoChat.PENDIENTE || c.estado === EstadoChat.ACTIVO
        );

        this.chatActual = abierto ?? (lista.length ? lista[lista.length - 1] : null);

        if (this.chatActual?.estado === EstadoChat.ACTIVO) {
          this.escucharMensajes(this.chatActual.uid);
        }
      })
    );
  }

  /**
   * Inicia la escucha en tiempo real de los mensajes de un chat concreto.
   * @param chatId UID del nodo SoporteChat en Firebase
   */
  private escucharMensajes(chatId: string): void {
    this.subscription.add(
      this.soporteService.getMensajesByChat(chatId).subscribe(msgs => {
        this.mensajes = msgs as (IMensaje & { uid: string })[];
      })
    );
  }

  /**
   * Envía la solicitud de chat al administrador del centro.
   * Solo es posible si el cliente tiene membresía activa y no tiene un chat abierto.
   */
  solicitarChat(): void {
    if (this.solicitudForm.invalid) {
      this.solicitudForm.markAllAsTouched();
      return;
    }

    if (!this.clienteUid || !this.centroId || !this.adminId) {
      this.snackbarService.showError('No se puede iniciar el chat: membresía no encontrada');
      return;
    }

    this.isLoading = true;

    const { primerMensaje } = this.solicitudForm.value;

    this.soporteService.solicitarChat({
      centroId: this.centroId,
      clienteId: this.clienteUid,
      adminId: this.adminId,
      primerMensaje,
    }).then(() => {
      this.snackbarService.showSuccess('Solicitud enviada. El administrador la revisará en breve');
      this.solicitudForm.reset();
      this.isLoading = false;
    }).catch(() => {
      this.snackbarService.showError('Error al enviar la solicitud de soporte');
      this.isLoading = false;
    });
  }

  /**
   * Envía un nuevo mensaje de texto dentro del chat activo.
   * @param chatId UID del chat de soporte activo
   */
  enviarMensaje(chatId: string): void {
    if (this.mensajeForm.invalid || !this.clienteUid) return;

    const { texto } = this.mensajeForm.value;

    this.soporteService.enviarMensaje(chatId, this.clienteUid, texto)
      .then(() => this.mensajeForm.reset())
      .catch(() => this.snackbarService.showError('Error al enviar el mensaje'));
  }

  /**
   * Redirección al panel principal de la aplicación
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}