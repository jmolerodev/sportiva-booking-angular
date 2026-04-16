import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription, combineLatest } from 'rxjs';
import { AuthService } from '../../services/auth';
import { Rol } from '../../enums/Rol';
import { SnackbarService } from '../../services/snackbar';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {

  /*Variable que almacena el rol del usuario autenticado (null si no hay sesión)*/
  private rol: Rol | null = null;

  /*Variable booleana que indica si hay sesión iniciada*/
  haySession: boolean = false;

  /*Variable para controlar si el menú desplegable está visible*/
  menuAbierto: boolean = false;

  isReady: boolean = false;

  /*Suscripción principal para limpiarla al destruir el componente y evitar memory leaks*/
  private subscription: Subscription = new Subscription();

  /*Constructor del componente*/
  constructor(
    private authService: AuthService,
    private router: Router,
    private snackbar: SnackbarService
  ) { }

  ngOnInit(): void {

    this.subscription.add(
      combineLatest([
        this.authService.getCurrentUser(),
        this.authService.getRol()
      ]).subscribe(([user, rol]) => {
        this.haySession = !!user;
        this.rol = rol;
        /*Marcamos listo SOLO cuando todo está resuelto*/
        this.isReady = true;
      })
    );

  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  get esCliente(): boolean {
    return this.rol == Rol.CLIENTE;
  }

  get esProfesional(): boolean {
    return this.rol == Rol.PROFESIONAL;
  }

  get esAdministrador(): boolean {
    return this.rol == Rol.ADMINISTRADOR;
  }

  /*Getter para identificar al superusuario Root*/
  get esRoot(): boolean {
    return this.rol == Rol.ROOT;
  }

  /*Alterna el estado del menú*/
  toggleMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  navigateToLogin(): void {
    this.menuAbierto = false;
    this.router.navigate(['/login']);
  }

  navigateToHome() : void {
    this.menuAbierto = false;
    this.router.navigate(['/home']);
  }

  navigateToSignUp(): void {
    this.menuAbierto = false;
    this.router.navigate(['/signup']);
  }

  navigateToAddProfesional() : void {
    this.menuAbierto = false;
    this.router.navigate(['/add-profesional-to-center']);
  }

  navigateToProfile() : void {
    this.menuAbierto = false;
    this.router.navigate(['/profile']);
  }

  navigateToManagement() : void {
    this.menuAbierto = false;
    this.router.navigate(['/management-clients'])
  }

  
  navigateToAdminAndProManagement() : void {
    this.menuAbierto = false;
    this.router.navigate(['/user-management']);
  }

  navigateToAdminList() : void {
    this.menuAbierto = false;
    this.router.navigate(['/admin-list'])
  }

  navigateToProfesionalList() : void {
    this.menuAbierto = false;
    this.router.navigate(['/profesional-list']);
  }

  navigateToProfesionalSessions() : void {
    this.menuAbierto = false;
    this.router.navigate(['profesional-sessions']);
  }

  navigateToProfesionalMedia() : void {
    this.menuAbierto = false;
    this.router.navigate(['/profesional-media']);
  }


  logout(): void {
    this.menuAbierto = false;
    this.authService.logout().subscribe({
      next: () => {
        this.snackbar.showSuccess("Sesión Cerrada Con Éxito. Vuelve Pronto...");
        this.router.navigate(['/login']); 
      },
      error: (e) => {
        console.error("Error al cerrar sesión:", e);
      }
    });
  }

}