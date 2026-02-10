import { useCallback, useEffect, useState } from "react";

export type BankAccount = {
  id?: number | string;
  banco?: string;
  cuenta?: string;
  clabe?: string;
  beneficiario?: string;
  moneda?: string;
  estatus?: string;
};

type Result = {
  bankAccounts: BankAccount[];
  isLoading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
};

export function useBankAccounts(): Result {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: aquí conecta a tu API real
      // const res = await fetch("/api/finance/bank-accounts");
      // const data = await res.json();
      // setBankAccounts(data);

      setBankAccounts([]); // stub
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { bankAccounts, isLoading, error, refetch };
}
