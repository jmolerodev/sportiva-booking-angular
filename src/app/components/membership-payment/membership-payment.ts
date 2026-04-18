import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription, switchMap, of } from 'rxjs';
import { NgxPayPalModule, IPayPalConfig, ICreateOrderRequest } from 'ngx-paypal';
import { AuthService } from '../../services/auth';
import { SportCentreService } from '../../services/sport-centre-service';
import { MembershipService } from '../../services/membershipservice';
import { SnackbarService } from '../../services/snackbar';
import { ISportCentre } from '../../interfaces/Sport-Centre-Interface';
import { IMembership } from '../../interfaces/Membresia-Interface';
import { TipoMembresia } from '../../enums/TipoMembresia';
import { EstadoMembresia } from '../../enums/EstadoMembresia';
import { Rol } from '../../enums/Rol';

/**
 * Configuración de precios en euros para cada tipo de membresía.
 * Centralizada aquí para facilitar actualizaciones futuras de tarifas.
 */
const PRECIOS: Record<TipoMembresia, number> = {
  [TipoMembresia.MENSUAL]: 29.99,
  [TipoMembresia.SEMESTRAL]: 149.99,
  [TipoMembresia.ANUAL]: 249.99
};

@Component({
  selector: 'app-membership-payment',
  standalone: true,
  imports: [CommonModule, NgxPayPalModule],
  templateUrl: './membership-payment.html',
  styleUrl: './membership-payment.css'
})
export class MembershipPayment implements OnInit, OnDestroy {

  /* Centro deportivo para el que se está contratando la membresía */
  public centro: ISportCentre | null = null;

  /* UID del cliente autenticado en sesión */
  public clienteUid: string | null = null;

  /* Tipo de membresía actualmente seleccionado por el cliente */
  public tipoSeleccionado: TipoMembresia | null = null;

  /* Configuración del botón de PayPal generada dinámicamente al seleccionar tipo */
  public paypalConfig: IPayPalConfig | null = null;

  /* Flag de control para el estado de carga global */
  public loading: boolean = true;

  /* Flag que indica que el pago se ha completado con éxito */
  public pagoCompletado: boolean = false;

  /* Flag que indica que el proceso de guardado en Firebase está en curso */
  public guardando: boolean = false;

  /* Enums expuestos al template para iteración y comparaciones */
  public readonly TipoMembresia = TipoMembresia;
  public readonly PRECIOS = PRECIOS;

  /* Opciones de membresía con etiqueta, tipo y descripción para la UI */
  public readonly opciones = [
    {
      tipo: TipoMembresia.MENSUAL,
      etiqueta: 'Mensual',
      descripcion: 'Acceso completo durante 1 mes',
      icono: 'bi-calendar-month'
    },
    {
      tipo: TipoMembresia.SEMESTRAL,
      etiqueta: 'Semestral',
      descripcion: 'Acceso completo durante 6 meses',
      icono: 'bi-calendar-range'
    },
    {
      tipo: TipoMembresia.ANUAL,
      etiqueta: 'Anual',
      descripcion: 'Acceso completo durante 12 meses',
      icono: 'bi-calendar-check'
    }
  ];

  /* UID del centro extraído de los parámetros de ruta */
  private centroId: string | null = null;

  /* Client ID de PayPal Sandbox para la inicialización del SDK */
  private readonly PAYPAL_CLIENT_ID = 'AWRw3Prgzs2OQxc-rhGZEcKeXUKt6H27e86SitjqKk03fWt12uMOV73Ev0GRGfC_uDo-E7bhoWWeu8v8';

  private subscription: Subscription = new Subscription();

  /**
   * Constructor del componente con inyección de dependencias
   * @param authService         Servicio encargado de la identidad y permisos del usuario
   * @param sportCentreService  Servicio para la gestión de centros deportivos
   * @param membershipService   Servicio para la gestión y persistencia de membresías
   * @param snackbarService     Servicio para el despliegue de alertas y confirmaciones
   * @param router              Servicio para gestionar la navegación entre vistas
   * @param route               Servicio para capturar parámetros de la URL activa
   * @param cdr                 Servicio para forzar la detección de cambios en el ciclo de Angular
   */
  constructor(
    private authService: AuthService,
    private sportCentreService: SportCentreService,
    private membershipService: MembershipService,
    private snackbarService: SnackbarService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) { }

  /**
   * Inicialización del componente: valida que el usuario es un cliente
   * autenticado y carga los datos del centro desde los parámetros de ruta
   */
  ngOnInit(): void {
    this.subscription.add(
      this.authService.getCurrentUser().pipe(
        switchMap(user => {
          if (!user) {
            this.router.navigate(['/home']);
            return of(null);
          }
          this.clienteUid = user.uid;
          return this.authService.getRol();
        })
      ).subscribe(rol => {
        if (rol === null || rol === undefined) return;

        if (rol !== Rol.CLIENTE) {
          this.router.navigate(['/home']);
          return;
        }

        /* Evitamos relanzar cargarCentro si ya se ejecutó */
        if (this.centro !== null || this.centroId !== null) return;

        this.centroId = this.route.snapshot.paramMap.get('centroId');
        if (!this.centroId) {
          this.router.navigate(['/home']);
          return;
        }

        this.cargarCentro();
      })
    );
  }

