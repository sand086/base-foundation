import { FleetFuelService } from "@/api/generated";

export const fuelService = {
  getAll: async () => {
    const data = await FleetFuelService.getFuelLogsApiFleetFuelLogsGet();
    return data;
  },

  create: async (formData: any) => {
    // The generated service handles multipart/form-data
    const data = await FleetFuelService.createFuelLogApiFleetFuelLogsPost(formData);
    return data;
  },

  update: async (id: number | string, payload: any) => {
    const data = await FleetFuelService.updateFuelLogApiFleetFuelLogsLogIdPut(Number(id), payload);
    return data;
  },

  uploadDocument: async (logId: number, docType: string, file: File) => {
    const data = await FleetFuelService.uploadFuelDocumentApiFleetFuelLogsLogIdDocumentsDocTypePost(
      Number(logId),
      docType,
      { file },
    );
    return data;
  },

  delete: async (id: string | number) => {
    const data = await FleetFuelService.deleteFuelLogApiFleetFuelLogsLogIdDelete(Number(id));
    return data;
  },
};
