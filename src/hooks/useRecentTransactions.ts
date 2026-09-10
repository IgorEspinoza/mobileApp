"use client";

import { useEffect, useState } from "react";

export interface Transaction {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  type: "income" | "expense";
  description?: string;
}

export function useRecentTransactions(limit: number = 5, trigger: number = 0) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`/api/transactions/recent?limit=${limit}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Error al obtener transacciones");
      }

      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [limit, trigger]);

  return { transactions, isLoading, error, refetch: fetchTransactions };
}


