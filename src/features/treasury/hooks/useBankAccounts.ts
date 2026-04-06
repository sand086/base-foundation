import { useState, useEffect } from "react";
import axiosClient from "@/api/axiosClient";
import { BankAccount } from "@/features/treasury/types";

export function useBankAccounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = async () => {
    try {
      const { data } = await axiosClient.get<BankAccount[]>(
        "/finance/bank-accounts",
      );
      setAccounts(data);
    } catch (error) {
      console.error("Error al cargar cuentas bancarias", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  return { accounts, isLoading, refresh: fetchAccounts };
}