  /**
   * Carga los datos del centro a partir del centroId extraído de la ruta
   */
  private cargarCentro(): void {
    if (!this.centroId) return;

    this.subscription.add(
      this.sportCentreService.getSportCentreByUid(this.centroId).subscribe({
        next: centro => {
          this.centro = centro;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: e => {
          console.error('Error al cargar el centro:', e);
          this.loading = false;
        }
      })
    );
  }

  /**
   * Gestiona la selección del tipo de membresía y genera la configuración
   * del botón de PayPal con el importe correspondiente al tipo elegido.
   * Se fuerza un tick de 100ms para que ngx-paypal destruya el botón anterior
   * antes de renderizar el nuevo con el precio actualizado.
   * @param tipo Tipo de membresía seleccionado por el cliente
   */
  seleccionarTipo(tipo: TipoMembresia): void {
    this.tipoSeleccionado = tipo;
    this.paypalConfig = null;

    /* Forzamos un tick para que ngx-paypal destruya el botón anterior antes de crear el nuevo */
    setTimeout(() => {
      this.paypalConfig = this.buildPaypalConfig(tipo);
      this.cdr.detectChanges();
    }, 100);
  }

  /**
   * Construye el objeto de configuración para el botón de PayPal.
   * Se deshabilitan tarjeta, crédito y paylater via extraQueryParams para mostrar
   * exclusivamente el botón de PayPal como único método de pago disponible.
   * El flujo onApprove es el punto de integración con Firebase:
   * cuando PayPal confirma el pago, persiste la membresía en la base de datos.
   * @param tipo Tipo de membresía para el que configurar el pago
   * @returns Objeto IPayPalConfig listo para el componente ngx-paypal
   */
  private buildPaypalConfig(tipo: TipoMembresia): IPayPalConfig {
    const importe = PRECIOS[tipo].toFixed(2);

    return {
      currency: 'EUR',
      clientId: this.PAYPAL_CLIENT_ID,

      /* Deshabilitamos tarjeta, crédito y paylater via extraQueryParams para mostrar
 * exclusivamente el botón de PayPal como único método de pago disponible */
advanced: {
  extraQueryParams: [
    { name: 'disable-funding', value: 'card,credit,paylater' }
  ]
},

      /* Estilo del botón: layout vertical, color azul PayPal oficial, sin tagline */
      style: {
        layout: 'vertical',
        color: 'blue',
        shape: 'rect',
        label: 'paypal',
        tagline: false
      },

      createOrderOnClient: () => ({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'EUR',
            value: importe,
            breakdown: {
              item_total: { currency_code: 'EUR', value: importe }
            }
          },
          items: [{
            name: `Membresía ${tipo} - ${this.centro?.nombre ?? 'Centro Deportivo'}`,
            quantity: '1',
            category: 'DIGITAL_GOODS',
            unit_amount: { currency_code: 'EUR', value: importe }
          }]
        }]
      }) as ICreateOrderRequest,

      /* Pago aprobado: capturamos los datos y persistimos la membresía en Firebase */
      onApprove: (data: any, actions: any) => {
        return actions.order.capture().then((details: any) => {
          this.guardando = true;
          this.cdr.detectChanges();

          const fechaInicio = Date.now();
          const fechaFin = this.membershipService.calcularFechaFin(fechaInicio, tipo);

          const nuevaMembresia: IMembership = {
            clienteId: this.clienteUid!,
            centroId: this.centroId!,
            tipo,
            fechaInicio,
            fechaFin,
            estado: EstadoMembresia.ACTIVA,
            transactionId: details.id ?? data.orderID,
            importe: PRECIOS[tipo]
          };

          this.membershipService.saveMembresia(nuevaMembresia)
            .then(() => {
              this.pagoCompletado = true;
              this.guardando = false;
              this.snackbarService.showSuccess('¡Membresía activada correctamente!');
              this.cdr.detectChanges();
            })
            .catch(e => {
              console.error('Error al guardar la membresía:', e);
              this.guardando = false;
              this.snackbarService.showError('El pago se procesó pero hubo un error al activar la membresía. Contacta con soporte.');
              this.cdr.detectChanges();
            });
        });
      },

      /* Error en el proceso de pago */
      onError: err => {
        console.error('Error en el pago de PayPal:', err);
        this.snackbarService.showError('Ha ocurrido un error durante el proceso de pago');
        this.cdr.detectChanges();
      },

      /* Cliente cancela el pago en el modal de PayPal */
      onCancel: () => {
        this.snackbarService.showError('Has cancelado el proceso de pago');
        this.cdr.detectChanges();
      }
    };
  }

  /**
   * Redirige al cliente de vuelta al detalle del centro tras completar el pago
   */
  volverAlCentro(): void {
    this.router.navigate(['/centre-detail', this.centroId]);
  }

  /**
   * Redirige al cliente al detalle del centro si decide cancelar el proceso
   */
  cancelarYVolver(): void {
    this.router.navigate(['/centre-detail', this.centroId]);
  }

  /**
   * Resuelve la ruta de la imagen o devuelve la imagen por defecto si no existe
   * @param foto URL del recurso almacenado en Firebase Storage
   */
  getFoto(foto: string): string {
    return (foto && foto.trim() !== '') ? foto : 'centro-default.png';
  }

  /**
   * Limpieza de suscripciones al destruir el componente
   */
  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.centro = null;
  }
}