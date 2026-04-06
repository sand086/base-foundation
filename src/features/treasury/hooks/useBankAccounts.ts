import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosClient from "@/api/axiosClient";
import { BankAccount } from "@/features/treasury/types";
import { toast } from "sonner";

export function useBankAccounts() {
  const queryClient = useQueryClient();
  const API_PATH = "/finance/bank-accounts";

  // ==========================================
  // 1. LECTURA (GET)
  // ==========================================
  const {
    data: bankAccounts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const { data } = await axiosClient.get<BankAccount[]>(API_PATH);
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutos de caché (las cuentas no cambian seguido)
  });

  // ==========================================
  // 2. CREACIÓN (POST)
  // ==========================================
  const createMutation = useMutation({
    mutationFn: async (newAccount: Partial<BankAccount>) => {
      const { data } = await axiosClient.post<BankAccount>(
        API_PATH,
        newAccount,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta bancaria creada correctamente");
    },
    onError: () => toast.error("Error al crear la cuenta"),
  });

  // ==========================================
  // 3. ACTUALIZACIÓN (PATCH)
  // ==========================================
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      ...changes
    }: Partial<BankAccount> & { id: number }) => {
      const { data } = await axiosClient.patch<BankAccount>(
        `${API_PATH}/${id}`,
        changes,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta actualizada");
    },
    onError: () => toast.error("No se pudo actualizar la cuenta"),
  });

  // ==========================================
  // 4. ELIMINACIÓN (DELETE)
  // ==========================================
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`${API_PATH}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta eliminada");
    },
    onError: (error: any) => {
      const msg =
        error.response?.data?.detail || "No se pudo eliminar la cuenta";
      toast.error(msg);
    },
  });

  // ==========================================
  // 5. WRAPPERS PARA LA UI
  // ==========================================
  return {
    // Datos y estados
    bankAccounts,
    isLoading,
    isError,
    refresh: refetch,

    // Acciones CRUD
    createAccount: async (data: Partial<BankAccount>) => {
      try {
        return await createMutation.mutateAsync(data);
      } catch {
        return null;
      }
    },

    updateAccount: async (id: number, data: Partial<BankAccount>) => {
      try {
        return await updateMutation.mutateAsync({ id, ...data });
      } catch {
        return null;
      }
    },

    deleteAccount: async (id: number) => {
      try {
        await deleteMutation.mutateAsync(id);
        return true;
      } catch {
        return false;
      }
    },
  };
}
