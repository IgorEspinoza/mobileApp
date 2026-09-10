"use client";

import { useState, useCallback } from "react";

export interface FixedExpense {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  frequency: "monthly" | "weekly";
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

  const fetchFixedExpenses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/fixed-expenses");
      if (!res.ok) throw new Error("Error al cargar gastos fijos");
      const data = await res.json();
      setFixedExpenses(data.fixed_expenses ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createFixedExpense = async (data: {
    category: string;
    amount: number;
    frequency: "monthly" | "weekly";
    start_date: string;
    end_date?: string;
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
      frequency: "monthly" | "weekly";
      start_date: string;
      end_date?: string;
      description?: string;
      is_active?: boolean;
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

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    const fe = fixedExpenses.find((f) => f.id === id);
    if (!fe) return;
    await updateFixedExpense(id, {
      category: fe.category,
      amount: fe.amount,
      frequency: fe.frequency,
      start_date: fe.start_date,
      end_date: fe.end_date ?? undefined,
      description: fe.description ?? undefined,
      is_active: !currentlyActive,
    });
  };

  return {
    fixedExpenses,
    isLoading,
    error,
    setError,
    fetchFixedExpenses,
    createFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    toggleActive,
  };
}

