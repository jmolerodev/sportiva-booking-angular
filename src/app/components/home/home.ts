import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { switchMap, of } from 'rxjs';
import { SportCentreService } from '../../services/sport-centre-service';
import { AuthService } from '../../services/auth';
import { Sport_Centre } from '../../models/Sport_Centre';
import { Rol } from '../../enums/Rol';

@Component({
  selector: 'app-home',
  imports: [CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit, OnDestroy {

  /*Lista de centros deportivos disponibles*/
  centros: Sport_Centre[] = [];

  /*Centro deportivo del administrador autenticado (null si no tiene o no es admin)*/
  centroAdmin: Sport_Centre | null = null;

  /*UID del administrador autenticado — público para usarlo en el template*/
  adminUid: string | null = null;

  /*Variable booleana que indica si el usuario autenticado es administrador*/
  esAdministrador: boolean = false;

  /*Imagen por defecto en caso de que el centro no tenga foto*/
  readonly imagenPorDefecto = 'centro-default.png';

  
  loading: boolean = true;
  loadingCentros: boolean = true;
  loadingUsuario: boolean = true;

  /*Suscripciones para limpiarlas al destruir el componente*/
  private subscription: Subscription = new Subscription();

  /*Constructor del componente*/
  constructor(
    private sportCentreService: SportCentreService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {

    /*Obtenemos todos los centros deportivos disponibles*/
    this.subscription.add(
      this.sportCentreService.getAllSportCentres().subscribe({
        next: (centros) => {
          this.centros = centros ?? [];
          this.loadingCentros = false;
          this.checkLoading();
        },
        error: (e) => {
          console.error('Error al obtener los centros deportivos:', e);
          this.loadingCentros = false;
          this.checkLoading();
        }
      })
    );

    /*Comprobamos el rol del usuario y si es admin buscamos su centro*/
    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        switchMap(user => {
          if (!user) {
            this.loadingUsuario = false;
            this.checkLoading();
            return of({ rol: null, uid: null });
          }
          this.adminUid = user.uid;
          return this.authService.getRol().pipe(
            switchMap(rol => of({ rol, uid: user.uid }))
          );
        })
      ).subscribe(({ rol, uid }) => {
        this.esAdministrador = rol == Rol.ADMINISTRADOR;

        if (this.esAdministrador && uid) {
          /*Buscamos el centro deportivo del administrador autenticado*/
          this.subscription.add(
            this.sportCentreService.getSportCentreByAdminUid(uid).subscribe({
              next: (centro) => {
                this.centroAdmin = centro;
                this.loadingUsuario = false;
                this.checkLoading();
              },
              error: (e) => {
                console.error('Error al obtener el centro del administrador:', e);
                this.loadingUsuario = false;
                this.checkLoading();
              }
            })
          );
        } else {
          this.loadingUsuario = false;
          this.checkLoading();
        }
      })
    );

  }

  
  private checkLoading(): void {
    if (!this.loadingCentros && !this.loadingUsuario) {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Método que devuelve la foto del centro deportivo o la imagen por defecto si no tiene
   * @param foto URL de la foto del centro deportivo
   * @returns URL de la foto o imagen por defecto
   */
  getFoto(foto: string): string {
    return foto ? foto : this.imagenPorDefecto;
  }

  /**
   * Método mediante el cual navegaremos al componente de creación de centro deportivo
   */
  navigateToAddSportCentre(): void {
    this.router.navigate(['/add-sport-centre']);
  }

  /**
   * Método mediante el cual navegaremos al componente de edición del centro deportivo
   */
  navigateToEditSportCentre(): void {
    this.router.navigate(['/add-sport-centre'], { queryParams: { editar: true } });
  }

  /**
   * Método mediante el cual eliminaremos el centro deportivo del administrador.
   * Usamos el adminUid como clave del nodo en RTDB.
   */
  deleteSportCentre(): void {
    if (!this.adminUid) return;
    this.sportCentreService.deleteSportCentre(this.adminUid).then(() => {
      console.log('Centro deportivo eliminado correctamente');
      this.centroAdmin = null;
    }).catch((e) => {
      console.error('Error al eliminar el centro deportivo:', e);
    });
  }

}