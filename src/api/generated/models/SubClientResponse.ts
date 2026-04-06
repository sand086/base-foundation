/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OperationType } from './OperationType';
import type { TariffResponse } from './TariffResponse';
export type SubClientResponse = {
    nombre: string;
    alias?: (string | null);
    direccion: string;
    ciudad: string;
    estado: string;
    codigo_postal?: (string | null);
    tipo_operacion?: OperationType;
    contacto?: (string | null);
    telefono?: (string | null);
    horario_recepcion?: (string | null);
    estatus?: string;
    dias_credito?: (number | null);
    requiere_contrato?: boolean;
    convenio_especial?: boolean;
    contrato_url?: (string | null);
    id: number;
    client_id: number;
    tariffs?: Array<TariffResponse>;
};

