"use client";

import { useEffect, useState } from "react";

interface DashboardSummary {
  month: string;
  incomes: number;
  expenses: number;
  savings: number;
  freeBalance: number;
  data: {
    incomeCount: number;
    expenseCount: number;
  };
}

export function useDashboardSummary() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/summary", { cache: "no-store" });

      if (!res.ok) {
        throw new Error("Error al obtener resumen del dashboard");
      }

      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  return { summary, isLoading, error, refetch: fetchSummary };
}


