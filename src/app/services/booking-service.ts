import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { child, Database, listVal, push, ref, remove, update } from '@angular/fire/database';
import { map, Observable, of }                                  from 'rxjs';
import { catchError }                                           from 'rxjs/operators';
import { IBooking } from '../interfaces/Reserva-Interface';
import { EstadoReserva } from '../enums/EstadoReserva';

@Injectable({ providedIn: 'root' })
export class BookingService {

  /* Nombre del nodo principal de reservas en Firebase RTDB */
  private COLLECTION_NAME = 'Bookings';

  private database = inject(Database);
  private injector = inject(Injector);

  /**
   * Obtiene en tiempo real todas las reservas de un cliente concreto,
   * independientemente de su estado o centro.
   * @param clienteId UID del cliente autenticado
   * @returns Observable con la lista completa de reservas del cliente
   */
  getReservasByCliente(clienteId: string): Observable<IBooking[]> {
    return runInInjectionContext(this.injector, () =>
      listVal<IBooking>(ref(this.database, `/${this.COLLECTION_NAME}`), { keyField: 'uid' })
    ).pipe(
      map(reservas => (reservas ?? []).filter(r => r.clienteId === clienteId)),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene todas las reservas CONFIRMADAS vinculadas a una sesión concreta.
   * Se usa para verificar el aforo actual antes de permitir una nueva reserva
   * y para comprobar si el cliente ya tiene plaza en esa sesión.
   * @param sesionId UID de la sesión a consultar
   * @returns Observable con la lista de reservas confirmadas de la sesión
   */
  getReservasBySesion(sesionId: string): Observable<IBooking[]> {
    return runInInjectionContext(this.injector, () =>
      listVal<IBooking>(ref(this.database, `/${this.COLLECTION_NAME}`), { keyField: 'uid' })
    ).pipe(
      map(reservas => (reservas ?? []).filter(
        r => r.sesionId === sesionId && r.estado === EstadoReserva.CONFIRMADA
      )),
      catchError(() => of([]))
    );
  }

  /**
   * Persiste una nueva reserva en Firebase incluyendo un snapshot con los datos
   * clave de la sesión para garantizar la integridad del historial aunque la sesión
   * sea eliminada posteriormente. Actualiza de forma atómica el aforoActual.
   * Antes de invocar este método deben haberse verificado externamente:
   *   — Membresía activa del cliente con el centro
   *   — Ausencia de reserva previa CONFIRMADA del cliente en la misma sesión
   *   — Sesión sin aforo completo (aforoActual < aforoMax)
   * @param reserva    Objeto IBooking completo listo para persistir
   * @param aforoNuevo Valor incrementado del aforoActual de la sesión
   * @returns Promesa que se resuelve cuando ambas escrituras quedan persistidas
   */
  async crearReserva(reserva: IBooking, aforoNuevo: number): Promise<void> {
    const newRef = push(ref(this.database, `/${this.COLLECTION_NAME}`));

    /* Escritura atómica: nueva reserva + aforoActual de la sesión incrementado */
    const updates: Record<string, any> = {};
    updates[`/${this.COLLECTION_NAME}/${newRef.key}`]    = reserva;
    updates[`/Sessions/${reserva.sesionId}/aforoActual`] = aforoNuevo;

    return update(ref(this.database), updates);
  }

  /**
   * Cancela una reserva confirmada marcándola como CANCELADA y decrementa
   * de forma atómica el aforoActual de la sesión para liberar la plaza.
   * @param bookingUid UID de la reserva a cancelar
   * @param sesionId   UID de la sesión vinculada para actualizar el aforo
   * @param aforoNuevo Valor decrementado del aforoActual de la sesión
   * @returns Promesa que se resuelve cuando ambas escrituras quedan persistidas
   */
  async cancelarReserva(bookingUid: string, sesionId: string, aforoNuevo: number): Promise<void> {
    const updates: Record<string, any> = {};
    updates[`/${this.COLLECTION_NAME}/${bookingUid}/estado`] = EstadoReserva.CANCELADA;
    updates[`/Sessions/${sesionId}/aforoActual`]             = aforoNuevo;

    return update(ref(this.database), updates);
  }

  /**
   * Elimina permanentemente el nodo de una reserva cancelada de Firebase.
   * Solo debe invocarse sobre reservas en estado CANCELADA para evitar
   * pérdidas accidentales de reservas activas o pendientes.
   * @param bookingUid UID de la reserva a eliminar
   * @returns Promesa que se resuelve cuando el nodo queda borrado
   */
  async eliminarReserva(bookingUid: string): Promise<void> {
    return remove(child(ref(this.database), `/${this.COLLECTION_NAME}/${bookingUid}`));
  }
}