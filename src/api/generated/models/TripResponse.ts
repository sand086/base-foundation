/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClientResponse } from './ClientResponse';
import type { RecordStatus } from './RecordStatus';
import type { TariffBasicInfo } from './TariffBasicInfo';
import type { TripLegResponse } from './TripLegResponse';
import type { TripStatus } from './TripStatus';
import type { UnitResponse } from './UnitResponse';
export type TripResponse = {
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
    status?: TripStatus;
    tarifa_base: number;
    costo_casetas?: number;
    fecha_programada?: (string | null);
    start_date: string;
    closed_at?: (string | null);
    id: number;
    public_id?: (string | null);
    uuid_fiscal?: (string | null);
    client?: (ClientResponse | null);
    tariff?: (TariffBasicInfo | null);
    remolque_1?: (UnitResponse | null);
    dolly?: (UnitResponse | null);
    remolque_2?: (UnitResponse | null);
    legs?: Array<TripLegResponse>;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
};

