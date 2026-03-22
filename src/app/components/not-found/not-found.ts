import { Component } from '@angular/core';
import { Router } from '@angular/router';
 
@Component({
  selector: 'app-not-found',
  standalone: true,
  templateUrl: './not-found.html',
  styleUrl: './not-found.css',
})
export class NotFound {
 
  /*Constructor del componente*/
  constructor(private router: Router) {}
 
  /**
   * Método mediante el cual navegaremos de vuelta a la pantalla de Login
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }
 
}
 