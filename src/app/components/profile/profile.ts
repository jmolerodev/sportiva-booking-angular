import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, switchMap, of, from } from 'rxjs';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { Database, ref, child, update, objectVal } from '@angular/fire/database';
import { Storage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { FormsModule } from '@angular/forms';
import { Rol } from '../../enums/Rol';
import { ICliente } from '../../interfaces/Cliente-Interface';
import { IProfesional } from '../../interfaces/Profesional-Interface';
import { IAdministrador } from '../../interfaces/Administrador-Interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit, OnDestroy {

  /* Unión de tipos para manejar cualquier perfil de forma segura */
  public perfil: ICliente | IProfesional | IAdministrador | null = null;

  /* Email del usuario (obtenido de Auth, no de RTDB) */
  public emailUsuario: string | null = null;

  /* UID para operaciones de escritura */
  public uid: string | null = null;

  /* Exponemos el Enum a la plantilla para las validaciones @if */
  public readonly Roles = Rol;

  /* Flag de control para la carga inicial */
  public loading: boolean = true;

  /* Control del formulario */
  public modoEdicion: boolean = false;

  /* Archivo de imagen seleccionado por el usuario (null si no ha seleccionado ninguno) */
  public imagenSeleccionada: File | null = null;

  /* Preview de la imagen seleccionada para mostrarla antes de guardar */
  public previewImagen: string | null = null;

  /* URL original de la imagen ya guardada en Storage (para poder eliminarla si se reemplaza o borra) */
  private urlImagenOriginal: string | null = null;

  /* Snapshot de la preview al entrar en modo edición — permite restaurarla si el usuario cancela */
  private previewSnapshot: string | null = null;

  /* Flag que controla si la foto de perfil ha terminado de cargar */
  public fotoPerfilCargada: boolean = false;

  private subscription: Subscription = new Subscription();

  /*Constructor del componente*/
  constructor(
    private authService: AuthService,
    private snackbarService: SnackbarService,
    private db: Database,
    private storage: Storage, /*Inyectamos Storage para gestionar la foto de perfil*/
    private cdr: ChangeDetectorRef,
    private router : Router
  ) { }

  /**
   * Inicialización: Recuperamos usuario de Auth y luego sus datos tipados de RTDB
   */
  ngOnInit(): void {
    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        switchMap(user => {
          if (!user) return of(null);
          this.uid = user.uid;
          this.emailUsuario = user.email;
          const userRef = child(ref(this.db), `/Persons/${user.uid}`);
          return objectVal<ICliente | IProfesional | IAdministrador>(userRef);
        })
      ).subscribe({
        next: (data) => {
          if (data) {
            this.perfil = data;

            /*Sincronizamos la preview y guardamos la URL original para gestionar borrados*/
            if (data.foto) {
              this.previewImagen     = data.foto;
              this.urlImagenOriginal = data.foto;
              /*Hay foto real que cargar — el spinner se activará hasta que el img dispare (load)*/
            } else {
              /*Sin foto no hay nada que cargar — mostramos el icono por defecto directamente*/
              this.fotoPerfilCargada = true;
            }
          } else {
            /*Sin perfil tampoco hay foto — evitamos el salto igualmente*/
            this.fotoPerfilCargada = true;
          }
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('Error al recuperar perfil:', e);
          this.snackbarService.showError('Error al sincronizar datos');
          this.loading = false;
        }
      })
    );
  }

  /**
   * Gestiona la selección de una imagen desde el dispositivo del usuario.
   * Genera una preview para mostrarla en el formulario antes de guardar.
   * @param event Evento del input de tipo file
   */
  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    this.imagenSeleccionada = input.files[0];

    /*Reseteamos el flag y forzamos la detección antes del FileReader para que el spinner
      aparezca inmediatamente mientras se procesa la nueva imagen*/
    this.fotoPerfilCargada = false;
    this.cdr.detectChanges();

    /*Generamos la preview de la imagen seleccionada para mostrarla al instante*/
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImagen = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(this.imagenSeleccionada);
  }

  /**
   * Elimina la foto de perfil seleccionada y limpia la preview.
   * La imagen se borrará definitivamente de Storage al guardar cambios.
   */
  eliminarFoto(): void {
    this.imagenSeleccionada = null;
    this.previewImagen      = null;

    /*Limpiamos también el campo foto del perfil en memoria*/
    if (this.perfil) this.perfil.foto = '';

    /*Sin foto activa no hay nada que cargar — evitamos el salto al mostrar el icono por defecto*/
    this.fotoPerfilCargada = true;
  }

  /**
   * Sube la imagen nueva a Firebase Storage bajo la ruta Users/nombre-archivo,
   * elimina la anterior si existía y a continuación persiste los cambios en RTDB.
   * Se invoca desde guardarCambios() cuando hay una imagen pendiente de subir.
   */
  private subirFotoYGuardar(): void {
    if (!this.uid || !this.imagenSeleccionada) return;

    /*Si había una imagen anterior la eliminamos de Storage antes de subir la nueva*/
    if (this.urlImagenOriginal) {
      deleteObject(storageRef(this.storage, this.urlImagenOriginal)).catch(() => { });
    }

    /*Usamos Date.now() para asegurar unicidad y evitar problemas de caché en el navegador*/
    const fileRef = storageRef(this.storage, `Users/${Date.now()}_${this.imagenSeleccionada.name}`);

    uploadBytes(fileRef, this.imagenSeleccionada)
      .then(snapshot => getDownloadURL(snapshot.ref))
      .then(url => {
        /*Actualizamos la URL en el perfil en memoria y guardamos la referencia original*/
        if (this.perfil) this.perfil.foto = url;
        this.urlImagenOriginal  = url;
        this.imagenSeleccionada = null;

        /*Reseteamos el flag de carga para que al cambiar la URL en el HTML aparezca el spinner 
          mientras el navegador descarga la nueva imagen de Storage*/
        this.fotoPerfilCargada = false;

        /*Con la URL ya disponible persistimos el resto de cambios en RTDB*/
        this.persistirCambios();
      })
      .catch(() => {
        this.snackbarService.showError('Error al subir la imagen de perfil');
        this.loading = false;
      });
  }

  /**
   * Mapea y persiste los cambios según el rol activo para no corromper el nodo.
   * Es el método interno que escribe directamente en RTDB.
   */
  private persistirCambios(): void {
    if (!this.uid || !this.perfil) return;

    const userRef = ref(this.db, `/Persons/${this.uid}`);

    /*Construimos el objeto de actualización común*/
    let updates: any = {
      nombre:    this.perfil.nombre,
      apellidos: this.perfil.apellidos,
      foto:      this.perfil.foto
    };

    /*Añadimos campos específicos por interfaz*/
    if (this.perfil.rol === Rol.CLIENTE) {
      const p = this.perfil as ICliente;
      updates.dni       = p.dni;
      updates.direccion = p.direccion;
    } else if (this.perfil.rol === Rol.PROFESIONAL) {
      const p = this.perfil as IProfesional;
      updates.descripcion        = p.descripcion;
      updates.annos_experiencia  = p.annos_experiencia;
    }

    this.subscription.add(
      from(update(userRef, updates)).subscribe({
        next: () => {
          this.snackbarService.showSuccess('Información actualizada correctamente');
          this.modoEdicion = false;
          this.loading     = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.snackbarService.showError('No se pudieron guardar los cambios');
          this.loading = false;
        }
      })
    );
  }

  /**
   * Punto de entrada público para guardar cambios desde la plantilla.
   * Orquesta la subida de imagen si la hay, el borrado si procede,
   * y delega la escritura final en persistirCambios().
   */
  guardarCambios(): void {
    if (!this.uid || !this.perfil) return;

    this.loading = true;

    /*Si hay imagen nueva pendiente primero la subimos y después persistimos*/
    if (this.imagenSeleccionada) {
      this.subirFotoYGuardar();
      return;
    }

    /*Si el usuario eliminó la foto la borramos de Storage antes de persistir*/
    if (!this.previewImagen && this.urlImagenOriginal) {
      deleteObject(storageRef(this.storage, this.urlImagenOriginal)).catch(() => { });
      this.urlImagenOriginal = null;
    }

    /*Sin cambios de imagen persistimos directamente*/
    this.persistirCambios();
  }

  /**
   * Activa o desactiva el modo edición.
   * Al activarlo guarda un snapshot del estado de la imagen para poder restaurarlo si se cancela.
   * Al cancelar descarta los cambios visuales de la foto sin tocar Storage ni RTDB.
   */
  toggleEdicion(): void {
    if (!this.modoEdicion) {

      /*Entramos en modo edición — guardamos un snapshot de la preview actual para poder restaurarla*/
      this.previewSnapshot = this.previewImagen;
      this.modoEdicion     = true;

    } else {

      /*Cancelamos — descartamos la imagen seleccionada y restauramos la preview original*/
      this.imagenSeleccionada = null;
      this.previewImagen      = this.previewSnapshot;
      if (this.perfil) this.perfil.foto = this.previewSnapshot || '';

      /*Forzamos a true para que al cancelar se vea la imagen de inmediato, ya que
        al ser la misma URL que ya teníamos, el evento (load) podría no saltar*/
      this.fotoPerfilCargada = true;

      this.modoEdicion = false;
      this.cdr.detectChanges();

    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  navigateToHome() : void {
    this.router.navigate(['/home']);
  }

}