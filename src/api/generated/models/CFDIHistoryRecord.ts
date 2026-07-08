/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DocumentHistoryResponse } from './DocumentHistoryResponse';
/**
 * Esquema unificado para la tabla principal del Historial CFDI
 */
export type CFDIHistoryRecord = {
    id: number;
    tipo_documento: string;
    folio?: (string | null);
    folio_relacionado?: (string | null);
    uuid?: (string | null);
    fecha_emision?: (string | null);
    estatus: string;
    cliente_proveedor_nombre: string;
    cliente_proveedor_rfc?: (string | null);
    monto_total?: (number | null);
    creado_por_nombre?: (string | null);
    modificado_por_nombre?: (string | null);
    fecha_cancelacion?: (string | null);
    motivo_cancelacion?: (string | null);
    intentos_cancelacion?: (number | null);
    detalle_sat?: (string | null);
    factura_padre_id?: (number | null);
    factura_padre?: null;
    cartas_porte_hijas?: null;
    is_nominal?: (boolean | null);
    versiones_archivos?: Array<DocumentHistoryResponse>;
    viaje_id?: (number | null);
    pdf_url?: (string | null);
    xml_url?: (string | null);
};

