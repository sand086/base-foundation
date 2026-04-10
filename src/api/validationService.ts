import axiosClient from "@/api/axiosClient";

export const validationService = {
  /**
   * Valida dinámicamente un campo contra la base de datos
   * @returns Un string con el error, o `null` si todo está perfecto.
   */
  checkField: async (
    table: string,
    field: string,
    value: string,
    excludeId?: number | string | null,
  ): Promise<string | null> => {
    try {
      const response = await axiosClient.get("/api/utils/validate-field", {
        params: {
          table,
          field,
          value,
          exclude_id: excludeId || undefined,
        },
      });

      // Retornamos el error del backend (o null si is_valid es true)
      return response.data.is_valid ? null : response.data.error;
    } catch (error: any) {
      console.error("Error en validación remota:", error);
      // Si el servidor falla, retornamos un mensaje de seguridad
      return "No se pudo verificar el campo en el servidor.";
    }
  },
};
