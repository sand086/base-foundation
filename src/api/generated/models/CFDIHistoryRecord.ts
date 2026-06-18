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
    uuid?: (string | null);
    fecha_emision?: (string | null);
    estatus: string;
    cliente_proveedor_nombre: string;
    monto_total?: (number | null);
    creado_por_nombre?: (string | null);
    modificado_por_nombre?: (string | null);
    fecha_cancelacion?: (string | null);
    motivo_cancelacion?: (string | null);
    versiones_archivos?: Array<DocumentHistoryResponse>;
    viaje_id?: (number | null);
    pdf_url?: (string | null);
    xml_url?: (string | null);
};

