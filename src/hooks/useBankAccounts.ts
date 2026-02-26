// src/hooks/useBankAccounts.ts
import { useState, useEffect } from "react";
import { toast } from "sonner";
// Importa tu cliente axios real si ya tienes el endpoint, o usa un mock temporal

export type BankAccount = {
  id: number;
  name: string;
  last_digits?: string;
  currency?: string;
};

export const useBankAccounts = () => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoadingBankAccounts, setIsLoadingBankAccounts] = useState(true);

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setIsLoadingBankAccounts(true);
        // TODO: Conectar a tu API real:
        // const response = await axiosClient.get("/finance/bank-accounts");
        // setBankAccounts(response.data);

        // Mock temporal para que funcione la UI
        setBankAccounts([
          {
            id: 1,
            name: "BBVA Principal",
            last_digits: "1234",
            currency: "MXN",
          },
          {
            id: 2,
            name: "Banamex Dólares",
            last_digits: "9876",
            currency: "USD",
          },
        ]);
      } catch (error) {
        toast.error("Error al cargar cuentas bancarias");
      } finally {
        setIsLoadingBankAccounts(false);
      }
    };

    fetchAccounts();
  }, []);

  return {
    bankAccounts,
    isLoadingBankAccounts,
  };
};
