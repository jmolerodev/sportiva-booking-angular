import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { AuthService } from '../../services/auth';
import { SportCentreService } from '../../services/sport-centre-service';
import { SnackbarService } from '../../services/snackbar'; /* Inyectamos el servicio para las alertas */
import { ISportCentre, IHorarioSemana } from '../../interfaces/Sport-Centre-Interface';

@Component({
  selector: 'app-add-sport-centre',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-sport-centre.html',
  styleUrl: './add-sport-centre.css',
})
export class AddSportCentre implements OnInit {

  /*Formulario reactivo para crear o editar un centro deportivo*/
  public centroForm: FormGroup;

  /*Variable booleana que nos indica si el formulario se está procesando*/
  public isLoading: boolean = false;

  /*Variable booleana que nos indica si los datos iniciales se están cargando*/
  public isInitialLoading: boolean = false;

  /*Variable booleana que indica si estamos en modo edición o creación*/
  public modoEdicion: boolean = false;

  /*UID del administrador autenticado*/
  private adminUid: string | null = null;

  /*Archivo de imagen seleccionado por el usuario (null si no ha seleccionado ninguno)*/
  private imagenSeleccionada: File | null = null;

  /*Preview de la imagen seleccionada para mostrarla antes de guardar*/
  public previewImagen: string | null = null;

  /*URL original de la imagen ya guardada en Storage (para poder eliminarla si se reemplaza)*/
  private urlImagenOriginal: string | null = null;

  /*Variable para guardar el estado inicial del centro y comparar si hay cambios reales*/
  private datosOriginales: string = '';

