import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth';
import { SoporteService } from '../../services/soporte-service';
import { ClienteService } from '../../services/cliente-service';
import { SnackbarService } from '../../services/snackbar';
import { ISoporteChat } from '../../interfaces/SoporteChar-Interface';
import { IMensaje } from '../../interfaces/Mensaje-Interface';
import { EstadoChat } from '../../enums/EstadoChat';

/**
 * Componente para la gestión del sistema de soporte desde la perspectiva del administrador.
 * Permite visualizar todas las solicitudes de chat del centro, aceptarlas o rechazarlas,
 * mantener conversaciones con los clientes y cerrar los chats resueltos.
 * Resuelve el nombre y apellidos de cada cliente en tiempo real para mostrarlo
 * en lugar del UID de Firebase.
 *
 * Arquitectura de suscripciones:
 * - subscription    → contiene todos los listeners de larga vida (chats, nombres)
 * - mensajesSub     → contenedor independiente exclusivo para el listener de mensajes.
 *   Se mantiene separado para poder cancelarlo y renovarlo al cambiar de chat sin
 *   que su ciclo de vida interfiera con el de subscription, garantizando que el
 *   onValue de Firebase permanece estable mientras el chat seleccionado no cambia.
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

  /* Mapa de clienteId → 'Nombre Apellidos' para mostrar en la vista */
  public nombresClientes: Map<string, string> = new Map();

  /* Contenedor principal de suscripciones de larga vida (chats, nombres, auth) */
  private subscription: Subscription = new Subscription();

  /* Contenedor exclusivo del listener de mensajes del chat activo.
   * Al ser independiente de subscription, cancelarlo y renovarlo al cambiar
   * de chat no afecta al resto de listeners, y el onValue de Firebase
   * permanece estable mientras el chat seleccionado no cambia. */
  private mensajesSub: Subscription = new Subscription();

  /* UID del chat cuyo listener de mensajes está actualmente activo.
   * Evita destruir y recrear el onValue de Firebase cuando escucharChats()
   * re-emite por un cambio de fechaUltimoMensaje sin que el chat haya cambiado,
   * que era la causa raíz de la latencia de 10-15 segundos en la recepción. */
  private chatIdEscuchando: string | null = null;

  /**
   * Constructor: inicialización de dependencias y estructura del formulario de mensajes
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private soporteService: SoporteService,
    private clienteService: ClienteService,
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
   * Limpieza centralizada al destruir el componente.
   * Se cancelan ambos contenedores de forma independiente para garantizar
   * que el onValue de Firebase queda liberado en cualquier escenario.
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.mensajesSub.unsubscribe();
  }

  /**
   * Se suscribe en tiempo real a los chats del centro del administrador.
   * Ordena la lista mostrando primero PENDIENTE, luego ACTIVO y finalmente CERRADO.
   * Para cada nuevo clienteId detectado resuelve su nombre completo mediante
   * ClienteService y lo almacena en el mapa nombresClientes.
   * Sincroniza chatSeleccionado con su versión actualizada y llama a
   * escucharMensajes() solo cuando el estado del chat cambia realmente,
   * evitando destruir el onValue activo por re-emisiones de fechaUltimoMensaje.
   */
  private escucharChats(): void {
    if (!this.adminUid) return;

    this.subscription.add(
      this.soporteService.getChatsByCentro(this.adminUid).subscribe(chats => {
        const lista  = (chats || []) as (ISoporteChat & { uid: string })[];
        const orden  = [EstadoChat.PENDIENTE, EstadoChat.ACTIVO, EstadoChat.CERRADO];
        this.chats   = lista.sort((a, b) => orden.indexOf(a.estado) - orden.indexOf(b.estado));
        this.isLoadingProfile = false;

        /* Resolvemos el nombre de cada cliente que aún no tengamos en el mapa */
        this.resolverNombresClientes(lista);

        /* Sincronizamos la referencia del chat seleccionado con el valor actualizado.
         * Así los cambios de estado se reflejan en la vista sin recargar la página. */
        if (this.chatSeleccionado) {
          const actualizado = this.chats.find(c => c.uid === this.chatSeleccionado!.uid);
          if (actualizado) {
            const estadoAnterior  = this.chatSeleccionado.estado;
            this.chatSeleccionado = actualizado;

            /* Abrimos el listener de mensajes solo si el estado acaba de cambiar
             * a ACTIVO. Si chatIdEscuchando ya es este chat el guard de
             * escucharMensajes() lo descarta sin tocar el onValue de Firebase. */
            if (estadoAnterior !== EstadoChat.ACTIVO && actualizado.estado === EstadoChat.ACTIVO) {
              this.escucharMensajes(actualizado.uid);
            }
          } else {
            /* El chat fue eliminado de Firebase: limpiamos toda la selección */
            this.chatSeleccionado = null;
            this.mensajes         = [];
            this.chatIdEscuchando = null;
            this.mensajesSub.unsubscribe();
            this.mensajesSub = new Subscription();
          }
        }
      })
    );
  }

  /**
   * Recorre la lista de chats y resuelve el nombre completo de cada cliente
   * que no esté ya almacenado en el mapa nombresClientes.
   * Cada resolución queda suscrita al contenedor principal para su limpieza.
   * @param chats Lista de chats de soporte del centro
   */
  private resolverNombresClientes(chats: (ISoporteChat & { uid: string })[]): void {
    const idsNuevos = chats
      .map(c => c.clienteId)
      .filter((id, idx, arr) => arr.indexOf(id) === idx && !this.nombresClientes.has(id));

    for (const clienteId of idsNuevos) {
      this.subscription.add(
        this.clienteService.getClienteByUid(clienteId).subscribe(cliente => {
          if (cliente) {
            this.nombresClientes.set(clienteId, `${cliente.nombre} ${cliente.apellidos}`);
          } else {
            this.nombresClientes.set(clienteId, 'Cliente desconocido');
          }
        })
      );
    }
  }

  /**
   * Devuelve el nombre completo del cliente a partir de su UID.
   * Mientras no se haya resuelto aún muestra un placeholder de carga.
   * @param clienteId UID del cliente
   * @returns Cadena con nombre y apellidos o texto de espera
   */
  public getNombreCliente(clienteId: string): string {
    return this.nombresClientes.get(clienteId) ?? 'Cargando...';
  }

  /**
   * Selecciona un chat de la lista para visualizar su conversación.
   * Renueva mensajesSub solo si el chat seleccionado es distinto al actual
   * para no destruir el onValue de Firebase innecesariamente.
   * Si el chat está ACTIVO inicia la escucha en tiempo real de sus mensajes;
   * si está PENDIENTE carga los mensajes una única vez sin listener continuo.
   * @param chat Objeto ISoporteChat seleccionado por el administrador
   */
  seleccionarChat(chat: ISoporteChat & { uid: string }): void {
    /* Si ya estamos en este chat no hacemos nada para no interrumpir el onValue */
    if (this.chatSeleccionado?.uid === chat.uid) return;

    this.chatSeleccionado = chat;
    this.mensajes         = [];

    if (chat.estado === EstadoChat.ACTIVO) {
      this.escucharMensajes(chat.uid);
    } else if (chat.estado === EstadoChat.PENDIENTE) {
      /* Cargamos los mensajes del chat pendiente para que el admin pueda
       * leer la solicitud inicial antes de decidir si aceptarla o rechazarla */
      this.cargarMensajesPendiente(chat.uid);
    } else {
      /* Chat CERRADO: cancelamos cualquier listener activo y limpiamos */
      this.mensajesSub.unsubscribe();
      this.mensajesSub      = new Subscription();
      this.chatIdEscuchando = null;
    }
  }

  /**
   * Carga los mensajes de un chat PENDIENTE mediante una suscripción puntual.
   * Renueva mensajesSub para cancelar cualquier listener previo sin tocar
   * el contenedor principal de suscripciones.
   * @param chatId UID del nodo SoporteChat en Firebase
   */
  private cargarMensajesPendiente(chatId: string): void {
    this.mensajesSub.unsubscribe();
    this.mensajesSub      = new Subscription();
    this.chatIdEscuchando = null;

    this.mensajesSub.add(
      this.soporteService.getMensajesByChat(chatId).subscribe(msgs => {
        this.mensajes = msgs as (IMensaje & { uid: string })[];
      })
    );
  }

  /**
   * Inicia la escucha en tiempo real de los mensajes de un chat concreto.
   * El guard de chatIdEscuchando es la pieza clave del fix de latencia:
   * si getChatsByCentro() re-emite por un cambio de fechaUltimoMensaje
   * (lo que ocurre cada vez que llega un mensaje nuevo), este método se
   * llama de nuevo pero el guard lo descarta sin destruir ni recrear el
   * onValue de Firebase, eliminando la reconexión que causaba los 10-15s.
   * @param chatId UID del nodo SoporteChat en Firebase
   */
  private escucharMensajes(chatId: string): void {
    /* Guard clave: no destruimos el onValue si ya estamos escuchando este chat */
    if (this.chatIdEscuchando === chatId) return;

    this.mensajesSub.unsubscribe();
    this.mensajesSub      = new Subscription();
    this.chatIdEscuchando = chatId;

    this.mensajesSub.add(
      this.soporteService.getMensajesByChat(chatId).subscribe(msgs => {
        this.mensajes = msgs as (IMensaje & { uid: string })[];
      })
    );
  }

  /**
   * Acepta una solicitud de chat pendiente.
   * La sincronización del estado en la vista se delega al Observable de chats
   * (escucharChats) que detecta el cambio en Firebase y actualiza chatSeleccionado,
   * arrancando también la escucha de mensajes si es necesario.
   * @param chat Objeto ISoporteChat a activar
   */
  aceptarChat(chat: ISoporteChat & { uid: string }): void {
    this.soporteService.aceptarChat(chat.uid).then(() => {
      this.snackbarService.showSuccess('Chat aceptado. Ya puedes conversar con el cliente');
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
   * Limpia el listener de mensajes y los datos en memoria tras el cierre.
   * @param chat Objeto ISoporteChat a cerrar
   */
  cerrarChat(chat: ISoporteChat & { uid: string }): void {
    this.snackbarService.showConfirm(
      '¿Confirmas el cierre de este chat de soporte?',
      'CERRAR CHAT',
      () => {
        this.soporteService.cerrarChat(chat.uid).then(() => {
          this.snackbarService.showSuccess('Chat cerrado correctamente');
          this.mensajesSub.unsubscribe();
          this.mensajesSub      = new Subscription();
          this.chatIdEscuchando = null;
          this.mensajes         = [];
        }).catch(() => {
          this.snackbarService.showError('Error al cerrar el chat');
        });
      }
    );
  }

  /**
   * Elimina permanentemente un chat cerrado del registro de soporte, con confirmación previa.
   * Limpia la selección activa si el chat eliminado era el que estaba siendo visualizado.
   * @param chat Objeto ISoporteChat en estado CERRADO a eliminar
   */
  eliminarChat(chat: ISoporteChat & { uid: string }): void {
    this.snackbarService.showConfirm(
      '¿Eliminar este chat permanentemente? Esta acción no se puede deshacer.',
      'ELIMINAR',
      () => {
        this.soporteService.eliminarChat(chat.uid).then(() => {
          this.snackbarService.showSuccess('Chat eliminado');
          if (this.chatSeleccionado?.uid === chat.uid) {
            this.mensajesSub.unsubscribe();
            this.mensajesSub      = new Subscription();
            this.chatIdEscuchando = null;
            this.chatSeleccionado = null;
            this.mensajes         = [];
          }
        }).catch(() => {
          this.snackbarService.showError('Error al eliminar el chat');
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