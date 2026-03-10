import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {

  /* Lista de bloques de texto con icono que representan diferentes tipos de usuario (Administrador, Profesional, Cliente)
     Cada bloque tiene una propiedad 'visible' para controlar su aparición animada en la interfaz */
  steps = [
    { visible: false, icon: 'bi-gear-fill', text: 'Gestiona tu centro Deportivo: añade horarios, añade y elimina profesionales, ¡Y muchas más opciones!' },
    { visible: false, icon: 'bi-person-video2', text: 'Crea y gestiona tus sesiones de Entrenamiento o Fisioterapia como Profesional adscrito a un centro.' },
    { visible: false, icon: 'bi-calendar-check-fill', text: 'Reserva sesiones como Cliente en centros donde tengas membresía activa. Además, consulta la oferta de otros centros.' }
  ];

  /*Variable booleana con la que controlamos la visibilidad del encabezado (logo y título)*/
  showHeader: boolean = false;

  /*Variable booleana con la que controlamos la visibilidad del pie de página*/
  showFooter: boolean = false;


  ngOnInit(): void {
  setTimeout(() => {
    this.showHeader = true;
  }, 300);

  
  this.steps.forEach((step, i) => {
    setTimeout(() => {
      step.visible = true;
    }, 800 + i * 400);
  });

  setTimeout(() => {
    this.showFooter = true;
  }, 800 + this.steps.length * 400 + 400);
}

}
