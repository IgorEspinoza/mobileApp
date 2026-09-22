"use client";

import { useState } from "react";
import type { SharedExpense } from "@/types/database";

export function useSharedExpenses() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSharedExpenses = async (
    homeId: string,
    params?: { from?: string; to?: string }
  ): Promise<SharedExpense[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      if (params?.from) searchParams.set("from", params.from);
      if (params?.to) searchParams.set("to", params.to);
      const qs = searchParams.toString();
      const res = await fetch(`/api/homes/${homeId}/shared-expenses${qs ? `?${qs}` : ""}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al obtener gastos compartidos");
      }
      const data = await res.json();
      return data.expenses;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createSharedExpense = async (
    homeId: string,
    data: {
      date: string;
      merchant: string;
      amount: number;
      category: string;
      split_type: "50/50" | "percentage" | "fixed";
      splits: Record<string, number>;
      description?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/homes/${homeId}/shared-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al crear gasto compartido");
      }
      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateSharedExpense = async (
    homeId: string,
    expenseId: string,
    data: {
      date: string;
      merchant: string;
      amount: number;
      category: string;
      split_type: "50/50" | "percentage" | "fixed";
      splits: Record<string, number>;
      description?: string;
    }
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/homes/${homeId}/shared-expenses/${expenseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al actualizar gasto compartido");
      }
      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSharedExpense = async (homeId: string, expenseId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/homes/${homeId}/shared-expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al eliminar gasto compartido");
      }
      return await res.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    getSharedExpenses,
    createSharedExpense,
    updateSharedExpense,
    deleteSharedExpense,
    isLoading,
    error,
    setError,
  };
}
