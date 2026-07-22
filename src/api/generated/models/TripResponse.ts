/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClientResponse } from './ClientResponse';
import type { ReceivableInvoiceLite } from './ReceivableInvoiceLite';
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
    tipo_operacion?: (string | null);
    booking_referencia?: (string | null);
    pedimento?: (string | null);
    remolque_1_id?: (number | null);
    dolly_id?: (number | null);
    remolque_2_id?: (number | null);
    origin: string;
    destination: string;
    route_name?: (string | null);
    descripcion_mercancia?: (string | null);
    peso_toneladas?: (number | null);
    /**
     * Clave SAT Servicio de Flete
     */
    sat_clave_servicio?: (string | null);
    /**
     * Clave SAT de la Mercancía Transportada
     */
    sat_clave_producto?: (string | null);
    /**
     * Clave SAT Unidad de Servicio
     */
    sat_clave_unidad?: (string | null);
    es_material_peligroso?: (boolean | null);
    cve_material_peligroso?: (string | null);
    embalaje?: (string | null);
    clase_imo?: (string | null);
    mercancia_clave_stcc?: (string | null);
    is_refrigerated_1?: (boolean | null);
    motogenerator_1_id?: (number | null);
    is_refrigerated_2?: (boolean | null);
    motogenerator_2_id?: (number | null);
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
    motogenerator_1_unit?: (UnitResponse | null);
    motogenerator_2_unit?: (UnitResponse | null);
    legs?: Array<TripLegResponse>;
    receivable_invoices?: Array<ReceivableInvoiceLite>;
    record_status: RecordStatus;
    created_at?: (string | null);
    updated_at?: (string | null);
};

