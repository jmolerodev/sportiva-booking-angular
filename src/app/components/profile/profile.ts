import { Component, OnInit, OnDestroy, ChangeDetectorRef, runInInjectionContext, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, switchMap, of, take, from } from 'rxjs';
import { AuthService } from '../../services/auth';
import { SnackbarService } from '../../services/snackbar';
import { ClienteService } from '../../services/cliente-service';
import { ProfesionalService } from '../../services/profesional-service';
import { AdminService } from '../../services/admin-service';
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

  /* Snapshot de los campos de texto al entrar en edición — permite restaurarlos si el usuario cancela */
  private nombreSnapshot: string = '';
  private apellidosSnapshot: string = '';
  private dniSnapshot: string = '';
  private direccionSnapshot: string = '';
  private descripcionSnapshot: string = '';
  private annosExperienciaSnapshot: number = 0;

  private subscription: Subscription = new Subscription();

  /* Getters para simplificar la plantilla y asegurar el tipado sin usar $any */
  get asCliente() { return this.perfil as ICliente; }
  get asProfesional() { return this.perfil as IProfesional; }
  get asAdmin() { return this.perfil as IAdministrador; }

  /* Constructor del componente */
  constructor(
    private authService: AuthService,
    private snackbarService: SnackbarService,
    private clienteService: ClienteService,
    private profesionalService: ProfesionalService,
    private adminService: AdminService,
    private storage: Storage,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private injector: Injector
  ) { }

  /**
   * Inicialización: Recuperamos usuario de Auth y luego sus datos tipados de RTDB una sola vez.
   * Usamos take(1) para que la suscripción se complete tras el primer valor y el componente
   * no sea reactivo mientras el usuario edita — equivalente al ValueEventListener del fragment.
   */
  ngOnInit(): void {
    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        take(1),
        switchMap(user => {
          if (!user) return of(null);
          this.uid = user.uid;
          this.emailUsuario = user.email;

          /* Usamos ClienteService como punto de entrada genérico — todos los perfiles
             comparten el mismo nodo /Persons/:uid independientemente del rol */
          return this.clienteService.getClienteByUid(user.uid).pipe(take(1));
        })
      ).subscribe({
        next: (data) => {
          if (data) {
            /* Casteamos al tipo correcto según el discriminante rol */
            this.perfil = data as unknown as ICliente | IProfesional | IAdministrador;

            /* Sincronizamos la preview y guardamos la URL original para gestionar borrados */
            if (data.foto) {
              this.previewImagen = data.foto;
              this.urlImagenOriginal = data.foto;
              /* Hay foto real que cargar — el spinner se activará hasta que el img dispare (load) */
            } else {
              /* Sin foto no hay nada que cargar — mostramos el icono por defecto directamente */
              this.fotoPerfilCargada = true;
            }
          } else {
            /* Sin perfil tampoco hay foto — evitamos el salto igualmente */
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

    /* Reseteamos el flag y forzamos la detección antes del FileReader para que el spinner
       aparezca inmediatamente mientras se procesa la nueva imagen */
    this.fotoPerfilCargada = false;
    this.cdr.detectChanges();

    /* Generamos la preview de la imagen seleccionada para mostrarla al instante */
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
    this.previewImagen = null;

    /* Limpiamos también el campo foto del perfil en memoria */
    if (this.perfil) this.perfil.foto = '';

    /* Sin foto activa no hay nada que cargar — evitamos el salto al mostrar el icono por defecto */
    this.fotoPerfilCargada = true;
  }

  /**
   * Sube la imagen nueva a Firebase Storage bajo la ruta Users/nombre-archivo,
   * elimina la anterior si existía y a continuación persiste los cambios en RTDB.
   * Se invoca desde guardarCambios() cuando hay una imagen pendiente de subir.
   */
  private subirFotoYGuardar(): void {
    if (!this.uid || !this.imagenSeleccionada) return;

    /* Forzamos el contexto de inyección para toda la cadena de promesas de Storage */
    runInInjectionContext(this.injector, () => {

      /* Si había una imagen anterior la eliminamos de Storage antes de subir la nueva */
      if (this.urlImagenOriginal) {
        deleteObject(storageRef(this.storage, this.urlImagenOriginal)).catch(() => { });
      }

      const fileRef = storageRef(this.storage, `Users/${Date.now()}_${this.imagenSeleccionada!.name}`);

      /* Usamos el then dentro del contexto para asegurar que getDownloadURL herede el permiso */
      uploadBytes(fileRef, this.imagenSeleccionada!)
        .then((snapshot) => {
          // Volvemos a asegurar el contexto aquí dentro por si Zone.js lo perdió en el salto
          return runInInjectionContext(this.injector, () => getDownloadURL(snapshot.ref));
        })
        .then(url => {
          /* Actualizamos la URL en el perfil en memoria y guardamos la referencia original */
          if (this.perfil) this.perfil.foto = url;
          this.urlImagenOriginal = url;
          this.imagenSeleccionada = null;
          this.fotoPerfilCargada = false;

          /* Con la URL ya disponible persistimos el resto de cambios en RTDB */
          this.persistirCambios();
        })
        .catch(() => {
          this.snackbarService.showError('Error al subir la imagen de perfil');
          this.loading = false;
        });
    });
  }

  /**
   * Mapea y persiste los cambios según el rol activo delegando en el servicio correspondiente.
   * Evita construir el objeto de update a mano y aprovecha los métodos tipados de cada servicio.
   */
  private persistirCambios(): void {
    if (!this.uid || !this.perfil) return;

    /* Campos comunes a todos los roles */
    const baseData = {
      nombre: this.perfil.nombre,
      apellidos: this.perfil.apellidos,
      foto: this.perfil.foto
    };

    let promesa: Promise<void>;

    if (this.perfil.rol === Rol.CLIENTE) {
      const p = this.asCliente;
      promesa = this.clienteService.updateCliente(this.uid, {
        ...baseData,
        dni: p.dni,
        direccion: p.direccion
      });
    } else if (this.perfil.rol === Rol.PROFESIONAL) {
      const p = this.asProfesional;
      promesa = this.profesionalService.updateProfesional(this.uid, {
        ...baseData,
        descripcion: p.descripcion,
        annos_experiencia: p.annos_experiencia
      });
    } else {
      /* ADMINISTRADOR — solo campos base */
      promesa = this.adminService.updateAdministrador(this.uid, baseData);
    }

    this.subscription.add(
      from(promesa).subscribe({
        next: () => {
          this.snackbarService.showSuccess('Información actualizada correctamente');
          this.modoEdicion = false;
          this.loading = false;
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
    runInInjectionContext(this.injector, () => {
      
      if (!this.uid || !this.perfil) return;

      this.loading = true;

      /* Si hay imagen nueva pendiente primero la subimos y después persistimos */
      if (this.imagenSeleccionada) {
        this.subirFotoYGuardar();
        return;
      }

      /* Si el usuario eliminó la foto la borramos de Storage antes de persistir */
      if (!this.previewImagen && this.urlImagenOriginal) {
        /* Aquí es donde solía saltar el warning al modificar/borrar la foto */
        deleteObject(storageRef(this.storage, this.urlImagenOriginal!)).catch(() => { });
        this.urlImagenOriginal = null;
      }

      /* Sin cambios de imagen persistimos directamente */
      this.persistirCambios();
      
    });
  }

  /**
   * Activa o desactiva el modo edición.
   * Al activarlo guarda un snapshot completo de todos los campos para poder restaurarlos
   * si el usuario cancela — equivalente al comportamiento del fragment de Android.
   * Al cancelar descarta todos los cambios visuales sin tocar Storage ni RTDB
   * e informa al usuario con un snackbar de aviso.
   */
  toggleEdicion(): void {
    if (!this.modoEdicion) {

      /* Entramos en modo edición — guardamos snapshot de todos los campos */
      this.previewSnapshot = this.previewImagen;
      this.nombreSnapshot = this.perfil?.nombre ?? '';
      this.apellidosSnapshot = this.perfil?.apellidos ?? '';
      this.dniSnapshot = this.asCliente?.dni ?? '';
      this.direccionSnapshot = this.asCliente?.direccion ?? '';
      this.descripcionSnapshot = this.asProfesional?.descripcion ?? '';
      this.annosExperienciaSnapshot = this.asProfesional?.annos_experiencia ?? 0;

      this.modoEdicion = true;

    } else {

      /* Cancelamos — restauramos todos los campos al estado del snapshot */
      this.imagenSeleccionada = null;
      this.previewImagen = this.previewSnapshot;

      if (this.perfil) {
        this.perfil.nombre = this.nombreSnapshot;
        this.perfil.apellidos = this.apellidosSnapshot;
        this.perfil.foto = this.previewSnapshot || '';
      }

      /* Restauramos los campos específicos de rol */
      if (this.perfil?.rol === Rol.CLIENTE) {
        this.asCliente.dni = this.dniSnapshot;
        this.asCliente.direccion = this.direccionSnapshot;
      } else if (this.perfil?.rol === Rol.PROFESIONAL) {
        this.asProfesional.descripcion = this.descripcionSnapshot;
        this.asProfesional.annos_experiencia = this.annosExperienciaSnapshot;
      }

      /* Forzamos a true para que al cancelar se vea la imagen de inmediato, ya que
         al ser la misma URL que ya teníamos, el evento (load) podría no saltar */
      this.fotoPerfilCargada = true;

      this.modoEdicion = false;

      /* Avisamos al usuario de que los cambios han sido descartados */
      this.snackbarService.showConfirm('Edición cancelada. No se han guardado cambios.', 'Cerrar', () => { });
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}