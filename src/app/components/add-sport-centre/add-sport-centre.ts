import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { AuthService } from '../../services/auth';
import { SportCentreService } from '../../services/sport-centre-service';
import { ISportCentre } from '../../interfaces/Sport-Centre-Interface';

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

  /**
   * Constructor del componente: inicialización de dependencias
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private sportCentreService: SportCentreService,
    private storage: Storage,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.centroForm = this.fb.group({
      nombre:    ['', Validators.required],
      direccion: ['', Validators.required],
      telefono:  ['', Validators.required],
    });
  }

  /**
   * Ciclo de vida inicial: capturamos parámetros y sincronizamos la imagen
   */
  ngOnInit(): void {

    /*Comprobamos si venimos en modo edición mediante el queryParam*/
    this.modoEdicion = this.route.snapshot.queryParams['editar'] === 'true';

    /*Recuperamos la fotoReciente de la URL para evitar el lag de Firebase en la previsualización*/
    const fotoReciente = this.route.snapshot.queryParams['fotoReciente'];

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
              });

              /*Usamos la foto del queryParam si existe; si no, la de Firebase*/
              const fotoDefinitiva = (fotoReciente !== undefined && fotoReciente !== null)
                ? fotoReciente
                : centro.foto;

              /*Si tiene foto la mostramos como preview y guardamos la URL original*/
              if (fotoDefinitiva) {
                this.previewImagen      = fotoDefinitiva;
                this.urlImagenOriginal  = fotoDefinitiva;
              }

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
    this.previewImagen = null;
  }

  /**
   * Método principal que gestiona la creación o edición del centro deportivo.
   * Si hay imagen la sube a Storage, obtiene la URL y guarda el centro en RTDB.
   * Si no hay imagen nueva mantiene la existente o guarda foto vacía.
   */
  saveSportCentre(): void {

    if (this.centroForm.invalid || !this.adminUid) return;

    this.isLoading = true;

    const { nombre, direccion, telefono } = this.centroForm.value;

    if (this.imagenSeleccionada) {

      /*Si había una imagen anterior la eliminamos de Storage antes de subir la nueva*/
      if (this.urlImagenOriginal) {
        deleteObject(ref(this.storage, this.urlImagenOriginal)).catch(() => { });
      }

      /*Subimos la imagen a Firebase Storage bajo la ruta Sport-Centre/nombre-archivo*/
      const storageRef = ref(this.storage, `Sport-Centre/${this.imagenSeleccionada.name}`);
      uploadBytes(storageRef, this.imagenSeleccionada)
        .then(snapshot => getDownloadURL(snapshot.ref))
        .then(url => this.guardarDatosFinales(nombre, direccion, telefono, url))
        .catch(() => this.isLoading = false);

    } else if (!this.previewImagen) {

      /*Sin preview significa que el usuario eliminó la imagen — la borramos de Storage*/
      if (this.urlImagenOriginal) {
        deleteObject(ref(this.storage, this.urlImagenOriginal)).catch(() => { });
      }
      this.guardarDatosFinales(nombre, direccion, telefono, '');

    } else {

      /*Sin imagen nueva — mantenemos la URL original existente*/
      this.guardarDatosFinales(nombre, direccion, telefono, this.urlImagenOriginal || '');

    }

  }

  /**
   * Método privado que construye el objeto ISportCentre, lo guarda en RTDB
   * y redirige al Home pasando la URL actualizada para mantener la reactividad
   * @param nombre Nombre del centro deportivo
   * @param direccion Dirección del centro deportivo
   * @param telefono Teléfono del centro deportivo
   * @param foto URL de la foto del centro deportivo
   */
  private guardarDatosFinales(nombre: string, direccion: string, telefono: string, foto: string): void {

    const centro: ISportCentre = {
      nombre,
      direccion,
      telefono,
      foto,
      adminUid: this.adminUid!,
    };

    this.sportCentreService.saveSportCentre(this.adminUid!, centro).then(() => {
      console.log(this.modoEdicion ? 'Centro actualizado correctamente:' : 'Centro creado correctamente:', centro);
      this.router.navigate(['/home'], {
        queryParams: { fotoReciente: foto }
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