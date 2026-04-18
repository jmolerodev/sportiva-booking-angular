import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { Database, listVal, push, ref} from '@angular/fire/database';
import { map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IMembership } from '../interfaces/Membresia-Interface';
import { EstadoMembresia } from '../enums/EstadoMembresia';

@Injectable({ providedIn: 'root' })
export class MembershipService {

  /* Nombre de la colección principal en la base de datos */
  private COLLECTION_NAME = 'Memberships';

  private database = inject(Database);
  private injector = inject(Injector);

  /**
   * Verifica si un cliente tiene una membresía activa y vigente en un centro concreto.
   * Comprueba tanto el estado ACTIVA como que la fecha de fin no haya expirado.
   * @param clienteId UID del cliente autenticado
   * @param centroId  UID del centro deportivo a verificar
   * @returns Observable con la membresía activa o null si no la tiene
   */
  getMembresiaActivaByClienteYCentro(clienteId: string, centroId: string): Observable<IMembership | null> {
    return runInInjectionContext(this.injector, () =>
      listVal<IMembership>(ref(this.database, `/${this.COLLECTION_NAME}`), { keyField: 'uid' })
    ).pipe(
      map(membresias => {
        const ahora = Date.now();
        return (membresias ?? []).find(m =>
          m.clienteId === clienteId &&
          m.centroId  === centroId  &&
          m.estado    === EstadoMembresia.ACTIVA &&
          m.fechaFin  >  ahora
        ) ?? null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Persiste una nueva membresía en Firebase tras la confirmación del pago por PayPal.
   * Calcula automáticamente la fechaFin a partir del tipo de membresía seleccionado.
   * @param membresia Objeto IMembership completo listo para persistir
   * @returns Promesa que se resuelve al finalizar la escritura
   */
  saveMembresia(membresia: IMembership): Promise<void> {
    const collectionRef = ref(this.database, `/${this.COLLECTION_NAME}`);
    const newNodeRef    = push(collectionRef);
    return import('@angular/fire/database').then(({ set }) =>
      set(newNodeRef, membresia)
    );
  }

  /**
   * Calcula la fecha de fin de la membresía en milisegundos epoch
   * a partir de la fecha de inicio y el tipo de membresía contratado.
   * @param fechaInicio Timestamp epoch de inicio de la membresía
   * @param tipo        Tipo de membresía: MENSUAL, SEMESTRAL o ANUAL
   * @returns Timestamp epoch de la fecha de finalización
   */
  calcularFechaFin(fechaInicio: number, tipo: string): number {
    const fecha = new Date(fechaInicio);
    if (tipo === 'MENSUAL')   fecha.setMonth(fecha.getMonth() + 1);
    if (tipo === 'SEMESTRAL') fecha.setMonth(fecha.getMonth() + 6);
    if (tipo === 'ANUAL')     fecha.setFullYear(fecha.getFullYear() + 1);
    return fecha.getTime();
  }

  /**
   * Obtiene todas las membresías de un cliente concreto para mostrar su historial.
   * @param clienteId UID del cliente autenticado
   * @returns Observable con el listado completo de membresías del cliente
   */
  getMembresiasByCliente(clienteId: string): Observable<IMembership[]> {
    return runInInjectionContext(this.injector, () =>
      listVal<IMembership>(ref(this.database, `/${this.COLLECTION_NAME}`), { keyField: 'uid' })
    ).pipe(
      map(membresias => (membresias ?? []).filter(m => m.clienteId === clienteId)),
      catchError(() => of([]))
    );
  }
}