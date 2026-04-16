import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { MediaService } from '../../services/media-service';
import { ProfesionalService } from '../../services/profesional-service';
import { SnackbarService } from '../../services/snackbar';
import { IMedia } from '../../interfaces/Media-Interface';
import { IProfesional } from '../../interfaces/Profesional-Interface';

/**
 * Componente para la gestión de contenido multimedia por parte de los profesionales.
 * Permite la subida de vídeos y la visualización de la galería personal.
 * @class MediaManagement
 */
@Component({
  selector: 'app-media-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './media-management.html',
  styleUrl: './media-management.css',
})
export class MediaManagement implements OnInit {

  /* Formulario reactivo para la gestión de metadatos del vídeo */
  public mediaForm: FormGroup;

  /* Estado de carga para el feedback visual durante la subida */
  public isLoading: boolean = false;

  /* Colección local de vídeos vinculados al profesional autenticado */
  public misVideos: IMedia[] = [];

  /* UID del profesional obtenido de Firebase Auth */
  private profesionalUid: string | null = null;

  /* Identificador del centro deportivo (Extraído de IProfesional) */
  public centroId: string | null = null;

  /* Archivo físico seleccionado para la transferencia a Storage */
  private videoSeleccionado: File | null = null;

  /* URL temporal generada con createObjectURL para la previsualización local del vídeo */
  public previewUrl: string | null = null;

  /* Vídeo del historial actualmente seleccionado para reproducción en el modal */
  public videoReproduciendo: IMedia | null = null;

  /**
   * Constructor: inicialización de dependencias y estructura del formulario
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private profesionalService: ProfesionalService,
    private mediaService: MediaService,
    private snackbarService: SnackbarService,
    private router: Router
  ) {
    this.mediaForm = this.fb.group({
      nombre:      ['', Validators.required],
      descripcion: ['', Validators.required]
    });
  }

  /**
   * Ciclo de vida inicial: Orquestación de la recuperación de identidad y datos de perfil
   */
  ngOnInit(): void {
    /* Recuperamos el estado de autenticación */
    this.authService.getCurrentUser().subscribe(user => {
      if (user) {
        this.profesionalUid = user.uid;

        /* Consultamos la colección 'Persons' usando la interfaz IProfesional */
        this.profesionalService.getProfesionalByUid(user.uid).subscribe((profesional: any) => {
          const datos = profesional as IProfesional; // Cast a la interfaz que sí tiene centroId

          if (datos && datos.centroId) {
            this.centroId = datos.centroId;
          } else {
            this.centroId = null;
          }
        });

        /* La carga del historial es independiente del centroId */
        this.cargarMultimedia();
      }
    });
  }

  /**
   * Recupera los registros multimedia de la base de datos para el profesional actual
   */
  private cargarMultimedia(): void {
    if (!this.profesionalUid) return;

    this.mediaService.getMediaByProfesional(this.profesionalUid).subscribe(videos => {
      this.misVideos = videos || [];
    });
  }

  /**
   * Captura el binario del vídeo desde el evento del explorador de archivos.
   * Genera además una URL temporal para la previsualización inmediata en el navegador.
   * @param event Evento de cambio del input file
   */
  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    /* Liberamos la URL anterior para evitar fugas de memoria en el navegador */
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }

    if (input.files?.length) {
      this.videoSeleccionado = input.files[0];

      /* Creamos una URL temporal en memoria para renderizar el vídeo antes de subirlo */
      this.previewUrl = URL.createObjectURL(this.videoSeleccionado);
    }
  }

  /**
   * Ejecuta la lógica de negocio para la subida de contenido multimedia.
   * Incluye el centroId en los metadatos para que el contenido persista
   * aunque el profesional sea dado de baja en el sistema.
   */
  saveMedia(): void {
    /* Validaciones previas a la ejecución del proceso */
    if (this.mediaForm.invalid || !this.videoSeleccionado) {
      this.snackbarService.showError('Debes completar el formulario y seleccionar un archivo MP4');
      this.mediaForm.markAllAsTouched();
      return;
    }

    if (!this.profesionalUid || !this.centroId) {
      this.snackbarService.showError('Acción denegada: Centro deportivo no vinculado');
      return;
    }

    this.isLoading = true;

    const { nombre, descripcion } = this.mediaForm.value;

    /* Construcción del objeto de datos conforme a la interfaz IMedia.
     * centroId se almacena para que el contenido sobreviva a la baja del profesional */
    const mediaData: IMedia = {
      url: '',
      nombre,
      descripcion,
      fecha_subida: Date.now(),
      profesionalId: this.profesionalUid,
      centroId: this.centroId,
    };

    /* Proceso asíncrono de subida y registro */
    this.mediaService.uploadAndSaveMedia(this.videoSeleccionado, mediaData)
      .then(() => {
        this.snackbarService.showSuccess('Contenido publicado exitosamente');
        this.mediaForm.reset();
        this.videoSeleccionado = null;

        /* Limpiamos la preview tras la subida exitosa */
        if (this.previewUrl) {
          URL.revokeObjectURL(this.previewUrl);
          this.previewUrl = null;
        }

        this.isLoading = false;
      })
      .catch(() => {
        this.snackbarService.showError('Error crítico durante la transferencia de datos');
        this.isLoading = false;
      });
  }

  /**
   * Solicita confirmación mediante snackbar antes de eliminar el recurso multimedia.
   * La eliminación es en cascada: primero Storage y después RTDB para garantizar
   * que nunca quede un registro huérfano apuntando a un archivo inexistente.
   * @param url URL de descarga del vídeo en Firebase Storage
   */
  borrarVideo(url: string | undefined): void {
    if (!url) return;

    this.snackbarService.showConfirm(
      '¿Confirmas la eliminación permanente de este vídeo?',
      'ELIMINAR',
      () => {
        this.mediaService.deleteMediaByUrl(url)
          .then(() => {
            this.snackbarService.showSuccess('Contenido eliminado del servidor');

            /* Cerramos el modal si el vídeo que se estaba reproduciendo es el borrado */
            if (this.videoReproduciendo?.url === url) {
              this.cerrarReproductor();
            }
          })
          .catch(() => {
            this.snackbarService.showError('Error al eliminar el contenido');
          });
      }
    );
  }

  /**
   * Abre el modal reproductor cargando el vídeo seleccionado del historial.
   * @param video Objeto IMedia con la URL y metadatos del vídeo a reproducir
   */
  abrirReproductor(video: IMedia): void {
    this.videoReproduciendo = video;
  }

  /**
   * Cierra el modal reproductor y libera la referencia al vídeo activo.
   * El elemento <video> del DOM se pausa automáticamente al ocultarse con @if.
   */
  cerrarReproductor(): void {
    this.videoReproduciendo = null;
  }

  /**
   * Redirección al panel principal de la aplicación
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}