import { MaintenanceService } from "@/api/generated";
import { Mechanic, MechanicDocument } from "../types";

export const mechanicService = {
  getAll: async () => {
    const data = await MaintenanceService.readMechanicsApiMaintenanceMechanicsGet();
    return data as Mechanic[];
  },

  getById: async (id: number) => {
    // No single-get endpoint; fetch all and find
    const all = await MaintenanceService.readMechanicsApiMaintenanceMechanicsGet();
    return (all as Mechanic[]).find((m) => m.id === id) || null;
  },

  create: async (mechanic: Partial<Mechanic>) => {
    const data = await MaintenanceService.createMechanicApiMaintenanceMechanicsPost(mechanic as any);
    return data as Mechanic;
  },

  update: async (id: number, mechanic: Partial<Mechanic>) => {
    const data = await MaintenanceService.updateMechanicApiMaintenanceMechanicsMechanicIdPut(Number(id), mechanic as any);
    return data as Mechanic;
  },

  delete: async (id: number) => {
    await MaintenanceService.deleteMechanicDocumentApiMaintenanceMechanicsDocumentsDocumentIdDelete(Number(id));
  },

  // --- DOCUMENTOS (Expediente) ---
  getDocuments: async (id: number) => {
    const data = await MaintenanceService.getMechanicDocumentsApiMaintenanceMechanicsMechanicIdDocumentsGet(Number(id));
    return data as MechanicDocument[];
  },

  uploadDocument: async (id: number, docType: string, file: File) => {
    const data = await MaintenanceService.uploadMechanicDocumentApiMaintenanceMechanicsMechanicIdDocumentsDocTypePost(
      Number(id),
      docType,
      { file },
    );
    return data;
  },

  deleteDocument: async (docId: number) => {
    await MaintenanceService.deleteMechanicDocumentApiMaintenanceMechanicsDocumentsDocumentIdDelete(Number(docId));
  },
};
