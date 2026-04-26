import { inject, Injectable, Injector, runInInjectionContext } from '@angular/core';
import { child, Database, listVal, ref, remove, push, update, query, orderByChild, equalTo } from '@angular/fire/database';
import { map, Observable, from, of } from 'rxjs';
import { catchError, switchMap }     from 'rxjs/operators';
import { ISession } from '../interfaces/Sesion-Interface';
import { EstadoSesion } from '../enums/EstadoSesion';
import { BookingService } from './booking-service';

@Injectable({ providedIn: 'root' })
export class SessionService {

  private COLLECTION_NAME = 'Sessions';
  private database        = inject(Database);
  private injector        = inject(Injector);
  private bookingService  = inject(BookingService);

  /**
   * Obtiene todas las sesiones de un centro en una fecha concreta (timestamp epoch del día).
   * Filtra por centroId, rango de fechas y estado ACTIVA.
   * @param centroId    UID del centro deportivo
   * @param fechaInicio Timestamp epoch del inicio del día (00:00:00)
   * @param fechaFin    Timestamp epoch del fin del día (23:59:59)
   * @returns Observable con la lista de sesiones activas del centro en esa fecha
   */
  getSessionsByCentroAndFecha(centroId: string, fechaInicio: number, fechaFin: number): Observable<ISession[]> {
    return runInInjectionContext(this.injector, () =>
      listVal<ISession>(ref(this.database, `/${this.COLLECTION_NAME}`), { keyField: 'uid' })
    ).pipe(
      map(sesiones => (sesiones ?? []).filter(s =>
        s.centroId === centroId &&
        s.fecha    >= fechaInicio &&
        s.fecha    <= fechaFin    &&
        s.estado   === EstadoSesion.ACTIVA
      )),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene todas las sesiones creadas por un profesional concreto.
   * @param profesionalUid UID del profesional propietario de las sesiones
   * @returns Observable con el listado completo de sesiones del profesional
   */
  getSessionsByProfesional(profesionalUid: string): Observable<ISession[]> {
    return runInInjectionContext(this.injector, () => {
      const sessionsRef = ref(this.database, `/${this.COLLECTION_NAME}`);
      const proQuery    = query(sessionsRef, orderByChild('profesionalId'), equalTo(profesionalUid));
      return listVal<ISession>(proQuery, { keyField: 'uid' }).pipe(
        map(sesiones  => sesiones ?? []),
        catchError(() => of([]))
      );
    });
  }

  /**
   * Obtiene la lista completa de sesiones sin filtros adicionales.
   * Se usa como cache reactiva en componentes que necesitan enriquecer reservas
   * con datos de sesión. Mantener el listener activo garantiza que los cambios
   * de aforoActual se propaguen a la vista en tiempo real.
   * @returns Observable con todas las sesiones existentes en Firebase
   */
  getAllSessions(): Observable<(ISession & { uid: string })[]> {
    return runInInjectionContext(this.injector, () =>
      listVal<ISession>(ref(this.database, `/${this.COLLECTION_NAME}`), { keyField: 'uid' })
    ).pipe(
      map(sesiones  => (sesiones ?? []) as (ISession & { uid: string })[]),
      catchError(() => of([]))
    );
  }

  /**
   * Persiste una nueva sesión en Firebase generando un ID automático con push().
   * @param sesion Objeto sesión completo listo para persistir
   * @returns Observable que se completa al finalizar la escritura
   */
  createSession(sesion: ISession): Observable<void> {
    const sessionsRef = ref(this.database, `/${this.COLLECTION_NAME}`);
    return from(push(sessionsRef, sesion)).pipe(
      map(()        => void 0),
      catchError(() => of(void 0))
    );
  }

  /**
   * Actualización parcial de una sesión existente.
   * @param uid  Clave del nodo de la sesión en Firebase
   * @param data Campos a actualizar
   * @returns Promesa que se resuelve al completar la escritura
   */
  updateSession(uid: string, data: Partial<ISession>): Promise<void> {
    const sessionRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return update(sessionRef, data);
  }

  /**
   * Cancelación lógica de una sesión: actualiza el estado a CANCELADA y cancela
   * en cascada todas las reservas CONFIRMADAS asociadas a ella de forma atómica.
   * El listener reactivo del cliente propagará el cambio de estado de cada reserva
   * a la vista sin necesidad de ninguna acción adicional en el componente cliente.
   * @param uid Clave del nodo de la sesión en Firebase
   * @returns Promesa que se resuelve al completar todas las escrituras
   */
  async cancelSession(uid: string): Promise<void> {
    const sessionRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);

    /* Cancelamos primero todas las reservas CONFIRMADAS de esta sesión en cascada */
    await this.bookingService.cancelarReservasBySesion(uid);

    /* A continuación marcamos la sesión como CANCELADA */
    return update(sessionRef, { estado: EstadoSesion.CANCELADA });
  }

  /**
   * Eliminación física del nodo de sesión en Firebase junto con todas las
   * reservas asociadas a ella. Primero elimina las Bookings vinculadas al
   * sesionId para no dejar nodos huérfanos y a continuación borra la sesión.
   * @param uid Clave del nodo de la sesión en Firebase
   * @returns Observable que se completa al finalizar ambos borrados
   */
  deleteSession(uid: string): Observable<void> {
    const sessionRef = child(ref(this.database), `/${this.COLLECTION_NAME}/${uid}`);
    return from(this.bookingService.eliminarReservasBySesion(uid)).pipe(
      switchMap(() => from(remove(sessionRef))),
      catchError(() => of(void 0))
    );
  }
}