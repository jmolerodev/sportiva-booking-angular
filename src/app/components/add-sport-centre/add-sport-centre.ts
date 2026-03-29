import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage'; // 👈 añadido
import { AuthService } from '../../services/auth';
import { SportCentreService } from '../../services/sport-centre-service';
import { ISportCentre } from '../../interfaces/Sport-Centre-Interface';

@Component({
  selector: 'app-add-sport-centre',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-sport-centre.html',
  styleUrl: './add-sport-centre.css',
})
export class AddSportCentre implements OnInit {

  /*Formulario reactivo para crear o editar un centro deportivo*/
  centroForm: FormGroup;

  /*Variable booleana que nos indica si el formulario se está procesando*/
  isLoading: boolean = false;

  /*Variable booleana que indica si estamos en modo edición o creación*/
  modoEdicion: boolean = false;

  /*UID del administrador autenticado*/
  private adminUid: string | null = null;

  /*Archivo de imagen seleccionado por el usuario (null si no ha seleccionado ninguno)*/
  private imagenSeleccionada: File | null = null;

  /*Preview de la imagen seleccionada para mostrarla antes de guardar*/
  previewImagen: string | null = null;

  /*Constructor del componente*/
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

  ngOnInit(): void {

    /*Comprobamos si venimos en modo edición mediante el queryParam*/
    this.modoEdicion = this.route.snapshot.queryParams['editar'] === 'true';

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
              /*Si tiene foto la mostramos como preview*/
              if (centro.foto) {
                this.previewImagen = centro.foto;
              }
            }
          },
          error: (e) => {
            console.error('Error al cargar los datos del centro para edición:', e);
          }
        });
      }
    });

  }

  /**
   * Método que gestiona la selección de una imagen desde el dispositivo del usuario.
   * Genera una preview para mostrarla en el formulario antes de guardar.
   * @param event Evento del input de tipo file
   */
  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.imagenSeleccionada = input.files[0];

    /*Generamos la preview de la imagen seleccionada*/
    const reader = new FileReader();
    reader.onload = () => {
      this.previewImagen = reader.result as string;
    };
    reader.readAsDataURL(this.imagenSeleccionada);
  }

  /**
   * Método que elimina la imagen seleccionada y limpia la preview
   */
  eliminarImagen(): void {

    /*Si hay una imagen ya subida (URL), la eliminamos también de Storage*/
    if (this.previewImagen && this.previewImagen.startsWith('http')) {
      const storageRef = ref(this.storage, this.previewImagen);

      deleteObject(storageRef).then(() => {
        console.log('Imagen eliminada de Storage');
      }).catch((error) => {
        if (error.code !== 'storage/object-not-found') {
          console.error('Error al eliminar la imagen de Storage:', error);
        }
      });
    }

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

      /*Subimos la imagen a Firebase Storage bajo la ruta Sports-Center/adminUid*/
      const storageRef = ref(this.storage, `Sports-Center/${this.adminUid}`);

      uploadBytes(storageRef, this.imagenSeleccionada).then(snapshot => {
        getDownloadURL(snapshot.ref).then(url => {
          this.guardarCentro(nombre, direccion, telefono, url);
        }).catch(e => {
          console.error('Error al obtener la URL de la imagen:', e);
          this.isLoading = false;
        });
      }).catch(e => {
        console.error('Error al subir la imagen a Storage:', e);
        this.isLoading = false;
      });

    } else {

      /*Sin imagen nueva — mantenemos la preview existente o guardamos vacío*/
      const foto = this.previewImagen && !this.previewImagen.startsWith('data:') 
        ? this.previewImagen 
        : '';
      this.guardarCentro(nombre, direccion, telefono, foto);

    }

  }

  /**
   * Método privado que construye el objeto ISportCentre y lo guarda en RTDB
   * @param nombre Nombre del centro deportivo
   * @param direccion Dirección del centro deportivo
   * @param telefono Teléfono del centro deportivo
   * @param foto URL de la foto del centro deportivo
   */
  private guardarCentro(nombre: string, direccion: string, telefono: string, foto: string): void {

    const centro: ISportCentre = {
      nombre,
      direccion,
      telefono,
      foto,
      adminUid: this.adminUid!,
    };

    this.sportCentreService.saveSportCentre(this.adminUid!, centro).then(() => {
      console.log(this.modoEdicion ? 'Centro actualizado correctamente:' : 'Centro creado correctamente:', centro);
      this.isLoading = false;
      this.router.navigate(['/home']);
    }).catch(e => {
      console.error('Error al guardar el centro deportivo:', e);
      this.isLoading = false;
    });

  }

  /**
   * Método mediante el cual navegaremos de vuelta al home
   */
  navigateToHome(): void {
    this.router.navigate(['/home']);
  }

}