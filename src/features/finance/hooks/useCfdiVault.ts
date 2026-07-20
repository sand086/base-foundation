import { useQuery } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";

// ==========================================
// TYPES / INTERFACES
// ==========================================
export interface DocumentVersion {
  id: number;
  document_type: string;
  filename: string;
  file_url: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

export interface CFDIHistoryRecord {
  id: number;
  tipo_documento: string;
  folio: string | null;
  folio_interno?: string | null; // 💡 AGREGADO AQUÍ PARA SOLUCIONAR ts(2339) en la raíz
  uuid: string | null;
  fecha_emision: string | null;
  estatus: string;
  cliente_proveedor_nombre: string;
  cliente_proveedor_rfc?: string | null; // Guardado preventivo para mapeos locales
  viaje_id?: number | null;
  pdf_url?: string | null;
  xml_url?: string | null;
  monto_total: number | null;
  fecha_cancelacion: string | null;
  motivo_cancelacion: string | null;
  versiones_archivos: DocumentVersion[];

  //   PROPIEDADES INYECTADAS DINÁMICAMENTE PARA FILAS VIRTUALES HIJAS
  isVirtualChild?: boolean;
  parentFolio?: string | null;

  //   CAMPOS DE TRAZABILIDAD DEL SAT Y JERARQUÍAS DEL CORE BÓVEDA
  status_sat?: string | null;
  intentos_cancelacion?: number;
  detalle_sat?: string | null;
  factura_padre_id?: number | null;
  factura_padre?: {
    id: number;
    folio: string | null;
    folio_interno?: string | null;
    monto_total?: number;
  } | null;
  cartas_porte_hijas?:
    | {
        id: number;
        folio: string | null;
        folio_interno?: string | null;
        status_sat?: string;
        estatus?: string;
        uuid?: string | null;
        fecha_emision?: string | null;
        monto_total?: number | null;
        versiones_archivos?: DocumentVersion[];
        viaje_id?: number | null;
        pdf_url?: string | null;
        xml_url?: string | null;
      }[]
    | null;
  is_nominal?: boolean;
}

export interface CFDIActivityTimeline {
  fecha: string;
  accion: string;
  tipo_accion: string;
  usuario: string;
  detalles: string | null;
}

export interface CFDIHistoryResponse {
  data: CFDIHistoryRecord[];
  total_records: number;
}

// ==========================================
// HOOK PRINCIPAL: Obtener la tabla
// ==========================================
export const useCfdiVault = (
  tipoDocumento: string,
  startDate?: string,
  endDate?: string,
) => {
  const vaultQuery = useQuery({
    queryKey: ["cfdi-vault", tipoDocumento, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams({ tipo_documento: tipoDocumento });
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      // Consumimos el endpoint unificado del módulo de finanzas
      const { data } = await axiosClient.get<CFDIHistoryResponse>(
        `/api/finance/cfdi-vault?${params.toString()}`,
      );
      return data;
    },
    // Solo se ejecuta si hay un tipo de documento seleccionado
    enabled: !!tipoDocumento,
    refetchOnWindowFocus: false,
  });

  return {
    records: vaultQuery.data?.data || [],
    totalRecords: vaultQuery.data?.total_records || 0,
    isLoading: vaultQuery.isLoading,
    isError: vaultQuery.isError,
    refetch: vaultQuery.refetch,
  };
};

// ==========================================
// HOOK SECUNDARIO: Línea de tiempo (Drawer)
// ==========================================
export const useCfdiTimeline = (
  tipoDocumento: string,
  documentId: number | null,
) => {
  const timelineQuery = useQuery({
    queryKey: ["cfdi-timeline", tipoDocumento, documentId],
    queryFn: async () => {
      const { data } = await axiosClient.get<CFDIActivityTimeline[]>(
        `/api/finance/cfdi-vault/${tipoDocumento}/${documentId}/timeline`,
      );
      return data;
    },
    // Solo dispara la petición a la BD cuando el usuario abre el Drawer desde la tabla
    enabled: !!documentId && !!tipoDocumento,
  });

  return {
    timeline: timelineQuery.data || [],
    isLoading: timelineQuery.isLoading,
  };
};
