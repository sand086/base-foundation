/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { OperationType } from './OperationType';
import type { TariffUpdate } from './TariffUpdate';
export type SubClientUpdate = {
    id?: (number | null);
    nombre?: (string | null);
    alias?: (string | null);
    direccion?: (string | null);
    ciudad?: (string | null);
    estado?: (string | null);
    codigo_postal?: (string | null);
    tipo_operacion?: (OperationType | null);
    contacto?: (string | null);
    telefono?: (string | null);
    horario_recepcion?: (string | null);
    estatus?: (string | null);
    dias_credito?: (number | null);
    requiere_contrato?: (boolean | null);
    convenio_especial?: (boolean | null);
    contrato_url?: (string | null);
    tariffs?: (Array<TariffUpdate> | null);
};

