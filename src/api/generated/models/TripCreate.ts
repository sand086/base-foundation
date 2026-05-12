/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TripLegCreate } from './TripLegCreate';
import type { TripStatus } from './TripStatus';
/**
 * Cuando se crea un viaje, obligatoriamente se debe crear su primer tramo (Fase 1).
 * El Frontend enviará 'initial_leg' con el camión y chofer asignados.
 */
export type TripCreate = {
    client_id: number;
    sub_client_id: number;
    tariff_id?: (number | null);
    referencia?: (string | null);
    contenedor_1?: (string | null);
    contenedor_2?: (string | null);
    remolque_1_id?: (number | null);
    dolly_id?: (number | null);
    remolque_2_id?: (number | null);
    origin: string;
    destination: string;
    route_name?: (string | null);
    descripcion_mercancia?: (string | null);
    peso_toneladas?: (number | null);
    es_material_peligroso?: (boolean | null);
    clase_imo?: (string | null);
    /**
     * Clave SAT para Fletes
     */
    sat_clave_producto?: (string | null);
    /**
     * Clave SAT Unidad de Servicio
     */
    sat_clave_unidad?: (string | null);
    mercancia_clave_stcc?: (string | null);
    /**
     * ¿Remolque 1 es refrigerado?
     */
    is_refrigerated_1?: (boolean | null);
    /**
     * ID del motogenerador 1
     */
    motogenerator_1_id?: (number | null);
    /**
     * ¿Remolque 2 es refrigerado?
     */
    is_refrigerated_2?: (boolean | null);
    /**
     * ID del motogenerador 2
     */
    motogenerator_2_id?: (number | null);
    status?: TripStatus;
    tarifa_base: number;
    costo_casetas?: number;
    fecha_programada?: (string | null);
    start_date: string;
    closed_at?: (string | null);
    initial_leg?: (TripLegCreate | null);
    final_leg?: (TripLegCreate | null);
    conoce_ruta_completa?: (boolean | null);
    ocultar_montos_pdf?: (boolean | null);
    is_dummy_stamping?: (boolean | null);
};

