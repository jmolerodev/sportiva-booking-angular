import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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

  /*Suscripción principal para limpiarla al destruir el componente y evitar memory leaks*/
  private subscription: Subscription = new Subscription();

  /*Constructor del componente*/
  constructor(
    private authService: AuthService,
    private router: Router,
    private snackbar : SnackbarService
  ) {}

  ngOnInit(): void {

    /*Escuchamos el estado de la sesión en tiempo real*/
    this.subscription.add(
      this.authService.getCurrentUser().subscribe(user => {
        this.haySession = !!user;
      })
    );

    /*Escuchamos el rol del usuario en tiempo real*/
    this.subscription.add(
      this.authService.getRol().subscribe(rol => {
        this.rol = rol;
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

 
  /**
   * Método mediante el cual navegaremos al Login
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Método mediante el cual navegaremos al Registro
   */
  navigateToSignUp(): void {
    this.router.navigate(['/signup']);
  }

  /**
   * Método mediante el cual cerraremos la sesión del usuario
   */
  logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        this.snackbar.showSuccess("Sesión Cerrada Con Éxito. Vuelve Pronto...");
      },
      error: (e) => {
        console.error('Error al cerrar sesión:', e);
      }
    });
  }

}