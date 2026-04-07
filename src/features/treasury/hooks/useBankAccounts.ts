import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FinanceService } from "@/api/generated";
import { ApiError } from "@/api/generated/core/ApiError";
import { BankAccount } from "@/features/treasury/types";
import { toast } from "sonner";
import axiosClient from "@/api/axiosClient";

export function useBankAccounts() {
  const queryClient = useQueryClient();

  const {
    data: bankAccounts = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: async () => {
      const data =
        await FinanceService.readBankAccountsApiFinanceBankAccountsGet();
      return data as BankAccount[];
    },
    staleTime: 1000 * 60 * 10,
  });

  const API_PATH = "/api/finance/bank-accounts";

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

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await axiosClient.delete(`api${API_PATH}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Cuenta eliminada");
    },
    onError: (error: any) => {
      const msg =
        error instanceof ApiError
          ? error.body?.detail
          : error.response?.data?.detail;
      toast.error(msg || "No se pudo eliminar la cuenta");
    },
  });

  return {
    bankAccounts,
    isLoading,
    isError,
    refresh: refetch,

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
