import axiosClient from "@/api/axiosClient";

export const FinanceExportService = {
  /**
   * Exporta el Estado de Cuenta detallado de un Cliente en formato Excel.
   */
  exportClientStatementExcel: async (
    clientId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<Blob> => {
    const response = await axiosClient.get(
      `/api/finance/export/statement/client/${clientId}`,
      {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
        // ESTO ES LA MAGIA: Le dice a Axios que no intente parsear JSON, sino un archivo
        responseType: "blob",
      },
    );
    return response.data;
  },

  /**
   * Exporta el Estado de Cuenta detallado de un Proveedor.
   */
  exportSupplierStatementExcel: async (
    supplierId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<Blob> => {
    const response = await axiosClient.get(
      `/api/finance/export/statement/supplier/${supplierId}`,
      {
        params: {
          start_date: startDate,
          end_date: endDate,
        },
        responseType: "blob",
      },
    );
    return response.data;
  },
};
