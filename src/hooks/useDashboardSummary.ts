"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  const fetchSummary = useCallback(async () => {
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
  }, []);

  // Refetch on mount and when navigating back to this page
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, pathname]);

  // Refetch when the window regains focus (e.g. user was on another tab/page)
  useEffect(() => {
    const handleFocus = () => {
      fetchSummary();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchSummary]);

  return { summary, isLoading, error, refetch: fetchSummary };
}
