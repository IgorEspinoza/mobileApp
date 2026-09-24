"use client";

import { useState, useCallback } from "react";

export interface FixedExpense {
  id: string;
  user_id: string;
  home_id?: string | null;
  category: string;
  amount: number;
  frequency: "monthly" | "weekly";
  month?: string | null;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
  description?: string | null;
  created_at: string;
}

export function useFixedExpenses() {
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFixedExpenses = useCallback(async (month?: string, homeId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      if (homeId) params.set("home_id", homeId);
      const qs = params.toString();
      const res = await fetch(`/api/fixed-expenses${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Error al cargar gastos fijos");
      const data = await res.json();
      setFixedExpenses(data.fixed_expenses ?? []);
      return data.fixed_expenses ?? [];
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createFixedExpense = async (data: {
    category: string;
    amount: number;
    month: string;
    home_id?: string;
    description?: string;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fixed-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al crear gasto fijo");
      }
      const created = await res.json();
      setFixedExpenses((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateFixedExpense = async (
    id: string,
    data: {
      category: string;
      amount: number;
      month?: string;
      description?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fixed-expenses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al actualizar gasto fijo");
      }
      const updated = await res.json();
      setFixedExpenses((prev) =>
        prev.map((fe) => (fe.id === id ? updated : fe))
      );
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFixedExpense = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/fixed-expenses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Error al eliminar gasto fijo");
      }
      setFixedExpenses((prev) => prev.filter((fe) => fe.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Get total fixed expenses for a given month
  const getMonthlyTotal = useCallback(() => {
    return fixedExpenses.reduce((sum, fe) => sum + (fe.amount || 0), 0);
  }, [fixedExpenses]);

  return {
    fixedExpenses,
    isLoading,
    error,
    setError,
    fetchFixedExpenses,
    createFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    getMonthlyTotal,
  };
}