  /*Días de la semana para generar el calendario visual*/
  public diasSemana: string[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  /**
   * Constructor del componente: inicialización de dependencias
   * @param fb                 Servicio para construir formularios reactivos
   * @param authService        Servicio encargado de la identidad y permisos del usuario
   * @param sportCentreService Servicio para la gestión de centros deportivos
   * @param snackbarService    Servicio para el despliegue de alertas y confirmaciones
   * @param storage            Instancia de Firebase Storage para subir y eliminar imágenes
   * @param router             Servicio para gestionar la navegación entre vistas
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private sportCentreService: SportCentreService,
    private snackbarService: SnackbarService,
    private storage: Storage,
    private router: Router
  ) {
    this.centroForm = this.fb.group({
      nombre:    ['', Validators.required],
      direccion: ['', Validators.required],
      telefono:  ['', Validators.required],
      horario:   this.fb.group(this.initGrupoHorario()) /* Añadimos el grupo de horarios */
    });
  }

  /**
   * Método privado para inicializar el subgrupo de horarios por cada día de la semana
   */
  private initGrupoHorario() {
    const grupo: any = {};
    this.diasSemana.forEach(dia => {
      grupo[dia] = this.fb.group({
        abierto:  [true],
        apertura: ['08:00', Validators.required],
        cierre:   ['22:00', Validators.required]
      });
    });
    return grupo;
  }

  /**
   * Ciclo de vida inicial: capturamos el navigation state, sincronizamos la imagen
   * y cargamos los datos del centro si estamos en modo edición.
   */
  ngOnInit(): void {

    /*Comprobamos si venimos en modo edición mediante el navigation state*/
    this.modoEdicion = history.state?.editar === true;

    /*Recuperamos la fotoReciente del navigation state para evitar el lag de Firebase en la previsualización*/
    const fotoReciente = history.state?.fotoReciente ?? null;

    if (this.modoEdicion) this.isInitialLoading = true;

    /*Obtenemos el UID del administrador autenticado*/
    this.authService.getCurrentUser().subscribe(user => {
      this.adminUid = user ? user.uid : null;

      /*Si estamos en modo edición cargamos los datos del centro en el formulario*/
      if (this.modoEdicion && this.adminUid) {
        this.sportCentreService.getSportCentreByAdminUid(this.adminUid).subscribe({
          next: (centro) => {
            if (centro) {
              this.centroForm.patchValue({
                nombre:    centro.nombre,
                direccion: centro.direccion,
                telefono:  centro.telefono,
                horario:   centro.horario /* Mapeamos el horario recuperado */
              });

              /*Usamos la foto del navigation state si existe; si no, la de Firebase*/
              const fotoDefinitiva = fotoReciente ?? centro.foto;

              /*Si tiene foto la mostramos como preview y guardamos la URL original*/
              if (fotoDefinitiva) {
                this.previewImagen     = fotoDefinitiva;
                this.urlImagenOriginal = fotoDefinitiva;
              }

              /* Guardamos una "captura" del estado inicial para comparaciones futuras */
              this.datosOriginales = JSON.stringify({
                form: this.centroForm.value,
                foto: this.previewImagen
              });

              this.isInitialLoading = false;
            }
          },
          error: () => this.isInitialLoading = false
        });
      } else {
        this.isInitialLoading = false;
      }
    });
  }

  onFotoCargada(): void { if (this.modoEdicion) this.isInitialLoading = false; }
  onFotoError(): void   { this.previewImagen = null; this.isInitialLoading = false; }

  /**
   * Método que gestiona la selección de una imagen desde el dispositivo del usuario.
   * Genera una preview para mostrarla en el formulario antes de guardar.
   * @param event Evento del input de tipo file
   */
  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.imagenSeleccionada = input.files[0];

    /*Generamos la preview de la imagen seleccionada*/
    const reader = new FileReader();
    reader.onload = () => this.previewImagen = reader.result as string;
    reader.readAsDataURL(this.imagenSeleccionada);
  }

  /**
   * Método que elimina la imagen seleccionada y limpia la preview
   */
  eliminarImagen(): void {
    this.imagenSeleccionada = null;
    this.previewImagen      = null;
  }

  /**
   * Método principal que gestiona la creación o edición del centro deportivo.
   * Si hay imagen la sube a Storage, obtiene la URL y guarda el centro en RTDB.
   * Si no hay imagen nueva mantiene la existente o guarda foto vacía.
   */
  saveSportCentre(): void {

    /* Validación manual para activar el snackbar si el usuario pulsa y el formulario es inválido */
    if (this.centroForm.invalid) {
      this.snackbarService.showError('Por favor, rellena todos los campos obligatorios para continuar');
      this.centroForm.markAllAsTouched();
      return;
    }

    /* Comprobamos si hay cambios reales comparando el estado actual con el original capturado en el inicio */
    if (this.modoEdicion) {
      const datosActuales = JSON.stringify({
        form: this.centroForm.value,
        foto: this.previewImagen
      });

      if (this.datosOriginales === datosActuales) {
        this.snackbarService.showError('No se han detectado cambios para actualizar');
        return;
      }
    }

    if (!this.adminUid) return;

    this.isLoading = true;

    const { nombre, direccion, telefono, horario } = this.centroForm.value;

    if (this.imagenSeleccionada) {

      /*Si había una imagen anterior la eliminamos de Storage antes de subir la nueva*/
      if (this.urlImagenOriginal) {
        deleteObject(ref(this.storage, this.urlImagenOriginal)).catch(() => { });
      }

      /*Subimos la imagen a Firebase Storage bajo la ruta Sport-Centre/nombre-archivo*/
      /* Usamos Date.now() para asegurar unicidad y evitar problemas de caché en el navegador */
      const storageRef = ref(this.storage, `Sport-Centre/${Date.now()}_${this.imagenSeleccionada.name}`);
      uploadBytes(storageRef, this.imagenSeleccionada)
        .then(snapshot => getDownloadURL(snapshot.ref))
        .then(url => this.guardarDatosFinales(nombre, direccion, telefono, url, horario))
        .catch(() => this.isLoading = false);

    } else if (!this.previewImagen) {

      /*Sin preview significa que el usuario eliminó la imagen — la borramos de Storage*/
      if (this.urlImagenOriginal) {
        deleteObject(ref(this.storage, this.urlImagenOriginal)).catch(() => { });
      }
      this.guardarDatosFinales(nombre, direccion, telefono, '', horario);

    } else {

      /*Sin imagen nueva — mantenemos la URL original existente*/
      this.guardarDatosFinales(nombre, direccion, telefono, this.urlImagenOriginal || '', horario);

    }
  }

  /**
   * Método privado que construye el objeto ISportCentre, lo guarda en RTDB
   * y redirige al Home pasando la URL actualizada mediante navigation state
   * para mantener la reactividad sin exponer datos en la URL.
   * @param nombre    Nombre del centro deportivo
   * @param direccion Dirección del centro deportivo
   * @param telefono  Teléfono del centro deportivo
   * @param foto      URL de la foto del centro deportivo
   * @param horario   Configuración de los horarios semanales
   */
  private guardarDatosFinales(nombre: string, direccion: string, telefono: string, foto: string, horario: IHorarioSemana): void {

    const centro: ISportCentre = {
      nombre,
      direccion,
      telefono,
      foto,
      adminUid: this.adminUid!,
      horario
    };

    this.sportCentreService.saveSportCentre(this.adminUid!, centro).then(() => {
      this.snackbarService.showSuccess(this.modoEdicion ? 'Centro actualizado correctamente' : 'Centro creado correctamente');
      /* Navegamos a home pasando la foto reciente via navigation state para no exponer la URL de Firebase */
      this.router.navigate(['/home'], {
        state: { fotoReciente: foto }
      }).then(() => {
        this.isLoading = false;
      });
    }).catch(() => this.isLoading = false);
  }

  /**
   * Método mediante el cual cancelamos la edición y volvemos al home
   */
  cancelarEdicion(): void { this.router.navigate(['/home']); }

  /**
   * Método mediante el cual navegaremos de vuelta al home
   */
  navigateToHome(): void { this.router.navigate(['/home']); }
}