import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { SoporteService } from '../../services/soporte-service';
import { SnackbarService } from '../../services/snackbar';
import { ISoporteChat } from '../../interfaces/SoporteChar-Interface';
import { IMensaje } from '../../interfaces/Mensaje-Interface';
import { EstadoChat } from '../../enums/EstadoChat';

/**
 * Componente para la gestión del sistema de soporte desde la perspectiva del administrador.
 * Permite visualizar todas las solicitudes de chat del centro, aceptarlas o rechazarlas,
 * mantener conversaciones con los clientes y cerrar los chats resueltos.
 * @class SoporteAdmin
 */
@Component({
  selector: 'app-soporte-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './soporte-admin.html',
  styleUrl: './soporte-admin.css',
})
export class SoporteAdmin implements OnInit, OnDestroy {

  /* Formulario reactivo para el envío de mensajes dentro del chat seleccionado */
  public mensajeForm: FormGroup;

  /* Estado de carga durante la hidratación inicial de datos */
  public isLoadingProfile: boolean = true;

  /* Lista de todos los chats de soporte del centro ordenados por prioridad de estado */
  public chats: (ISoporteChat & { uid: string })[] = [];

  /* Chat actualmente seleccionado para visualizar la conversación */
  public chatSeleccionado: (ISoporteChat & { uid: string }) | null = null;

  /* Lista de mensajes del chat seleccionado en tiempo real */
  public mensajes: (IMensaje & { uid: string })[] = [];

  /* Expone el enum al template para las comparaciones de estado */
  public EstadoChat = EstadoChat;

  /* UID del administrador autenticado */
  public adminUid: string | null = null;

  /* Contenedor único de suscripciones para una limpieza centralizada */
  private subscription: Subscription = new Subscription();

  /**
   * Constructor: inicialización de dependencias y estructura del formulario de mensajes
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private soporteService: SoporteService,
    private snackbarService: SnackbarService,
    private router: Router
  ) {
    this.mensajeForm = this.fb.group({
      texto: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  /**
   * Ciclo de vida inicial: recupera la identidad del administrador y carga
   * en tiempo real todos los chats de soporte asociados a su centro.
   */
  ngOnInit(): void {
    this.subscription.add(
      this.authService.getCurrentUser().subscribe(user => {
        if (user) {
          this.adminUid = user.uid;
          this.escucharChats();
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
   * Se suscribe en tiempo real a los chats del centro del administrador.
   * Ordena la lista mostrando primero PENDIENTE, luego ACTIVO y finalmente CERRADO.
   */
  private escucharChats(): void {
    if (!this.adminUid) return;

    this.subscription.add(
      this.soporteService.getChatsByCentro(this.adminUid).subscribe(chats => {
        const lista  = (chats || []) as (ISoporteChat & { uid: string })[];
        const orden  = [EstadoChat.PENDIENTE, EstadoChat.ACTIVO, EstadoChat.CERRADO];
        this.chats   = lista.sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado));
        this.isLoadingProfile = false;
      })
    );
  }

  /**
   * Selecciona un chat de la lista para visualizar su conversación.
   * Si el chat está ACTIVO inicia la escucha en tiempo real de sus mensajes.
   * @param chat Objeto ISoporteChat seleccionado por el administrador
   */
  seleccionarChat(chat: ISoporteChat & { uid: string }): void {
    this.chatSeleccionado = chat;
    this.mensajes         = [];

    if (chat.estado === EstadoChat.ACTIVO) {
      this.escucharMensajes(chat.uid);
    }
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
   * Acepta una solicitud de chat pendiente e inicia la escucha de mensajes en tiempo real.
   * @param chat Objeto ISoporteChat a activar
   */
  aceptarChat(chat: ISoporteChat & { uid: string }): void {
    this.soporteService.aceptarChat(chat.uid).then(() => {
      this.snackbarService.showSuccess('Chat aceptado. Ya puedes conversar con el cliente');
      this.escucharMensajes(chat.uid);
    }).catch(() => {
      this.snackbarService.showError('Error al aceptar el chat');
    });
  }

  /**
   * Rechaza una solicitud de chat pendiente con confirmación previa.
   * @param chat Objeto ISoporteChat a rechazar
   */
  rechazarChat(chat: ISoporteChat & { uid: string }): void {
    this.snackbarService.showConfirm(
      '¿Confirmas el rechazo de esta solicitud de soporte?',
      'RECHAZAR',
      () => {
        this.soporteService.rechazarChat(chat.uid)
          .then(() => this.snackbarService.showSuccess('Solicitud rechazada'))
          .catch(() => this.snackbarService.showError('Error al rechazar el chat'));
      }
    );
  }

  /**
   * Cierra un chat activo una vez resuelto el asunto, con confirmación previa.
   * Limpia los mensajes en memoria tras el cierre.
   * @param chat Objeto ISoporteChat a cerrar
   */
  cerrarChat(chat: ISoporteChat & { uid: string }): void {
    this.snackbarService.showConfirm(
      '¿Confirmas el cierre de este chat de soporte?',
      'CERRAR CHAT',
      () => {
        this.soporteService.cerrarChat(chat.uid).then(() => {
          this.snackbarService.showSuccess('Chat cerrado correctamente');
          this.mensajes = [];
        }).catch(() => {
          this.snackbarService.showError('Error al cerrar el chat');
        });
      }
    );
  }

  /**
   * Envía un nuevo mensaje de texto dentro del chat seleccionado.
   * @param chatId UID del chat de soporte activo
   */
  enviarMensaje(chatId: string): void {
    if (this.mensajeForm.invalid || !this.adminUid) return;

    const { texto } = this.mensajeForm.value;

    this.soporteService.enviarMensaje(chatId, this.adminUid, texto)
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