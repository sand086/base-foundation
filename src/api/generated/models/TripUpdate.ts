/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TripStatus } from './TripStatus';
import type { TripTimelineEventUpdate } from './TripTimelineEventUpdate';
export type TripUpdate = {
    client_id?: (number | null);
    sub_client_id?: (number | null);
    tariff_id?: (number | null);
    remolque_1_id?: (number | null);
    dolly_id?: (number | null);
    remolque_2_id?: (number | null);
    origin?: (string | null);
    destination?: (string | null);
    route_name?: (string | null);
    descripcion_mercancia?: (string | null);
    referencia?: (string | null);
    contenedor_1?: (string | null);
    contenedor_2?: (string | null);
    terminal_entrega_vacio?: (string | null);
    peso_toneladas?: (number | null);
    es_material_peligroso?: (boolean | null);
    clase_imo?: (string | null);
    sat_clave_producto?: (string | null);
    sat_clave_unidad?: (string | null);
    mercancia_clave_stcc?: (string | null);
    status?: (TripStatus | null);
    uuid_fiscal?: (string | null);
    tarifa_base?: (number | null);
    costo_casetas?: (number | null);
    start_date?: (string | null);
    closed_at?: (string | null);
    is_refrigerated_1?: (boolean | null);
    /**
     * ID del motogenerador 1
     */
    motogenerator_1_id?: (number | null);
    is_refrigerated_2?: (boolean | null);
    /**
     * ID del motogenerador 2
     */
    motogenerator_2?: (number | null);
    unit_id?: (number | null);
    operator_id?: (number | null);
    anticipo_casetas?: (number | null);
    anticipo_viaticos?: (number | null);
    anticipo_combustible?: (number | null);
    otros_anticipos?: (number | null);
    saldo_operador?: (number | null);
    last_location?: (string | null);
    timeline_events?: (Array<TripTimelineEventUpdate> | null);
};

