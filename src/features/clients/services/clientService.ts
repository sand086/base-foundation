import { DefaultService } from "@/api/generated";
import { Client } from "@/types/api.types";

export const clientService = {
  getClients: async (): Promise<Client[]> => {
    const data = await DefaultService.readClientsApiClientsGet();
    return data as Client[];
  },

  getClient: async (id: number): Promise<Client> => {
    const data = await DefaultService.readClientApiClientsClientIdGet(Number(id));
    return data as Client;
  },

  createClient: async (client: Partial<Client>): Promise<Client> => {
    const data = await DefaultService.createClientApiClientsPost(client as any);
    return data as Client;
  },

  updateClient: async (id: number, client: Partial<Client>): Promise<Client> => {
    const data = await DefaultService.updateClientApiClientsClientIdPut(Number(id), client as any);
    return data as Client;
  },

  deleteClient: async (id: number): Promise<void> => {
    await DefaultService.deleteClientApiClientsClientIdDelete(Number(id));
  },

  uploadDocument: async (clientId: number, docType: string, file: File) => {
    return await DefaultService.uploadClientDocumentApiClientsClientIdDocumentsDocTypePost(
      Number(clientId),
      docType,
      { file },
    );
  },

  getDocumentHistory: async (clientId: number, docType: string) => {
    return await DefaultService.getClientDocumentHistoryApiClientsClientIdDocumentsDocTypeHistoryGet(
      Number(clientId),
      docType,
    );
  },

  deleteDocument: async (documentId: number) => {
    return await DefaultService.deleteClientDocumentApiClientsDocumentsDocumentIdDelete(Number(documentId));
  },
};
